const db = require('../../../config/db');
const { ok, created, badRequest, notFound } = require('../../../utils/response');
const paymentService = require('../../../services/payment/payment.service');
const whatsapp = require('../../../services/whatsapp/whatsapp.service');
const otpService = require('../../../services/otp/otp.service');
const walletService = require('../../../services/wallet/wallet.service');
const { getDeliveryEstimateSettings, formatEstimateText } = require('../../../utils/delivery');
const { parseQuantity, MAX_QTY } = require('../cart/cart.controller');

const generateOrderNumber = () => `VLR${Date.now().toString().slice(-8)}`;

const PAYMENT_METHODS = ['cod', 'online', 'upi', 'card'];
const ONLINE_METHODS = ['online', 'upi', 'card'];
const round2 = (n) => Math.round(Number(n) * 100) / 100;
// A stored offer_price of 0 / "0.00" is "no offer", never "free".
const unitPrice = (offer, price) => (Number(offer) > 0 ? Number(offer) : Number(price) || 0);

const getReturnAbuseSettings = async (queryable) => {
  const { rows } = await queryable.query(
    "SELECT key, value FROM settings WHERE key IN ('return_abuse_threshold','return_abuse_block_cod','return_abuse_block_return')"
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    threshold: Math.max(0, parseInt(map.return_abuse_threshold, 10) || 0),
    blockCod: map.return_abuse_block_cod === 'true',
    blockReturn: map.return_abuse_block_return === 'true',
  };
};

const getReturnedOrderCount = async (queryable, userId) => {
  const { rows } = await queryable.query(
    "SELECT COUNT(*)::integer AS count FROM orders WHERE user_id=$1 AND status='returned'",
    [userId]
  );
  return rows[0].count;
};

const getReturnRestrictions = async (req, res) => {
  const abuse = await getReturnAbuseSettings(db);
  const returnedCount = await getReturnedOrderCount(db, req.user.id);
  const overThreshold = abuse.threshold > 0 && returnedCount >= abuse.threshold;
  ok(res, {
    returned_count: returnedCount,
    threshold: abuse.threshold,
    cod_blocked: abuse.blockCod && overThreshold,
    return_blocked: abuse.blockReturn && overThreshold,
  });
};

const getLoyaltyEarnSettings = async (queryable) => {
  const { rows } = await queryable.query(
    "SELECT key, value FROM settings WHERE key IN ('loyalty_program_enabled','loyalty_earn_points','loyalty_spend_amount')"
  );
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    enabled: cfg.loyalty_program_enabled !== 'false',
    earnPts: parseInt(cfg.loyalty_earn_points || '20', 10),
    spendAmt: parseFloat(cfg.loyalty_spend_amount || '500'),
  };
};

const earnLoyaltyPoints = async (client, phone, name, total) => {
  if (!phone || total <= 0) return 0;
  const { enabled, earnPts, spendAmt } = await getLoyaltyEarnSettings(client);
  if (!enabled || spendAmt <= 0 || earnPts <= 0) return 0;

  const pointsEarned = Math.floor(total / spendAmt) * earnPts;
  if (!pointsEarned) return 0;

  await client.query(
    `INSERT INTO loyalty_cards (phone, name, points, total_spent)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (phone) DO UPDATE SET
       points      = loyalty_cards.points + $3,
       total_spent = loyalty_cards.total_spent + $4,
       name        = COALESCE(EXCLUDED.name, loyalty_cards.name),
       updated_at  = now()`,
    [phone, name, pointsEarned, total]
  );
  return pointsEarned;
};

