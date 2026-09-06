const router = require('express').Router();
const db = require('../config/db');
const { ok } = require('../utils/response');
const ah = require('../utils/asyncHandler');
const { formatEstimateText } = require('../utils/delivery');

// ── Customer & Domain Route Registrations ──────────────────────────────────
router.use('/auth',       require('./customer/auth.routes'));
router.use('/products',   require('./customer/product.routes'));
router.use('/categories', require('./customer/category.routes'));
router.use('/combos',     require('./customer/combo.routes'));
router.use('/cart',       require('./customer/cart.routes'));
router.use('/orders',     require('./customer/order.routes'));
router.use('/users',      require('./customer/user.routes'));
router.use('/coupons',    require('./customer/coupon.routes'));
router.use('/loyalty',    require('./customer/loyalty.routes'));
router.use('/delivery',   require('./customer/delivery.routes'));
router.use('/spin-wheel', require('./customer/spinWheel.routes'));
router.use('/wallet',     require('./customer/wallet.routes'));

// ── Admin Sub-System Router ─────────────────────────────────────────────
router.use('/admin',      require('./admin/index'));

// ── Global & Public Feature Endpoints ────────────────────────────────────

// Public announcements + popup interval
router.get('/announcements', ah(async (_req, res) => {
  const [annRes, settingRes] = await Promise.all([
    db.query('SELECT id, text, bg_color, text_color, show_popup FROM announcements WHERE is_active=true ORDER BY sort_order, id'),
    db.query("SELECT value FROM settings WHERE key='popup_interval_minutes'").catch(() => ({ rows: [] })),
  ]);
  const popup_interval_minutes = settingRes.rows.length ? parseInt(settingRes.rows[0].value, 10) : 10;
  ok(res, { announcements: annRes.rows, popup_interval_minutes });
}));

// Public splash screen config — used by mobile app on launch
router.get('/settings/splash', async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM splash_config WHERE is_active=true LIMIT 1');
    ok(res, { splash: rows[0] || null });
  } catch { ok(res, { splash: null }); }
});

// Public payment/delivery settings — used by checkout (web + mobile)
router.get('/settings/payment', async (_req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT key, value FROM settings WHERE key IN ('cod_enabled','delivery_charge','free_delivery_threshold','coupon_field_enabled','birthday_discount','birthday_popup_enabled','update_available','update_message','latest_version','offer_badge_color','offer_badge_text_color','delivery_estimate_min_days','delivery_estimate_max_days')"
    );
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const deliveryEstimateMinDays = parseInt(map.delivery_estimate_min_days ?? '3', 10);
    const deliveryEstimateMaxDays = parseInt(map.delivery_estimate_max_days ?? '7', 10);
    ok(res, {
      cod_enabled: map.cod_enabled !== 'false',
      delivery_charge: parseInt(map.delivery_charge ?? '50', 10),
      free_delivery_threshold: parseInt(map.free_delivery_threshold ?? '500', 10),
      coupon_field_enabled: map.coupon_field_enabled !== 'false',
      birthday_discount: parseInt(map.birthday_discount ?? '15', 10),
      birthday_popup_enabled: map.birthday_popup_enabled !== 'false',
      update_available: map.update_available === 'true',
      update_message: map.update_message || 'A new version of Dundu is available. Please update the app for the best experience.',
      latest_version: map.latest_version || '1.0.0',
      offer_badge_color: map.offer_badge_color || '#e91e8c',
      offer_badge_text_color: map.offer_badge_text_color || '#ffffff',
      delivery_estimate_min_days: deliveryEstimateMinDays,
      delivery_estimate_max_days: deliveryEstimateMaxDays,
      delivery_estimate_text: formatEstimateText(deliveryEstimateMinDays, deliveryEstimateMaxDays),
    });
  } catch {
    ok(res, {
      cod_enabled: true, delivery_charge: 50, free_delivery_threshold: 500,
      offer_badge_color: '#e91e8c', offer_badge_text_color: '#ffffff',
      delivery_estimate_min_days: 3, delivery_estimate_max_days: 7, delivery_estimate_text: '3-7 days',
    });
  }
});

