const router = require('express').Router();
const db = require('../config/db');
const { ok } = require('../utils/response');
const ah = require('../utils/asyncHandler');

// ── Safe migrations ──────────────────────────────────────────────────────
// Ensure settings table and default cod_enabled row exist
db.query(`
  CREATE TABLE IF NOT EXISTS settings (
    key   VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  )
`).then(() =>
  db.query(`
    INSERT INTO settings (key, value) VALUES ('cod_enabled', 'true')
    ON CONFLICT (key) DO NOTHING
  `).then(() =>
  db.query(`
    INSERT INTO settings (key, value) VALUES ('coupon_field_enabled', 'true')
    ON CONFLICT (key) DO NOTHING
  `)
  )
).catch(() => {});

// Ensure splash_config table exists (created here so public /settings/splash works on first boot)
db.query(`
  CREATE TABLE IF NOT EXISTS splash_config (
    id          SERIAL PRIMARY KEY,
    app_name    VARCHAR(100)  NOT NULL DEFAULT 'Dundu',
    tagline     VARCHAR(200)  NOT NULL DEFAULT '',
    bg_color    VARCHAR(20)   NOT NULL DEFAULT '#0F0F0F',
    text_color  VARCHAR(20)   NOT NULL DEFAULT '#FFFFFF',
    duration_ms INT           NOT NULL DEFAULT 2500,
    is_active   BOOLEAN       NOT NULL DEFAULT true,
    bg_image    VARCHAR(300),
    updated_at  TIMESTAMPTZ            DEFAULT now()
  )
`).catch(() => {});

db.query(`
  CREATE TABLE IF NOT EXISTS search_logs (
    id         SERIAL PRIMARY KEY,
    term       VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ  DEFAULT now()
  )
`).catch(() => {});


router.use('/auth', require('./auth'));
router.use('/products', require('./products'));
router.use('/categories', require('./categories'));
router.use('/cart', require('./cart'));
router.use('/orders', require('./orders'));
router.use('/users', require('./users'));
router.use('/coupons', require('./coupons'));
router.use('/loyalty', require('./loyalty'));
router.use('/admin', require('./admin/index'));
router.use('/delivery', require('./delivery'));

// Public announcements + popup interval
router.get('/announcements', ah(async (_req, res) => {
  const [annRes, settingRes] = await Promise.all([
    db.query('SELECT id, text, bg_color, text_color, show_popup FROM announcements WHERE is_active=true ORDER BY sort_order, id'),
    db.query("SELECT value FROM settings WHERE key='popup_interval_minutes'").catch(() => ({ rows: [] })),
  ]);
  const popup_interval_minutes = settingRes.rows.length ? parseInt(settingRes.rows[0].value) : 10;
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
      "SELECT key, value FROM settings WHERE key IN ('cod_enabled','delivery_charge','free_delivery_threshold','coupon_field_enabled','birthday_discount','birthday_popup_enabled','update_available','update_message','latest_version','offer_badge_color','offer_badge_text_color')"
    );
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    ok(res, {
      cod_enabled: map.cod_enabled !== 'false',
      delivery_charge: parseInt(map.delivery_charge ?? '50'),
      free_delivery_threshold: parseInt(map.free_delivery_threshold ?? '500'),
      coupon_field_enabled: map.coupon_field_enabled !== 'false',
      birthday_discount: parseInt(map.birthday_discount ?? '15'),
      birthday_popup_enabled: map.birthday_popup_enabled !== 'false',
      update_available: map.update_available === 'true',
      update_message: map.update_message || 'A new version of Dundu is available. Please update the app for the best experience.',
      latest_version: map.latest_version || '1.0.0',
      offer_badge_color: map.offer_badge_color || '#e91e8c',
      offer_badge_text_color: map.offer_badge_text_color || '#ffffff',
    });
  } catch { ok(res, { cod_enabled: true, delivery_charge: 50, free_delivery_threshold: 500, offer_badge_color: '#e91e8c', offer_badge_text_color: '#ffffff' }); }
});


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

  // Fallback: if flagged sections are empty, fill from all visible products
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

module.exports = router;