// Shipping is computed server-side from the same settings the checkout page displays,
// so the amount charged always matches what the customer saw.
const computeShipping = async (client, userId, amountAfterDiscounts) => {
  const { rows } = await client.query(
    "SELECT key, value FROM settings WHERE key IN ('delivery_charge','free_delivery_threshold')"
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const charge = Math.max(0, parseFloat(map.delivery_charge ?? '50') || 0);
  const threshold = Math.max(0, parseFloat(map.free_delivery_threshold ?? '500') || 0);

  if (charge === 0 || amountAfterDiscounts >= threshold) return { shipping: 0, freeShipReward: null };

  // An unredeemed "free shipping" spin/scratch reward waives the charge once.
  const { rows: spinRows } = await client.query(
    `SELECT id FROM spin_wheel_logs WHERE user_id=$1 AND prize_type='free_shipping' AND is_redeemed=false
     ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
    [userId]
  );
  if (spinRows.length) return { shipping: 0, freeShipReward: { table: 'spin_wheel_logs', id: spinRows[0].id } };

  const { rows: scratchRows } = await client.query(
    `SELECT id FROM scratch_card_logs WHERE user_id=$1 AND prize_type='free_shipping' AND is_redeemed=false
     ORDER BY scratched_at ASC LIMIT 1 FOR UPDATE`,
    [userId]
  );
  if (scratchRows.length) return { shipping: 0, freeShipReward: { table: 'scratch_card_logs', id: scratchRows[0].id } };

  return { shipping: charge, freeShipReward: null };
};

// Turns the customer's combo cart rows into ordinary line items. Validates that every
// slot has a selection, that the chosen product belongs to the slot and the variant to
// the product, and prices each line as its share of the combo price.
const expandComboCartRows = async (client, userId) => {
  const { rows: comboRows } = await client.query(
    `SELECT c.id AS cart_id, c.quantity, c.combo_selections, cb.id AS combo_id, cb.name AS combo_name,
            cb.price AS combo_price, cb.offer_price AS combo_offer_price, cb.stock AS combo_stock, cb.is_active
     FROM cart c JOIN combos cb ON cb.id = c.combo_id
     WHERE c.user_id=$1 AND c.combo_id IS NOT NULL
     FOR UPDATE OF cb`,
    [userId]
  );
  const items = [];
  for (const row of comboRows) {
    if (!row.is_active) return { error: `${row.combo_name} is no longer available. Please remove it from your cart.` };
    const qty = parseQuantity(row.quantity, null);
    if (qty === null) return { error: `Invalid quantity for ${row.combo_name}` };
    if (row.combo_stock != null && row.combo_stock < qty) return { error: `Insufficient stock for ${row.combo_name}` };

    let selections = row.combo_selections;
    if (typeof selections === 'string') { try { selections = JSON.parse(selections); } catch { selections = []; } }
    if (!Array.isArray(selections)) selections = [];

    const { rows: slots } = await client.query(
      'SELECT id, slot_label, requires_selection FROM combo_slots WHERE combo_id=$1 ORDER BY sort_order', [row.combo_id]
    );
    if (!slots.length) return { error: `${row.combo_name} is not configured correctly. Please remove it from your cart.` };

    const lines = [];
    for (const slot of slots) {
      let sel = selections.find((x) => x.slot_id === slot.id);
      if (!sel) {
        // Slots that need no choice fall back to their only product.
        const { rows: only } = await client.query(
          'SELECT product_id FROM combo_slot_products WHERE slot_id=$1 ORDER BY sort_order LIMIT 2', [slot.id]
        );
        if (only.length === 1 && !slot.requires_selection) sel = { slot_id: slot.id, product_id: only[0].product_id };
        else return { error: `Please choose an item for "${slot.slot_label}" in ${row.combo_name}` };
      }
      const { rows: prod } = await client.query(
        `SELECT p.id AS product_id, p.name, p.price, p.offer_price, p.stock, p.is_hidden
         FROM combo_slot_products csp JOIN products p ON p.id = csp.product_id
         WHERE csp.slot_id=$1 AND csp.product_id=$2`,
        [slot.id, sel.product_id]
      );
      if (!prod.length || prod[0].is_hidden) return { error: `An item in ${row.combo_name} is no longer available` };
      let variant = {};
      if (sel.variant_id) {
        const { rows: v } = await client.query(
          'SELECT id AS variant_id, size, color, stock AS variant_stock FROM product_variants WHERE id=$1 AND product_id=$2',
          [sel.variant_id, sel.product_id]
        );
        if (!v.length) return { error: `Invalid size/colour selection in ${row.combo_name}` };
        variant = v[0];
      }
      lines.push({
        quantity: qty, product_id: prod[0].product_id,
        name: `${row.combo_name} · ${slot.slot_label}: ${prod[0].name}`,
        base_price: unitPrice(prod[0].offer_price, prod[0].price),
        stock: prod[0].stock, variant_id: variant.variant_id || null,
        size: variant.size || null, color: variant.color || null, variant_stock: variant.variant_stock ?? null,
        combo_id: row.combo_id, combo_name: row.combo_name,
      });
    }

    // Split the bundle price across its lines in proportion to their normal prices.
    const bundlePrice = round2(unitPrice(row.combo_offer_price, row.combo_price));
    const baseTotal = lines.reduce((s, l) => s + l.base_price, 0);
    let allocated = 0;
    lines.forEach((l, i) => {
      let share = baseTotal > 0 ? round2((bundlePrice * l.base_price) / baseTotal) : round2(bundlePrice / lines.length);
      if (i === lines.length - 1) share = round2(bundlePrice - allocated);
      allocated = round2(allocated + share);
      l.price = share; l.offer_price = null; l.combo_first = i === 0;
    });
    items.push(...lines);
  }
  return { items };
};


const placeOrder = async (req, res) => {
  const { address_id, coupon_code, payment_method, buy_now_item, use_loyalty_points, use_wallet } = req.body;
  const method = String(payment_method || '').toLowerCase().trim();
  if (!PAYMENT_METHODS.includes(method)) {
    return badRequest(res, 'Invalid payment method');
  }
  if (!address_id) return badRequest(res, 'Delivery address is required');

  const client = await db.getClient();
  // Every early exit must roll the transaction back, otherwise the pooled connection is
  // returned to the pool with an open transaction and poisons whoever borrows it next.
  const fail = async (message) => {
    await client.query('ROLLBACK');
    return badRequest(res, message);
  };

  try {
    await client.query('BEGIN');

    // The address must belong to the buyer (it is joined into the order details later).
    const { rows: addrRows } = await client.query(
      'SELECT id FROM addresses WHERE id=$1 AND user_id=$2', [address_id, req.user.id]
    );
    if (!addrRows.length) return fail('Delivery address not found');

    if (method === 'cod') {
      const { rows: codSetting } = await client.query("SELECT value FROM settings WHERE key='cod_enabled'");
      if (codSetting.length && codSetting[0].value === 'false') {
        return fail('Cash on Delivery is currently unavailable. Please choose an online payment method.');
      }

      const { rows: userRows } = await client.query('SELECT is_cod_blocked FROM users WHERE id=$1', [req.user.id]);
      if (userRows.length && userRows[0].is_cod_blocked) {
        return fail('Cash on Delivery is unavailable for your account. Please choose an online payment method.');
      }

      const abuse = await getReturnAbuseSettings(client);
      if (abuse.blockCod && abuse.threshold > 0) {
        const returnedCount = await getReturnedOrderCount(client, req.user.id);
        if (returnedCount >= abuse.threshold) {
          return fail(`Cash on Delivery is unavailable on your account due to a history of returns (${returnedCount} returned orders). Please pay online.`);
        }
      }
    }

    let cartItems;

    if (buy_now_item) {
      const { product_id, variant_id } = buy_now_item;
      const quantity = parseQuantity(buy_now_item.quantity);
      if (quantity === null) return fail(`Quantity must be a whole number between 1 and ${MAX_QTY}`);
      if (!product_id) return fail('Product not found');

      const { rows: prods } = await client.query(
        'SELECT id AS product_id, name, price, offer_price, stock FROM products WHERE id=$1 AND is_hidden=false',
        [product_id]
      );
      if (!prods.length) return fail('Product not found');
      const p = prods[0];
      let variantData = {};
      if (variant_id) {
        // The variant must belong to this product, otherwise the price of one product
        // could be paired with the stock/size of another.
        const { rows: vars } = await client.query(
          'SELECT id AS variant_id, size, color, stock AS variant_stock FROM product_variants WHERE id=$1 AND product_id=$2',
          [variant_id, product_id]
        );
        if (!vars.length) return fail('Invalid variant for this product');
        variantData = vars[0];
      }
      cartItems = [{ quantity, product_id: p.product_id, name: p.name, price: p.price,
        offer_price: p.offer_price, stock: p.stock, variant_id: variantData.variant_id || null,
        size: variantData.size || null, color: variantData.color || null,
        variant_stock: variantData.variant_stock || null }];
    } else {
      const { rows } = await client.query(
        `SELECT c.quantity, p.id AS product_id, p.name, p.price, p.offer_price, p.stock, p.is_hidden,
                c.variant_id, pv.size, pv.color, pv.stock AS variant_stock
         FROM cart c
         JOIN products p ON c.product_id=p.id
         LEFT JOIN product_variants pv ON c.variant_id=pv.id
         WHERE c.user_id=$1 AND c.combo_id IS NULL`,
        [req.user.id]
      );
      const hidden = rows.find((r) => r.is_hidden);
      if (hidden) return fail(`${hidden.name} is no longer available. Please remove it from your cart.`);
      for (const r of rows) {
        if (parseQuantity(r.quantity, null) === null) return fail(`Invalid quantity for ${r.name}`);
      }

      // Combo bundles: each cart row expands into one line per selected product, with the
      // combo price split proportionally across them (so per-item refunds still add up).
      const comboExpansion = await expandComboCartRows(client, req.user.id);
      if (comboExpansion.error) return fail(comboExpansion.error);

      cartItems = [...rows, ...comboExpansion.items];
      if (!cartItems.length) return fail('Cart is empty');
    }

    const { rows: userInfoRows } = await client.query(
      'SELECT phone, name, date_of_birth, date_of_birth_set_at FROM users WHERE id=$1', [req.user.id]
    );
    const userInfo = userInfoRows[0] || {};
    const userPhone = (userInfo.phone || '').replace(/\D/g, '');
    const userName = userInfo.name || '';

    let subtotal = 0;
    for (const item of cartItems) {
      let availableStock;
      if (item.variant_id) {
        const { rows: sv } = await client.query(
          'SELECT stock FROM product_variants WHERE id=$1 FOR UPDATE',
          [item.variant_id]
        );
        availableStock = sv[0]?.stock ?? 0;
      } else {
        const { rows: sp } = await client.query(
          'SELECT stock FROM products WHERE id=$1 FOR UPDATE',
          [item.product_id]
        );
        availableStock = sp[0]?.stock ?? 0;
      }
      if (item.quantity > availableStock) {
        return fail(`Insufficient stock for ${item.name}`);
      }
      const unit = unitPrice(item.offer_price, item.price);
      if (!(unit >= 0)) return fail(`Invalid price for ${item.name}`);
      subtotal += unit * item.quantity;
    }
    // The same product/variant may appear twice (cart + inside a combo): check the summed quantity too.
    const demand = new Map();
    for (const item of cartItems) {
      const key = item.variant_id ? `v:${item.variant_id}` : `p:${item.product_id}`;
      demand.set(key, (demand.get(key) || 0) + item.quantity);
    }
    for (const [key, qty] of demand) {
      const [kind, id] = key.split(':');
      const { rows: st } = await client.query(
        kind === 'v' ? 'SELECT stock FROM product_variants WHERE id=$1' : 'SELECT stock FROM products WHERE id=$1', [id]
      );
      if ((st[0]?.stock ?? 0) < qty) {
        const name = cartItems.find((i) => (kind === 'v' ? i.variant_id === id : i.product_id === id))?.name || 'an item';
        return fail(`Insufficient stock for ${name}`);
      }
    }
    subtotal = round2(subtotal);
    if (!(subtotal > 0)) return fail('Order total must be greater than zero');

    // ── Coupon ────────────────────────────────────────────────────────────────
    let couponDiscount = 0;
    let pendingCoupon = null;
    if (coupon_code) {
      // Lock the coupon row so concurrent checkouts cannot both slip under usage_limit.
      const { rows: coupons } = await client.query(
        `SELECT * FROM coupons WHERE UPPER(code)=UPPER($1) AND is_active=true
           AND (expires_at IS NULL OR expires_at > now())
           AND (usage_limit IS NULL OR used_count < usage_limit)
           AND (user_id IS NULL OR user_id = $2)
         FOR UPDATE`,
        [String(coupon_code).trim(), req.user.id]
      );
      if (!coupons.length) return fail('Invalid or expired coupon');
      const c = coupons[0];
      if (c.per_user_limit) {
        const { rows: used } = await client.query(
          "SELECT COUNT(*)::int AS count FROM orders WHERE coupon_id=$1 AND user_id=$2 AND status <> 'cancelled'",
          [c.id, req.user.id]
        );
        if (used[0].count >= c.per_user_limit) return fail('You have already used this coupon');
      }
      // Shared prize codes (spin-wheel segments / scratch prizes) are only valid for a customer
      // who actually won them and has not used that win yet.
      if (!c.user_id) {
        const { rows: prizeCode } = await client.query(
          `SELECT 1 FROM spin_wheel_segments WHERE UPPER(coupon_code)=UPPER($1)
           UNION ALL SELECT 1 FROM scratch_card_prizes WHERE UPPER(coupon_code)=UPPER($1) LIMIT 1`,
          [c.code]
        ).catch(() => ({ rows: [] }));
        if (prizeCode.length) {
          const { rows: wins } = await client.query(
            `SELECT 1 FROM spin_wheel_logs WHERE user_id=$1 AND is_redeemed=false AND UPPER(coupon_code)=UPPER($2)
             UNION ALL
             SELECT 1 FROM scratch_card_logs WHERE user_id=$1 AND is_redeemed=false AND UPPER(coupon_code)=UPPER($2) LIMIT 1`,
            [req.user.id, c.code]
          );
          if (!wins.length) return fail('This prize code is not available on your account');
        }
      }
      if (c.min_order_value && subtotal < Number(c.min_order_value)) {
        return fail(`Minimum order value ₹${c.min_order_value} required for this coupon`);
      }
      couponDiscount = c.discount_type === 'percentage'
        ? Math.min((subtotal * Number(c.discount_value)) / 100, c.max_discount ? Number(c.max_discount) : Infinity)
        : Number(c.discount_value);
      couponDiscount = round2(Math.min(Math.max(0, couponDiscount), subtotal));
      pendingCoupon = c;
    }

    // ── Referral reward ───────────────────────────────────────────────────────
    let referralDiscount = 0;
    let appliedReward = null;

    const { rows: referralSettingRows } = await client.query(
      "SELECT value FROM settings WHERE key='referral_program_enabled'"
    );
    const referralProgramEnabled = referralSettingRows[0]?.value !== 'false';

    const { rows: rewardRows } = referralProgramEnabled
      ? await client.query(
          `SELECT * FROM referral_rewards WHERE user_id=$1 AND is_used=false
           ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`,
          [req.user.id]
        )
      : { rows: [] };

    if (rewardRows.length) {
      const reward = rewardRows[0];
      let eligible = false;

      if (reward.reward_type === 'referred') {
        const { rows: prevOrders } = await client.query(
          `SELECT COUNT(*)::integer AS count FROM orders WHERE user_id=$1 AND status <> 'cancelled'`,
          [req.user.id]
        );
        if (prevOrders[0].count === 0) eligible = true;
      } else {
        eligible = true;
      }

      if (eligible) {
        referralDiscount = round2(Math.min(subtotal, (subtotal * Number(reward.discount_percent)) / 100));
        appliedReward = reward;
      }
    }

    // ── Loyalty points ────────────────────────────────────────────────────────
    const { rows: loyaltySettings } = await client.query(
      "SELECT key, value FROM settings WHERE key IN ('loyalty_program_enabled','loyalty_redeem_points','loyalty_redeem_discount')"
    );
    const lmap = Object.fromEntries(loyaltySettings.map((r) => [r.key, r.value]));
    const loyaltyEnabled = lmap.loyalty_program_enabled !== 'false';
    const reqRedeemPoints = parseInt(lmap.loyalty_redeem_points || '200', 10);
    const redeemDiscountVal = Math.min(subtotal, parseFloat(lmap.loyalty_redeem_discount || '200'));

    let loyaltyAvailable = false;
    if (loyaltyEnabled && use_loyalty_points && userPhone && reqRedeemPoints > 0) {
      // Lock the card: the points are deducted in this same transaction below, so two
      // concurrent orders cannot both spend the same balance.
      const { rows: cardRows } = await client.query(
        'SELECT points FROM loyalty_cards WHERE phone=$1 FOR UPDATE', [userPhone]
      );
      if (cardRows.length && cardRows[0].points >= reqRedeemPoints) loyaltyAvailable = true;
    }

    // ── Birthday ──────────────────────────────────────────────────────────────
    // Requires: DOB set at least 30 days ago (so it cannot be set to "today" at checkout)
    // and no other birthday-discounted order this calendar year.
    let birthdayDiscount = 0;
    if (userInfo.date_of_birth) {
      const d = new Date(userInfo.date_of_birth);
      const now = new Date();
      const setAt = userInfo.date_of_birth_set_at ? new Date(userInfo.date_of_birth_set_at) : null;
      const dobIsSettled = !setAt || (now - setAt) >= 30 * 24 * 60 * 60 * 1000;
      if (dobIsSettled && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
        const { rows: usedRows } = await client.query(
          `SELECT id FROM orders WHERE user_id=$1 AND discount_type='birthday' AND status <> 'cancelled'
             AND date_part('year', created_at) = date_part('year', now()) LIMIT 1`,
          [req.user.id]
        );
        if (!usedRows.length) {
          const { rows: bRows } = await client.query("SELECT value FROM settings WHERE key='birthday_discount'");
          const pct = bRows.length ? parseInt(bRows[0].value, 10) : 15;
          birthdayDiscount = round2(Math.min(subtotal, (subtotal * pct) / 100));
        }
      }
    }

    // ── Pick the single best discount ─────────────────────────────────────────
    let discount = 0;
    let loyaltyDiscount = 0;
    let loyaltyPointsRedeemed = 0;
    let couponId = null;
    let discountType = null;

    const best = [
      { type: 'coupon',   amount: couponDiscount },
      { type: 'referral', amount: referralDiscount },
      { type: 'birthday', amount: birthdayDiscount },
      { type: 'loyalty',  amount: loyaltyAvailable ? redeemDiscountVal : 0 },
    ].reduce((a, b) => (b.amount > a.amount ? b : a));

    if (best.amount > 0) {
      discountType = best.type;
      if (best.type === 'coupon') {
        discount = couponDiscount;
        couponId = pendingCoupon.id;
        appliedReward = null;
        await client.query('UPDATE coupons SET used_count=used_count+1 WHERE id=$1', [pendingCoupon.id]);
        // If this coupon came from a spin/scratch prize, mark that prize redeemed.
        const { rows: spinRedeemed } = await client.query(
          `UPDATE spin_wheel_logs SET is_redeemed=true WHERE id = (
             SELECT id FROM spin_wheel_logs WHERE user_id=$1 AND is_redeemed=false AND UPPER(coupon_code)=UPPER($2)
             ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id`,
          [req.user.id, pendingCoupon.code]
        );
        if (!spinRedeemed.length) {
          await client.query(
            `UPDATE scratch_card_logs SET is_redeemed=true WHERE id = (
               SELECT id FROM scratch_card_logs WHERE user_id=$1 AND is_redeemed=false AND UPPER(coupon_code)=UPPER($2)
               ORDER BY scratched_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id`,
            [req.user.id, pendingCoupon.code]
          );
        }
      } else if (best.type === 'referral') {
        discount = referralDiscount;
      } else if (best.type === 'birthday') {
        discount = birthdayDiscount;
        appliedReward = null;
      } else {
        loyaltyDiscount = redeemDiscountVal;
        loyaltyPointsRedeemed = reqRedeemPoints;
        appliedReward = null;
        // Deduct now, for every payment method. Restored if the order is cancelled.
        const { rows: deducted } = await client.query(
          'UPDATE loyalty_cards SET points=points-$1, updated_at=now() WHERE phone=$2 AND points >= $1 RETURNING id',
          [reqRedeemPoints, userPhone]
        );
        if (!deducted.length) return fail('Not enough loyalty points');
      }
    }
    if (appliedReward && best.type !== 'referral') appliedReward = null;

    const afterDiscounts = round2(Math.max(0, subtotal - discount - loyaltyDiscount));
    const { shipping, freeShipReward } = await computeShipping(client, req.user.id, afterDiscounts);
    const total = round2(afterDiscounts + shipping);
    const orderNumber = generateOrderNumber();

    // ── Wallet ────────────────────────────────────────────────────────────────
    // Wallet pays down the total first; whatever's left is what actually goes to
    // Razorpay / gets collected on delivery. The wallet is debited in this transaction
    // for every payment method (and refunded on cancellation), so the same balance can
    // never be pledged to two orders.
    let walletAmount = 0;
    if (use_wallet) {
      const { rows: wSettings } = await client.query(
        "SELECT key, value FROM settings WHERE key IN ('wallet_enabled','wallet_min_order_amount','wallet_max_usage_percent','wallet_max_discount_cap')"
      );
      const wmap = Object.fromEntries(wSettings.map((r) => [r.key, r.value]));
      const walletEnabled = wmap.wallet_enabled !== 'false';
      const minOrderAmount = parseFloat(wmap.wallet_min_order_amount || '0');
      const maxUsagePercent = parseInt(wmap.wallet_max_usage_percent || '100', 10);
      const maxDiscountCap = parseFloat(wmap.wallet_max_discount_cap || '0');

      if (walletEnabled && total >= minOrderAmount) {
        const currentBalance = await walletService.getBalance(client, req.user.id);
        let maxAllowed = (total * maxUsagePercent) / 100;
        if (maxDiscountCap > 0) {
          maxAllowed = Math.min(maxAllowed, maxDiscountCap);
        }
        walletAmount = round2(Math.max(0, Math.min(currentBalance, total, maxAllowed)));
      }
    }
    const payableAmount = round2(Math.max(0, total - walletAmount));

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (order_number, user_id, address_id, coupon_id, subtotal, discount, loyalty_discount, total,
                           payment_method, wallet_amount, discount_type, delivery_charge, loyalty_points_redeemed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [orderNumber, req.user.id, address_id, couponId, subtotal, discount, loyaltyDiscount, total, method,
        walletAmount, discountType, shipping, loyaltyPointsRedeemed]
    );
    const order = orderRows[0];

    if (freeShipReward) {
      await client.query(`UPDATE ${freeShipReward.table} SET is_redeemed=true WHERE id=$1`, [freeShipReward.id]);
    }

    for (const item of cartItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_info, quantity, unit_price, combo_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [order.id, item.product_id, item.variant_id, item.name,
          item.size || item.color ? JSON.stringify({ size: item.size, color: item.color }) : null,
          item.quantity, item.offer_price || item.price, item.combo_id || null]
      );
      if (item.combo_id && item.combo_first) {
        const { rows: dec } = await client.query(
          'UPDATE combos SET stock=stock-$1 WHERE id=$2 AND (stock IS NULL OR stock>=$1) RETURNING id', [item.quantity, item.combo_id]
        );
        if (!dec.length) return fail(`Insufficient stock for ${item.combo_name}`);
      }

      // Guarded decrement: if anything slipped past the checks we get a clean 400, never a constraint 500.
      if (item.variant_id) {
        const { rows: dec } = await client.query(
          'UPDATE product_variants SET stock=stock-$1 WHERE id=$2 AND stock>=$1 RETURNING id', [item.quantity, item.variant_id]
        );
        if (!dec.length) return fail(`Insufficient stock for ${item.name}`);
        // Keep the product-level total in step so listings show "sold out" correctly.
        await client.query('UPDATE products SET stock=GREATEST(0, stock-$1) WHERE id=$2', [item.quantity, item.product_id]);
      } else {
        const { rows: dec } = await client.query(
          'UPDATE products SET stock=stock-$1 WHERE id=$2 AND stock>=$1 RETURNING id', [item.quantity, item.product_id]
        );
        if (!dec.length) return fail(`Insufficient stock for ${item.name}`);
      }
    }

    if (!buy_now_item) {
      await client.query('DELETE FROM cart WHERE user_id=$1', [req.user.id]);
    }

    let codPointsEarned = 0;
    if (method === 'cod' && userPhone) {
      codPointsEarned = await earnLoyaltyPoints(client, userPhone, userName, total);
      if (codPointsEarned) await client.query('UPDATE orders SET loyalty_points_earned=$1 WHERE id=$2', [codPointsEarned, order.id]);
    }

    if (appliedReward) {
      await client.query(
        'UPDATE referral_rewards SET is_used=true, used_at=now(), order_id=$1 WHERE id=$2',
        [order.id, appliedReward.id]
      );

      if (appliedReward.reward_type === 'referred') {
        const { rows: currentUserRows } = await client.query(
          'SELECT referred_by FROM users WHERE id=$1',
          [req.user.id]
        );
        const referredBy = currentUserRows[0]?.referred_by;
        if (referredBy) {
          const { rows: referrerRows } = await client.query(
            'SELECT id FROM users WHERE referral_code=$1',
            [referredBy]
          );
          if (referrerRows.length) {
            const { rows: settingRows } = await client.query(
              "SELECT value FROM settings WHERE key='referrer_discount_percent'"
            );
            const referrerDiscountPercent = settingRows.length ? parseInt(settingRows[0].value, 10) : 20;
            await client.query(
              `INSERT INTO referral_rewards (user_id, reward_type, discount_percent, order_id)
               VALUES ($1,'referrer',$2,$3)`,
              [referrerRows[0].id, referrerDiscountPercent, order.id]
            );
          }
        }
      }
    }

    if (walletAmount > 0) {
      const debitResult = await walletService.debit(client, {
        userId: req.user.id, amount: walletAmount, reason: 'order_payment',
        referenceType: 'order', referenceId: order.id,
      });
      if (!debitResult.success) {
        return fail('Your wallet balance changed — please review your order and try again.');
      }
      await client.query('UPDATE orders SET wallet_debited=true WHERE id=$1', [order.id]);
      order.wallet_debited = true;
    }

    let razorpayOrder = null;
    if (payableAmount === 0) {
      // Wallet covers the entire payable amount — nothing to charge online or collect on delivery.
      await client.query("UPDATE orders SET payment_status='paid' WHERE id=$1", [order.id]);
      order.payment_status = 'paid';
    } else if (ONLINE_METHODS.includes(method)) {
      razorpayOrder = await paymentService.createOrder(payableAmount, 'INR', orderNumber);
      await client.query('UPDATE orders SET razorpay_order_id=$1 WHERE id=$2', [razorpayOrder.id, order.id]);
    }

    await client.query('COMMIT');

    const { minDays, maxDays } = await getDeliveryEstimateSettings(db).catch(() => ({ minDays: null, maxDays: null }));
    const deliveryEstimateText = minDays != null ? formatEstimateText(minDays, maxDays) : null;

    if (userPhone) {
      whatsapp.sendOrderConfirmed?.(userPhone, orderNumber, total, deliveryEstimateText)?.catch(console.error);
    }

    created(res, {
      order: { ...order, loyalty_discount: loyaltyDiscount, wallet_amount: walletAmount, delivery_charge: shipping, razorpay_order_id: razorpayOrder?.id },
      razorpay: razorpayOrder,
      loyalty: { points_earned: codPointsEarned },
      wallet: { amount_used: walletAmount, payable_amount: payableAmount },
      delivery_estimate: minDays != null ? { min_days: minDays, max_days: maxDays, text: deliveryEstimateText } : null,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return badRequest(res, 'Payment verification failed');
  }
  const valid = paymentService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

  if (!valid) {
    const { rows: failedOrderRows } = await db.query(
      'SELECT order_number FROM orders WHERE razorpay_order_id=$1 AND user_id=$2',
      [razorpay_order_id, req.user.id]
    );
    const { rows: failedUserRows } = await db.query('SELECT phone FROM users WHERE id=$1', [req.user.id]);
    const failedPhone = (failedUserRows[0]?.phone || '').replace(/\D/g, '');
    if (failedPhone && failedOrderRows[0]) {
      whatsapp.sendPaymentFailed?.(failedPhone, failedOrderRows[0].order_number)?.catch(console.error);
    }
    return badRequest(res, 'Payment verification failed');
  }

  // Only transition orders that aren't already marked paid — this both detects
  // retries/double-taps of this endpoint and stops the one-time side effects below
  // (loyalty earn, payment-success WhatsApp) from running twice for the same order.
  const { rows: transitionedRows } = await db.query(
    `UPDATE orders SET payment_status='paid', razorpay_payment_id=$1
     WHERE razorpay_order_id=$2 AND user_id=$3 AND payment_status='pending' AND status <> 'cancelled'
     RETURNING id`,
    [razorpay_payment_id, razorpay_order_id, req.user.id]
  );
  const firstTimePaid = transitionedRows.length > 0;

  const { rows } = await db.query(
    'SELECT * FROM orders WHERE razorpay_order_id=$1 AND user_id=$2', [razorpay_order_id, req.user.id]
  );
  if (!rows.length) return notFound(res, 'Order not found');
  const order = rows[0];

  // Money arrived for an order that is no longer payable (cancelled while the modal was open,
  // or a replayed verify call after a refund): send it straight back and refuse.
  if (!firstTimePaid && order.payment_status !== 'paid') {
    const payable = round2(parseFloat(order.total) - parseFloat(order.wallet_amount || 0));
    if (payable > 0 && razorpay_payment_id !== order.razorpay_payment_id) {
      await paymentService.refundPayment(razorpay_payment_id, payable).catch((err) => console.error('stray payment refund failed:', err.message));
    }
    return badRequest(res, 'This order can no longer be paid. Any payment made has been refunded.');
  }
  const { rows: userRows } = await db.query('SELECT phone, name FROM users WHERE id=$1', [req.user.id]);
  const userPhone = (userRows[0]?.phone || '').replace(/\D/g, '');
  const userName = userRows[0]?.name || '';

  let pointsEarned = 0;
  if (firstTimePaid && userPhone) {
    whatsapp.sendPaymentSuccess?.(userPhone, order.order_number, order.total)?.catch(console.error);
    // Loyalty redemption and wallet debit already happened at placement (inside the
    // order transaction); only the earn side runs here, once, on successful payment.
    pointsEarned = await earnLoyaltyPoints(db, userPhone, userName, parseFloat(order.total)).catch((err) => {
      console.error('earnLoyaltyPoints failed:', err);
      return 0;
    });
    if (pointsEarned) await db.query('UPDATE orders SET loyalty_points_earned=$1 WHERE id=$2', [pointsEarned, order.id]).catch(console.error);
  }

  ok(res, { order, loyalty: { points_earned: pointsEarned } });
};

const ORDER_ITEMS_JSON = `
       json_agg(
         json_build_object(
           'id', oi.id,
           'product_id', oi.product_id,
           'variant_id', oi.variant_id,
           'product_name', oi.product_name,
           'size', (oi.variant_info->>'size'),
           'color', (oi.variant_info->>'color'),
           'quantity', oi.quantity,
           'unit_price', oi.unit_price,
           'image', (
             SELECT pi.url FROM product_images pi
             WHERE pi.product_id = oi.product_id
             ORDER BY pi.is_primary DESC, pi.sort_order ASC
             LIMIT 1
           )
         ) ORDER BY oi.id
       ) AS items`;

const listOrders = async (req, res) => {
  const { rows } = await db.query(
    `SELECT o.*, ${ORDER_ITEMS_JSON}
     FROM orders o
     JOIN order_items oi ON oi.order_id=o.id
     WHERE o.user_id=$1
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [req.user.id]
  );
  ok(res, { orders: rows });
};

const getOrder = async (req, res) => {
  const { rows } = await db.query(
    `SELECT o.*, ${ORDER_ITEMS_JSON},
            a.name, a.phone, a.address_line1, a.address_line2, a.city, a.state, a.pincode
     FROM orders o
     JOIN order_items oi ON oi.order_id=o.id
     LEFT JOIN addresses a ON o.address_id=a.id AND a.user_id=o.user_id
     WHERE o.id=$1 AND o.user_id=$2
     GROUP BY o.id, a.id`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return notFound(res, 'Order not found');
  const order = rows[0];

  if (order.courier_name === 'Dundu Delivery' && order.status === 'shipped' && order.picked_up_at) {
    order.delivery_otp = await otpService.peek?.(`delivery:${req.params.id}`);
  }

  ok(res, { order });
};

// Reverses everything placeOrder granted: stock, wallet, loyalty points, coupon usage,
// referral reward, and any online payment already captured. Shared with the admin
// cancellation path via module export.
const reverseOrderSideEffects = async (client, order, { refundNote } = {}) => {
  const { rows: items } = await client.query(
    'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id=$1',
    [order.id]
  );
  for (const item of items) {
    if (item.variant_id) {
      await client.query('UPDATE product_variants SET stock=stock+$1 WHERE id=$2', [item.quantity, item.variant_id]);
    }
    await client.query('UPDATE products SET stock=stock+$1 WHERE id=$2', [item.quantity, item.product_id]);
  }
  // Bundles: one unit of combo stock per bundle, regardless of how many lines it expanded into.
  await client.query(
    `UPDATE combos c SET stock = c.stock + q.qty
     FROM (SELECT combo_id, MAX(quantity) AS qty FROM order_items WHERE order_id=$1 AND combo_id IS NOT NULL GROUP BY combo_id) q
     WHERE c.id = q.combo_id AND c.stock IS NOT NULL`,
    [order.id]
  );

  if (order.coupon_id) {
    await client.query('UPDATE coupons SET used_count=GREATEST(0, used_count-1) WHERE id=$1', [order.coupon_id]);
  }

  await client.query(
    "UPDATE referral_rewards SET is_used=false, used_at=NULL, order_id=NULL WHERE order_id=$1 AND is_used=true",
    [order.id]
  );
  // A 'referrer' reward minted because of this order is withdrawn if still unused.
  await client.query(
    "DELETE FROM referral_rewards WHERE order_id=$1 AND reward_type='referrer' AND is_used=false",
    [order.id]
  );

  const pointsRedeemed = parseInt(order.loyalty_points_redeemed, 10) || 0;
  const pointsEarned = parseInt(order.loyalty_points_earned, 10) || 0;
  if (pointsRedeemed > 0 || pointsEarned > 0) {
    const { rows: u } = await client.query('SELECT phone FROM users WHERE id=$1', [order.user_id]);
    const phone = (u[0]?.phone || '').replace(/\D/g, '');
    if (phone) {
      // Give back what was spent, take back what this order earned (and its spend total).
      await client.query(
        `UPDATE loyalty_cards SET points=GREATEST(0, points + $1 - $2),
                total_spent=GREATEST(0, total_spent - $3), updated_at=now() WHERE phone=$4`,
        [pointsRedeemed, pointsEarned, pointsEarned ? parseFloat(order.total) : 0, phone]
      );
    }
  }

  if (order.wallet_debited && parseFloat(order.wallet_amount) > 0) {
    await walletService.credit(client, {
      userId: order.user_id, amount: parseFloat(order.wallet_amount), reason: 'order_refund',
      referenceType: 'order', referenceId: order.id, note: refundNote || 'Order cancelled',
    });
  }

  // Money captured through Razorpay: refund to the original method; if the gateway
  // refuses, fall back to a wallet credit so the customer is never left unpaid.
  // Only ever refund once: 'refunded' status or a stored refund id means the money already went back.
  const paidOnline = order.payment_status === 'paid' && order.razorpay_payment_id && !order.razorpay_refund_id;
  const onlineAmount = round2(parseFloat(order.total) - parseFloat(order.wallet_amount || 0));
  let refund = null;
  if (paidOnline && onlineAmount > 0) {
    try {
      const gw = await paymentService.refundPayment(order.razorpay_payment_id, onlineAmount);
      refund = { method: 'original', amount: onlineAmount, reference: gw?.id || null };
    } catch (err) {
      const desc = String(err?.error?.description || err?.message || '');
      const alreadyRefunded = /already.*refund/i.test(desc);
      const definitiveRejection = err?.statusCode >= 400 && err?.statusCode < 500 && !alreadyRefunded;
      console.error(`Razorpay refund failed for order ${order.order_number}:`, desc);
      if (alreadyRefunded) {
        refund = { method: 'original', amount: onlineAmount, reference: 'already-refunded' };
      } else if (definitiveRejection) {
        // Gateway refuses (e.g. payment too old): keep the customer whole via wallet credit.
        await walletService.credit(client, {
          userId: order.user_id, amount: onlineAmount, reason: 'order_refund',
          referenceType: 'order', referenceId: order.id,
          note: `${refundNote || 'Order cancelled'} — gateway refund refused, credited to wallet`,
        });
        refund = { method: 'wallet', amount: onlineAmount };
      } else {
        // Network/5xx: unknown outcome. Abort the whole cancellation so it can be retried safely.
        throw new Error('Payment gateway is not reachable right now. Please retry the cancellation in a moment.');
      }
    }
    await client.query("UPDATE orders SET payment_status='refunded', razorpay_refund_id=$2 WHERE id=$1", [order.id, refund.reference || 'refunded']);
  }
  return refund;
};

const cancelOrder = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Atomic status guard: only one of two concurrent cancel requests can win this UPDATE,
    // so stock/wallet/points are never restored twice.
    const { rows } = await client.query(
      `UPDATE orders SET status='cancelled', updated_at=now()
       WHERE id=$1 AND user_id=$2 AND status IN ('pending','packed')
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      const { rows: existing } = await db.query('SELECT status FROM orders WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
      if (!existing.length) return notFound(res, 'Order not found');
      return badRequest(res, 'Order cannot be cancelled at this stage');
    }
    const order = rows[0];

    const refund = await reverseOrderSideEffects(client, order, { refundNote: 'Order cancelled' });

    await client.query('COMMIT');

    const { rows: u } = await db.query('SELECT phone FROM users WHERE id=$1', [req.user.id]);
    const phone = (u[0]?.phone || '').replace(/\D/g, '');
    if (phone) whatsapp.sendOrderCancelled?.(phone, order.order_number)?.catch(console.error);

    ok(res, { refund }, 'Order cancelled');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

const returnRequest = async (req, res) => {
  const { reason } = req.body;
  const { rows } = await db.query("SELECT * FROM orders WHERE id=$1 AND user_id=$2 AND status='delivered'", [req.params.id, req.user.id]);
  if (!rows.length) return notFound(res, 'Only delivered orders can be returned');

  const deliveredAt = new Date(rows[0].delivered_at || rows[0].delivery_completed_at || rows[0].updated_at);
  const hoursSince = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60);
  if (hoursSince > 48) return badRequest(res, 'Return request window has expired (must be within 48 hours of delivery)');

  const abuse = await getReturnAbuseSettings(db);
  if (abuse.blockReturn && abuse.threshold > 0) {
    const returnedCount = await getReturnedOrderCount(db, req.user.id);
    if (returnedCount >= abuse.threshold) {
      return badRequest(res, `Returns are no longer available on your account due to a history of returns (${returnedCount} returned orders). Please contact support.`);
    }
  }

  const { rows: transitioned } = await db.query(
    "UPDATE orders SET status='return_requested', updated_at=now() WHERE id=$1 AND status='delivered' RETURNING id",
    [req.params.id]
  );
  if (!transitioned.length) return badRequest(res, 'Return request already submitted');
  await db.query('INSERT INTO return_requests (order_id, reason) VALUES ($1,$2)', [req.params.id, String(reason || '').slice(0, 1000)]);
  ok(res, {}, 'Return request submitted');
};

// Customer closed the Razorpay window (or it failed) — hand back a fresh Razorpay order for the same amount.
const retryPayment = async (req, res) => {
  const { rows } = await db.query(
    "SELECT * FROM orders WHERE id=$1 AND user_id=$2", [req.params.id, req.user.id]
  );
  if (!rows.length) return notFound(res, 'Order not found');
  const order = rows[0];
  if (order.payment_status !== 'pending' || !ONLINE_METHODS.includes(order.payment_method) || order.status === 'cancelled') {
    return badRequest(res, 'This order is not awaiting an online payment');
  }
  const payable = round2(parseFloat(order.total) - parseFloat(order.wallet_amount || 0));
  if (!(payable > 0)) return badRequest(res, 'Nothing left to pay on this order');
  const razorpayOrder = await paymentService.createOrder(payable, 'INR', order.order_number);
  await db.query('UPDATE orders SET razorpay_order_id=$1 WHERE id=$2', [razorpayOrder.id, order.id]);
  ok(res, { order: { ...order, razorpay_order_id: razorpayOrder.id }, razorpay: razorpayOrder });
};

module.exports = {
  placeOrder, verifyPayment, retryPayment, listOrders, getOrder, cancelOrder, returnRequest, getReturnRestrictions,
  reverseOrderSideEffects, earnLoyaltyPoints,
};