// Homepage feed (banners, categories, new arrivals, trending, offers)
router.get('/home', ah(async (_req, res) => {
  const PRODUCT_FIELDS = `
    SELECT p.*, (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS image,
           COALESCE(AVG(r.rating),0) AS avg_rating, COUNT(r.id) AS review_count
    FROM products p LEFT JOIN reviews r ON r.product_id=p.id
    WHERE p.is_hidden=false`;

  const [banners, categories, newArrivalsRes, trendingRes, offersRes] = await Promise.all([
    db.query('SELECT * FROM banners WHERE is_active=true ORDER BY sort_order'),
    db.query('SELECT * FROM categories WHERE is_active=true ORDER BY sort_order'),
    db.query(`${PRODUCT_FIELDS} AND p.is_new_arrival=true  GROUP BY p.id ORDER BY p.created_at DESC LIMIT 8`),
    db.query(`${PRODUCT_FIELDS} AND p.is_featured=true     GROUP BY p.id ORDER BY RANDOM() LIMIT 8`),
    db.query(`${PRODUCT_FIELDS} AND p.is_offer_product=true GROUP BY p.id LIMIT 8`),
  ]);

  let newArrivals = newArrivalsRes.rows;
  let trending    = trendingRes.rows;

  if (newArrivals.length === 0) {
    const fb = await db.query(`${PRODUCT_FIELDS} GROUP BY p.id ORDER BY p.created_at DESC LIMIT 8`);
    newArrivals = fb.rows;
  }
  if (trending.length === 0) {
    const fb = await db.query(`${PRODUCT_FIELDS} GROUP BY p.id ORDER BY RANDOM() LIMIT 8`);
    trending = fb.rows;
  }

  ok(res, {
    banners:      banners.rows,
    categories:   categories.rows,
    new_arrivals: newArrivals,
    trending,
    offers:       offersRes.rows,
  });
}));


// Public festival config — used by web store to read active festival theme + popup
router.get('/festival/config', ah(async (_req, res) => {
  try {
    const FESTIVAL_KEYS = [
      'festival_enabled','festival_name','festival_emoji','festival_bg_color',
      'festival_navbar_color','festival_navbar_text_color','festival_logo_url',
      'festival_popup_enabled','festival_popup_heading','festival_popup_subtext',
      'festival_popup_coupon','festival_popup_badge_text','festival_popup_btn_text',
      'festival_popup_btn_color','festival_popup_expires_at','festival_banner_text',
    ];
    const { rows } = await db.query(`SELECT key, value FROM settings WHERE key = ANY($1)`, [FESTIVAL_KEYS]);
    const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    ok(res, { festival: cfg });
  } catch { ok(res, { festival: { festival_enabled: 'false' } }); }
}));

const DEFAULT_FIRST_PURCHASE_SLABS = [
  { min_order: 0, max_order: 500, discount_amount: 50 },
  { min_order: 500, max_order: 1000, discount_amount: 100 },
  { min_order: 1000, max_order: 1500, discount_amount: 150 },
  { min_order: 1500, max_order: 999999, discount_amount: 200 },
];

// Public 1st Purchase Offer config — used by checkout and banner displays
router.get('/first-purchase/config', ah(async (_req, res) => {
  try {
    const KEYS = [
      'first_purchase_enabled',
      'first_purchase_discount_amount',
      'first_purchase_min_order',
      'first_purchase_coupon_code',
      'first_purchase_auto_apply',
      'first_purchase_title',
      'first_purchase_subtitle',
      'first_purchase_slabs',
    ];
    const { rows } = await db.query(`SELECT key, value FROM settings WHERE key = ANY($1)`, [KEYS]);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    let slabs = DEFAULT_FIRST_PURCHASE_SLABS;
    if (map.first_purchase_slabs) {
      try {
        slabs = JSON.parse(map.first_purchase_slabs);
      } catch (e) {}
    }

    ok(res, {
      enabled: map.first_purchase_enabled !== 'false',
      discount_amount: parseFloat(map.first_purchase_discount_amount ?? '100'),
      min_order: parseFloat(map.first_purchase_min_order ?? '0'),
      coupon_code: map.first_purchase_coupon_code || 'WELCOME100',
      auto_apply: map.first_purchase_auto_apply !== 'false',
      title: map.first_purchase_title || '🎉 1st Order Welcome Discount!',
      subtitle: map.first_purchase_subtitle || 'Get exclusive welcome discount savings automatically on your 1st order!',
      slabs,
    });
  } catch {
    ok(res, {
      enabled: true,
      discount_amount: 100,
      min_order: 0,
      coupon_code: 'WELCOME100',
      auto_apply: true,
      title: '🎉 1st Order Welcome Discount!',
      subtitle: 'Get exclusive welcome discount savings automatically on your 1st order!',
      slabs: DEFAULT_FIRST_PURCHASE_SLABS,
    });
  }
}));

