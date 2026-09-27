const router = require('express').Router();
const db = require('../config/db');
const { ok, badRequest } = require('../utils/response');
const ah = require('../utils/asyncHandler');
const { authenticate, authenticateOptional } = require('../middleware/auth/auth.middleware');
const { rewardLimiter } = require('../middleware/rateLimit.middleware');
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
    // scheduled_time (HH:MM, store local time) hides an announcement until that time each day.
    db.query(`SELECT id, text, bg_color, text_color, show_popup, scheduled_time FROM announcements
              WHERE is_active=true AND deleted_at IS NULL
                AND (scheduled_time IS NULL OR scheduled_time = '' OR scheduled_time <= to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH24:MI'))
              ORDER BY sort_order, id`),
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
      "SELECT key, value FROM settings WHERE key IN ('cod_enabled','delivery_charge','free_delivery_threshold','coupon_field_enabled','birthday_discount','birthday_popup_enabled','update_available','update_message','latest_version','offer_badge_color','offer_badge_text_color','delivery_estimate_min_days','delivery_estimate_max_days','loyalty_redeem_points','loyalty_redeem_discount','wallet_enabled','wallet_min_order_amount','wallet_max_usage_percent','wallet_max_discount_cap')"
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
      loyalty_redeem_points: parseInt(map.loyalty_redeem_points ?? '200', 10),
      loyalty_redeem_discount: parseFloat(map.loyalty_redeem_discount ?? '200'),
      wallet: {
        enabled: map.wallet_enabled !== 'false',
        min_order_amount: parseFloat(map.wallet_min_order_amount ?? '0'),
        max_usage_percent: parseInt(map.wallet_max_usage_percent ?? '100', 10),
        max_discount_cap: parseFloat(map.wallet_max_discount_cap ?? '0'),
      },
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

