const db = require('../../../config/db');
const { ok, created, badRequest, notFound } = require('../../../utils/response');
const paymentService = require('../../../services/payment/payment.service');
const whatsapp = require('../../../services/whatsapp/whatsapp.service');
const otpService = require('../../../services/otp/otp.service');
const walletService = require('../../../services/wallet/wallet.service');
const { getDeliveryEstimateSettings, formatEstimateText } = require('../../../utils/delivery');

const generateOrderNumber = () => `VLR${Date.now().toString().slice(-8)}`;

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

const earnLoyaltyPoints = async (client, phone, name, total) => {
  const pointsEarned = Math.floor(total / 500) * 20;
  if (!pointsEarned) return;
  await client.query(
    `INSERT INTO loyalty_cards (phone, name, points, total_spent)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (phone) DO UPDATE SET
       points      = loyalty_cards.points + $3,
       total_spent = loyalty_cards.total_spent + $4,
       name        = EXCLUDED.name,
       updated_at  = now()`,
    [phone, name, pointsEarned, total]
  );
};

const placeOrder = async (req, res) => {
  const { address_id, coupon_code, payment_method, buy_now_item, use_loyalty_points, use_wallet } = req.body;
  const method = (payment_method || '').toLowerCase();
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    if (method === 'cod') {
      const { rows: userRows } = await client.query('SELECT is_cod_blocked FROM users WHERE id=$1', [req.user.id]);
      if (userRows.length && userRows[0].is_cod_blocked) {
        await client.query('ROLLBACK');
        return badRequest(res, 'Cash on Delivery is unavailable for your account. Please choose an online payment method.');
      }

      const abuse = await getReturnAbuseSettings(client);
      if (abuse.blockCod && abuse.threshold > 0) {
        const returnedCount = await getReturnedOrderCount(client, req.user.id);
        if (returnedCount >= abuse.threshold) {
          await client.query('ROLLBACK');
          return badRequest(res, `Cash on Delivery is unavailable on your account due to a history of returns (${returnedCount} returned orders). Please pay online.`);
        }
      }
    }

    let cartItems;

    if (buy_now_item) {
      const { product_id, variant_id, quantity = 1 } = buy_now_item;
      const { rows: prods } = await client.query(
        'SELECT id AS product_id, name, price, offer_price, stock FROM products WHERE id=$1',
        [product_id]
      );
      if (!prods.length) return badRequest(res, 'Product not found');
      const p = prods[0];
      let variantData = {};
      if (variant_id) {
        const { rows: vars } = await client.query(
          'SELECT id AS variant_id, size, color, stock AS variant_stock FROM product_variants WHERE id=$1',
          [variant_id]
        );
        if (vars.length) variantData = vars[0];
      }
      cartItems = [{ quantity, product_id: p.product_id, name: p.name, price: p.price,
        offer_price: p.offer_price, stock: p.stock, variant_id: variantData.variant_id || null,
        size: variantData.size || null, color: variantData.color || null,
        variant_stock: variantData.variant_stock || null }];
    } else {
      const { rows } = await client.query(
        `SELECT c.quantity, p.id AS product_id, p.name, p.price, p.offer_price, p.stock,
                c.variant_id, pv.size, pv.color, pv.stock AS variant_stock
         FROM cart c
         JOIN products p ON c.product_id=p.id
         LEFT JOIN product_variants pv ON c.variant_id=pv.id
         WHERE c.user_id=$1`,
        [req.user.id]
      );
      if (!rows.length) return badRequest(res, 'Cart is empty');
      cartItems = rows;
    }

    const { rows: userInfoRows } = await client.query('SELECT phone, name FROM users WHERE id=$1', [req.user.id]);
    const userPhone = (userInfoRows[0]?.phone || '').replace(/\D/g, '');
    const userName = userInfoRows[0]?.name || '';

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
        await client.query('ROLLBACK');
        return badRequest(res, `Insufficient stock for ${item.name}`);
      }
      subtotal += (item.offer_price || item.price) * item.quantity;
    }

    let couponDiscount = 0;
    let pendingCoupon = null;
    if (coupon_code) {
      const { rows: coupons } = await client.query(
        `SELECT * FROM coupons WHERE UPPER(code)=UPPER($1) AND is_active=true AND (expires_at IS NULL OR expires_at > now())
         AND (usage_limit IS NULL OR used_count < usage_limit)`,
        [coupon_code]
      );
      if (coupons.length) {
        const c = coupons[0];
        if (!c.min_order_value || subtotal >= c.min_order_value) {
          couponDiscount = c.discount_type === 'percentage'
            ? Math.min((subtotal * c.discount_value) / 100, c.max_discount || Infinity)
            : c.discount_value;
          pendingCoupon = c;
        }
      }
    }

    let referralDiscount = 0;
    let appliedReward = null;

    const { rows: rewardRows } = await client.query(
      `SELECT * FROM referral_rewards WHERE user_id=$1 AND is_used=false ORDER BY created_at ASC LIMIT 1`,
      [req.user.id]
    );

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
        referralDiscount = Math.round((subtotal * reward.discount_percent) / 100);
        appliedReward = reward;
      }
    }

    const LOYALTY_VALUE = 200;
    let loyaltyAvailable = false;
    if (use_loyalty_points && userPhone) {
      const { rows: cardRows } = await client.query(
        'SELECT points FROM loyalty_cards WHERE phone=$1', [userPhone]
      );
      if (cardRows.length && cardRows[0].points >= 200) loyaltyAvailable = true;
    }

    let birthdayDiscount = 0;
    if (req.user?.id) {
      const { rows: uRows } = await client.query(
        'SELECT date_of_birth FROM users WHERE id=$1', [req.user.id]
      );
      const dob = uRows[0]?.date_of_birth;
      if (dob) {
        const d = new Date(dob);
        const now = new Date();
        if (d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
          const { rows: bRows } = await client.query(
            "SELECT value FROM settings WHERE key='birthday_discount'"
          );
          const pct = bRows.length ? parseInt(bRows[0].value, 10) : 15;
          birthdayDiscount = Math.round((subtotal * pct) / 100);
        }
      }
    }

    let discount = 0;
    let loyaltyDiscount = 0;
    let couponId = null;

    const best = [
      { type: 'coupon',   amount: couponDiscount },
      { type: 'referral', amount: referralDiscount },
      { type: 'birthday', amount: birthdayDiscount },
      { type: 'loyalty',  amount: loyaltyAvailable ? LOYALTY_VALUE : 0 },
    ].reduce((a, b) => (b.amount > a.amount ? b : a));

    if (best.amount > 0) {
      if (best.type === 'coupon') {
        discount = couponDiscount;
        couponId = pendingCoupon.id;
        appliedReward = null;
        await client.query('UPDATE coupons SET used_count=used_count+1 WHERE id=$1', [pendingCoupon.id]);
      } else if (best.type === 'referral') {
        discount = referralDiscount;
      } else if (best.type === 'birthday') {
        discount = birthdayDiscount;
        appliedReward = null;
      } else {
        loyaltyDiscount = LOYALTY_VALUE;
        appliedReward = null;
        if (method === 'cod') {
          await client.query(
            'UPDATE loyalty_cards SET points=points-200, updated_at=now() WHERE phone=$1', [userPhone]
          );
        }
      }
    }

    const total = Math.max(0, subtotal - discount - loyaltyDiscount);
    const orderNumber = generateOrderNumber();

    // Wallet pays down the total first; whatever's left is what actually
    // goes to Razorpay / gets collected on delivery.
    let walletAmount = 0;
    if (use_wallet) {
      const currentBalance = await walletService.getBalance(client, req.user.id);
      walletAmount = Math.round(Math.min(currentBalance, total) * 100) / 100;
    }
    const payableAmount = Math.max(0, Math.round((total - walletAmount) * 100) / 100);

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (order_number, user_id, address_id, coupon_id, subtotal, discount, loyalty_discount, total, payment_method, wallet_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [orderNumber, req.user.id, address_id, couponId, subtotal, discount, loyaltyDiscount, total, method, walletAmount]
    );
    const order = orderRows[0];

    for (const item of cartItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_info, quantity, unit_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order.id, item.product_id, item.variant_id, item.name,
          item.size || item.color ? JSON.stringify({ size: item.size, color: item.color }) : null,
          item.quantity, item.offer_price || item.price]
      );

      if (item.variant_id) {
        await client.query('UPDATE product_variants SET stock=GREATEST(0,stock-$1) WHERE id=$2', [item.quantity, item.variant_id]);
      } else {
        await client.query('UPDATE products SET stock=GREATEST(0,stock-$1) WHERE id=$2', [item.quantity, item.product_id]);
      }
    }

    if (!buy_now_item) {
      await client.query('DELETE FROM cart WHERE user_id=$1', [req.user.id]);
    }

    if (method === 'cod' && userPhone) {
      await earnLoyaltyPoints(client, userPhone, userName, total);
    }

    if (appliedReward) {
      await client.query(
        'UPDATE referral_rewards SET is_used=true, order_id=$1 WHERE id=$2',
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
              `INSERT INTO referral_rewards (user_id, reward_type, discount_percent)
               VALUES ($1,'referrer',$2)`,
              [referrerRows[0].id, referrerDiscountPercent]
            );
          }
        }
      }
    }

    let razorpayOrder = null;
    if (payableAmount === 0) {
      // Wallet covers the entire payable amount — nothing to charge online or collect on delivery.
      await client.query("UPDATE orders SET payment_status='paid' WHERE id=$1", [order.id]);
      order.payment_status = 'paid';
    } else if (method === 'online' || method === 'upi' || method === 'card') {
      razorpayOrder = await paymentService.createOrder(payableAmount, 'INR', orderNumber);
      await client.query('UPDATE orders SET razorpay_order_id=$1 WHERE id=$2', [razorpayOrder.id, order.id]);
    }

    // Debit the wallet now for COD orders and for orders the wallet fully covers (no
    // separate payment-verification step will run for either). Online/UPI/card orders
    // that still owe a remaining balance debit the wallet in verifyPayment instead, once
    // the Razorpay payment actually succeeds — see the same immediate-vs-on-verify split
    // used for loyalty points above.
    if (walletAmount > 0 && (method === 'cod' || payableAmount === 0)) {
      const debitResult = await walletService.debit(client, {
        userId: req.user.id, amount: walletAmount, reason: 'order_payment',
        referenceType: 'order', referenceId: order.id,
      });
      if (!debitResult.success) {
        await client.query('ROLLBACK');
        return badRequest(res, 'Your wallet balance changed — please review your order and try again.');
      }
      await client.query('UPDATE orders SET wallet_debited=true WHERE id=$1', [order.id]);
      order.wallet_debited = true;
    }

    await client.query('COMMIT');

    const { minDays, maxDays } = await getDeliveryEstimateSettings(db).catch(() => ({ minDays: null, maxDays: null }));
    const deliveryEstimateText = minDays != null ? formatEstimateText(minDays, maxDays) : null;

    if (userPhone) {
      whatsapp.sendOrderConfirmed?.(userPhone, orderNumber, total, deliveryEstimateText)?.catch(console.error);
    }

    const pointsEarned = method === 'cod' ? Math.floor(total / 500) * 20 : 0;
    created(res, {
      order: { ...order, loyalty_discount: loyaltyDiscount, wallet_amount: walletAmount, razorpay_order_id: razorpayOrder?.id },
      razorpay: razorpayOrder,
      loyalty: { points_earned: pointsEarned },
      wallet: { amount_used: walletAmount, payable_amount: payableAmount },
      delivery_estimate: minDays != null ? { min_days: minDays, max_days: maxDays, text: deliveryEstimateText } : null,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
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

  await db.query(
    `UPDATE orders SET payment_status='paid', razorpay_payment_id=$1
     WHERE razorpay_order_id=$2 AND user_id=$3`,
    [razorpay_payment_id, razorpay_order_id, req.user.id]
  );

  const { rows } = await db.query('SELECT * FROM orders WHERE razorpay_order_id=$1', [razorpay_order_id]);
  const { rows: userRows } = await db.query('SELECT phone, name FROM users WHERE id=$1', [req.user.id]);
  const order = rows[0];
  const userPhone = (userRows[0]?.phone || '').replace(/\D/g, '');
  const userName = userRows[0]?.name || '';

  if (userPhone && order) {
    whatsapp.sendPaymentSuccess?.(userPhone, order.order_number, order.total)?.catch(console.error);

    if (parseFloat(order.loyalty_discount) > 0) {
      db.query(
        'UPDATE loyalty_cards SET points=GREATEST(0, points-200), updated_at=now() WHERE phone=$1',
        [userPhone]
      ).catch(console.error);
    }

    earnLoyaltyPoints(db, userPhone, userName, parseFloat(order.total)).catch(console.error);
  }

  if (order && !order.wallet_debited && parseFloat(order.wallet_amount) > 0) {
    const debitResult = await walletService.debit(db, {
      userId: req.user.id, amount: parseFloat(order.wallet_amount), reason: 'order_payment',
      referenceType: 'order', referenceId: order.id,
    }).catch((err) => { console.error('wallet debit on verifyPayment failed:', err); return null; });
    if (debitResult?.success) {
      await db.query('UPDATE orders SET wallet_debited=true WHERE id=$1', [order.id]).catch(console.error);
    }
    // If this fails (balance changed since checkout, e.g. spent elsewhere), the payment has
    // already succeeded via Razorpay — we don't block a completed payment on it. wallet_debited
    // stays false, which flags the order for admin follow-up.
  }

  const pointsEarned = Math.floor(parseFloat(order?.total || 0) / 500) * 20;
  ok(res, { order, loyalty: { points_earned: pointsEarned } });
};

const listOrders = async (req, res) => {
  const { rows } = await db.query(
    `SELECT o.*,
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
       ) AS items
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
    `SELECT o.*,
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
       ) AS items, a.*
     FROM orders o
     JOIN order_items oi ON oi.order_id=o.id
     LEFT JOIN addresses a ON o.address_id=a.id
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

const cancelOrder = async (req, res) => {
  const { rows } = await db.query('SELECT * FROM orders WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!rows.length) return notFound(res, 'Order not found');
  if (!['pending', 'packed'].includes(rows[0].status)) return badRequest(res, 'Order cannot be cancelled at this stage');
  const order = rows[0];

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows: items } = await client.query(
      'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id=$1',
      [req.params.id]
    );
    for (const item of items) {
      if (item.variant_id) {
        await client.query('UPDATE product_variants SET stock=stock+$1 WHERE id=$2', [item.quantity, item.variant_id]);
      } else {
        await client.query('UPDATE products SET stock=stock+$1 WHERE id=$2', [item.quantity, item.product_id]);
      }
    }

    await client.query("UPDATE orders SET status='cancelled', updated_at=now() WHERE id=$1", [req.params.id]);

    if (order.wallet_debited && parseFloat(order.wallet_amount) > 0) {
      await walletService.credit(client, {
        userId: req.user.id, amount: parseFloat(order.wallet_amount), reason: 'order_refund',
        referenceType: 'order', referenceId: order.id, note: 'Order cancelled',
      });
    }

    await client.query('COMMIT');
    ok(res, {}, 'Order cancelled');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const returnRequest = async (req, res) => {
  const { reason } = req.body;
  const { rows } = await db.query("SELECT * FROM orders WHERE id=$1 AND user_id=$2 AND status='delivered'", [req.params.id, req.user.id]);
  if (!rows.length) return notFound(res, 'Only delivered orders can be returned');

  const deliveredAt = new Date(rows[0].updated_at);
  const hoursSince = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60);
  if (hoursSince > 48) return badRequest(res, 'Return request window has expired (must be within 48 hours of delivery)');

  const abuse = await getReturnAbuseSettings(db);
  if (abuse.blockReturn && abuse.threshold > 0) {
    const returnedCount = await getReturnedOrderCount(db, req.user.id);
    if (returnedCount >= abuse.threshold) {
      return badRequest(res, `Returns are no longer available on your account due to a history of returns (${returnedCount} returned orders). Please contact support.`);
    }
  }

  await db.query('INSERT INTO return_requests (order_id, reason) VALUES ($1,$2)', [req.params.id, reason]);
  await db.query("UPDATE orders SET status='return_requested', updated_at=now() WHERE id=$1", [req.params.id]);
  ok(res, {}, 'Return request submitted');
};

module.exports = { placeOrder, verifyPayment, listOrders, getOrder, cancelOrder, returnRequest, getReturnRestrictions };