// Public Scratch & Win config
router.get('/scratch-card/config', ah(async (req, res) => {
  try {
    const { phone, user_id } = req.query;
    const KEYS = [
      'scratch_card_enabled',
      'scratch_card_min_order',
      'scratch_card_payment_methods',
      'scratch_card_auto_grant',
      'scratch_card_title',
      'scratch_card_subtitle',
      'scratch_card_foil_color',
      'scratch_card_min_orders',
      'scratch_card_active_from',
      'scratch_card_active_until',
      'scratch_card_max_per_day',
      'scratch_card_cooldown_hours',
    ];
    const { rows } = await db.query(`SELECT key, value FROM settings WHERE key = ANY($1)`, [KEYS]);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    let is_forced = false;
    let userOrderCount = 0;
    let lastScratchAt = null;

    if (user_id || phone) {
      let uSql = 'SELECT id, force_scratch_popup, last_scratch_at FROM users WHERE ';
      const uParams = [];
      if (user_id) {
        uParams.push(user_id);
        uSql += `id = $${uParams.length}`;
      }
      if (phone) {
        if (user_id) uSql += ' OR ';
        uParams.push(phone);
        uSql += `RIGHT(phone, 10) = RIGHT($${uParams.length}, 10)`;
      }
      const uRes = await db.query(uSql, uParams).catch(() => ({ rows: [] }));
      if (uRes.rows.length > 0) {
        const uRow = uRes.rows[0];
        if (uRow.force_scratch_popup) is_forced = true;
        lastScratchAt = uRow.last_scratch_at;

        // Get user order count
        const orderRes = await db.query(
          `SELECT COUNT(*)::int AS count FROM orders WHERE user_id=$1 AND status != 'cancelled'`,
          [uRow.id]
        ).catch(() => ({ rows: [{ count: 0 }] }));
        userOrderCount = orderRes.rows[0]?.count || 0;
      }
    }

    // Schedule check (Active From & Until)
    const now = new Date();
    let isScheduleActive = true;
    if (map.scratch_card_active_from) {
      const fromDate = new Date(map.scratch_card_active_from);
      if (!isNaN(fromDate.getTime()) && now < fromDate) isScheduleActive = false;
    }
    if (map.scratch_card_active_until) {
      const untilDate = new Date(map.scratch_card_active_until);
      if (!isNaN(untilDate.getTime()) && now > untilDate) isScheduleActive = false;
    }

    // Min orders threshold check
    const minOrdersRequired = parseInt(map.scratch_card_min_orders ?? '0', 10);
    const meetsOrderRequirement = minOrdersRequired === 0 || userOrderCount >= minOrdersRequired;

    // Cooldown check
    const cooldownHours = parseFloat(map.scratch_card_cooldown_hours ?? '24');
    let isCooldownActive = false;
    if (lastScratchAt) {
      const hoursSinceLast = (now.getTime() - new Date(lastScratchAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < cooldownHours) isCooldownActive = true;
    }

    const isGloballyEnabled = map.scratch_card_enabled !== 'false';
    const isEligible = is_forced || (isGloballyEnabled && isScheduleActive && meetsOrderRequirement && !isCooldownActive);

    ok(res, {
      enabled: isGloballyEnabled,
      is_eligible: isEligible,
      min_order: parseFloat(map.scratch_card_min_order ?? '499'),
      min_orders: minOrdersRequired,
      user_orders_count: userOrderCount,
      active_from: map.scratch_card_active_from || '',
      active_until: map.scratch_card_active_until || '',
      payment_methods: map.scratch_card_payment_methods || 'all',
      auto_grant: map.scratch_card_auto_grant !== 'false',
      title: map.scratch_card_title || ' Scratch & Win Guaranteed Prizes!',
      subtitle: map.scratch_card_subtitle || 'Scratch the card to reveal your instant discount reward!',
      foil_color: map.scratch_card_foil_color || '#C0C0C0',
      is_forced,
    });
  } catch {
    ok(res, {
      enabled: true,
      is_eligible: true,
      min_order: 499,
      min_orders: 0,
      payment_methods: 'all',
      auto_grant: true,
      title: ' Scratch & Win Guaranteed Prizes!',
      subtitle: 'Scratch the card to reveal your instant discount reward!',
      foil_color: '#C0C0C0',
      is_forced: false,
    });
  }
}));

// Customer Scratch reveal endpoint
router.post('/scratch-card/reveal', ah(async (req, res) => {
  const { user_id, phone, order_id } = req.body;

  const prizesRes = await db.query('SELECT * FROM scratch_card_prizes WHERE is_active=true');
  const prizes = prizesRes.rows;

  if (prizes.length === 0) {
    return ok(res, {
      prize: { label: 'Better Luck Next Time', type: 'no_prize', coupon_code: null, value: 0 }
    });
  }

  const totalWeight = prizes.reduce((sum, p) => sum + (p.probability || 10), 0);
  let randomNum = Math.random() * totalWeight;
  let selectedPrize = prizes[0];

  for (const prize of prizes) {
    if (randomNum < (prize.probability || 10)) {
      selectedPrize = prize;
      break;
    }
    randomNum -= (prize.probability || 10);
  }

  if (user_id || phone) {
    let updateSql = 'UPDATE users SET force_scratch_popup = false, last_scratch_at = NOW() WHERE ';
    const updateParams = [];
    if (user_id) {
      updateParams.push(user_id);
      updateSql += `id = $${updateParams.length}`;
    }
    if (phone) {
      if (user_id) updateSql += ' OR ';
      updateParams.push(phone);
      updateSql += `RIGHT(phone, 10) = RIGHT($${updateParams.length}, 10)`;
    }
    await db.query(updateSql, updateParams).catch(() => {});
  }

  await db.query(
    `INSERT INTO scratch_card_logs (user_id, phone, prize_id, prize_label, prize_type, prize_value, coupon_code, order_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      user_id || null,
      phone || null,
      selectedPrize.id,
      selectedPrize.label,
      selectedPrize.type,
      selectedPrize.value || 0,
      selectedPrize.coupon_code || null,
      order_id || null,
    ]
  ).catch(() => {});

  ok(res, { prize: selectedPrize });
}));

// Customer Scratch Active Reward endpoint
router.get('/scratch-card/active-reward', ah(async (req, res) => {
  const userId = req.query.user_id || req.query.userId || null;
  const rawPhone = req.query.phone || '';
  const phone = rawPhone.replace(/\D/g, '');

  if (!userId && !phone) {
    return ok(res, { active_reward: null });
  }

  let rewardQuery = `
    SELECT id, prize_label, prize_type, prize_value, coupon_code, created_at
    FROM scratch_card_logs
    WHERE is_redeemed = false AND prize_type != 'no_prize' AND (
  `;
  const rewardParams = [];
  if (userId) {
    rewardParams.push(userId);
    rewardQuery += `user_id = $${rewardParams.length}`;
  }
  if (phone) {
    if (userId) rewardQuery += ' OR ';
    rewardParams.push(phone);
    rewardQuery += `RIGHT(phone, 10) = RIGHT($${rewardParams.length}, 10)`;
  }
  rewardQuery += `) ORDER BY created_at DESC LIMIT 1`;

  const { rows } = await db.query(rewardQuery, rewardParams).catch(() => ({ rows: [] }));

  ok(res, { active_reward: rows[0] || null });
}));

module.exports = router;