// ── Scratch & Win ────────────────────────────────────────────────────────────
// Identity always comes from the JWT (never from the body/query), and the eligibility
// rules shown by /config are the same ones enforced by /reveal.
const SCRATCH_KEYS = [
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

const getScratchState = async (user, q = db) => {
  const { rows } = await q.query(`SELECT key, value FROM settings WHERE key = ANY($1)`, [SCRATCH_KEYS]);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  let isForced = false;
  let userOrderCount = 0;
  let lastScratchAt = null;
  let scratchesToday = 0;

  if (user) {
    const uRes = await q.query(
      'SELECT id, force_scratch_popup, last_scratch_at FROM users WHERE id = $1', [user.id]
    );
    if (uRes.rows.length) {
      const uRow = uRes.rows[0];
      if (uRow.force_scratch_popup) isForced = true;
      lastScratchAt = uRow.last_scratch_at;
    }
    const orderRes = await q.query(
      `SELECT COUNT(*)::int AS count FROM orders WHERE user_id=$1 AND status != 'cancelled'`, [user.id]
    );
    userOrderCount = orderRes.rows[0]?.count || 0;
    const todayRes = await q.query(
      `SELECT COUNT(*)::int AS count FROM scratch_card_logs WHERE user_id=$1 AND scratched_at >= date_trunc('day', now())`,
      [user.id]
    ).catch(() => ({ rows: [{ count: 0 }] }));
    scratchesToday = todayRes.rows[0]?.count || 0;
  }

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

  const minOrdersRequired = parseInt(map.scratch_card_min_orders ?? '0', 10);
  const meetsOrderRequirement = minOrdersRequired === 0 || userOrderCount >= minOrdersRequired;

  const cooldownHours = parseFloat(map.scratch_card_cooldown_hours ?? '24');
  let isCooldownActive = false;
  if (lastScratchAt) {
    const hoursSinceLast = (now.getTime() - new Date(lastScratchAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLast < cooldownHours) isCooldownActive = true;
  }
  const maxPerDay = parseInt(map.scratch_card_max_per_day ?? '1', 10);
  const overDailyCap = maxPerDay > 0 && scratchesToday >= maxPerDay;

  const isGloballyEnabled = map.scratch_card_enabled !== 'false';
  const isEligible = !!user && (isForced || (isGloballyEnabled && isScheduleActive && meetsOrderRequirement && !isCooldownActive && !overDailyCap));

  return {
    map, isForced, isGloballyEnabled, isEligible, minOrdersRequired, userOrderCount,
  };
};

router.get('/scratch-card/config', authenticateOptional, ah(async (req, res) => {
  try {
    const st = await getScratchState(req.user || null);
    const { map } = st;
    ok(res, {
      enabled: st.isGloballyEnabled,
      is_eligible: st.isEligible,
      min_order: parseFloat(map.scratch_card_min_order ?? '499'),
      min_orders: st.minOrdersRequired,
      user_orders_count: st.userOrderCount,
      active_from: map.scratch_card_active_from || '',
      active_until: map.scratch_card_active_until || '',
      payment_methods: map.scratch_card_payment_methods || 'all',
      auto_grant: map.scratch_card_auto_grant !== 'false',
      title: map.scratch_card_title || ' Scratch & Win Guaranteed Prizes!',
      subtitle: map.scratch_card_subtitle || 'Scratch the card to reveal your instant discount reward!',
      foil_color: map.scratch_card_foil_color || '#C0C0C0',
      is_forced: st.isForced,
    });
  } catch {
    ok(res, {
      enabled: false,
      is_eligible: false,
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

// Customer Scratch reveal endpoint (login required; eligibility enforced server-side)
router.post('/scratch-card/reveal', authenticate, rewardLimiter, ah(async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    // Per-user lock: parallel reveals must not each pass the eligibility check.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`scratch:${req.user.id}`]);
    await revealInner(req, res, client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

const revealInner = async (req, res, q) => {
  const st = await getScratchState(req.user, q);
  if (!st.isEligible) return badRequest(res, 'You are not eligible to scratch a card right now.');

  const prizesRes = await q.query('SELECT * FROM scratch_card_prizes WHERE is_active=true');
  const prizes = prizesRes.rows;

  // Record the attempt first (and clear any forced popup) so a retry cannot re-roll.
  await q.query(
    'UPDATE users SET force_scratch_popup = false, last_scratch_at = NOW() WHERE id = $1', [req.user.id]
  );

  if (prizes.length === 0) {
    return ok(res, {
      prize: { label: 'Better Luck Next Time', type: 'no_prize', coupon_code: null, value: 0 }
    });
  }

  const totalWeight = prizes.reduce((sum, p) => sum + (Number(p.probability) || 10), 0);
  let randomNum = Math.random() * totalWeight;
  let selectedPrize = prizes[0];

  for (const prize of prizes) {
    if (randomNum < (Number(prize.probability) || 10)) {
      selectedPrize = prize;
      break;
    }
    randomNum -= (Number(prize.probability) || 10);
  }

  // Prize coupon codes are shared across winners but each customer may use one only once.
  if (selectedPrize.coupon_code && selectedPrize.type !== 'no_prize') {
    await q.query(
      `INSERT INTO coupons (code, discount_type, discount_value, is_active, per_user_limit)
       VALUES ($1, $2, $3, true, 1)
       ON CONFLICT (code) DO NOTHING`,
      [
        selectedPrize.coupon_code,
        Number(selectedPrize.value) > 50 ? 'fixed' : 'percentage',
        Number(selectedPrize.value) || 0,
      ]
    ).catch(() => {});
  }

  const phone = (req.user.phone || '').replace(/\D/g, '') || null;
  await q.query(
    `INSERT INTO scratch_card_logs (user_id, phone, user_name, prize_id, prize_label, prize_type, prize_value, coupon_code, is_redeemed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
    [
      req.user.id,
      phone,
      req.user.name || null,
      selectedPrize.id,
      selectedPrize.label,
      selectedPrize.type,
      selectedPrize.value || 0,
      selectedPrize.coupon_code || null,
    ]
  );

  ok(res, { prize: selectedPrize });
};

// Customer Scratch Active Reward endpoint
router.get('/scratch-card/active-reward', authenticate, ah(async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, prize_label, prize_type, prize_value, coupon_code, scratched_at AS created_at
     FROM scratch_card_logs
     WHERE user_id = $1 AND is_redeemed = false AND prize_type != 'no_prize'
     ORDER BY scratched_at DESC LIMIT 1`,
    [req.user.id]
  ).catch(() => ({ rows: [] }));

  ok(res, { active_reward: rows[0] || null });
}));

module.exports = router;
