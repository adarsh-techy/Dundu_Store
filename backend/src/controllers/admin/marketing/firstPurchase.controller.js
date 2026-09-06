const db = require('../../../config/db');
const { ok, badRequest } = require('../../../utils/response');

const FIRST_PURCHASE_KEYS = [
  'first_purchase_enabled',
  'first_purchase_discount_amount',
  'first_purchase_min_order',
  'first_purchase_coupon_code',
  'first_purchase_auto_apply',
  'first_purchase_title',
  'first_purchase_subtitle',
  'first_purchase_slabs',
];

const DEFAULT_SLABS = [
  { min_order: 0, max_order: 500, discount_amount: 50 },
  { min_order: 500, max_order: 1000, discount_amount: 100 },
  { min_order: 1000, max_order: 1500, discount_amount: 150 },
  { min_order: 1500, max_order: 999999, discount_amount: 200 },
];

const getConfig = async (_req, res) => {
  const [settingsRes, statsRes] = await Promise.all([
    db.query(`SELECT key, value FROM settings WHERE key = ANY($1)`, [FIRST_PURCHASE_KEYS]),
    db.query(`
      SELECT 
        COUNT(id)::int AS total_claims,
        COALESCE(SUM(discount_amount), 0)::float AS total_savings,
        COALESCE(SUM(total_amount), 0)::float AS total_revenue
      FROM orders
      WHERE status NOT IN ('cancelled')
        AND (coupon_code = (SELECT value FROM settings WHERE key = 'first_purchase_coupon_code' LIMIT 1)
             OR coupon_code = 'WELCOME100')
    `).catch(() => ({ rows: [{ total_claims: 0, total_savings: 0, total_revenue: 0 }] })),
  ]);

  const map = Object.fromEntries(settingsRes.rows.map((r) => [r.key, r.value]));
  const stats = statsRes.rows[0] || { total_claims: 0, total_savings: 0, total_revenue: 0 };

  let slabs = DEFAULT_SLABS;
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
    stats,
  });
};

const updateConfig = async (req, res) => {
  const {
    enabled,
    discount_amount,
    min_order,
    coupon_code,
    auto_apply,
    title,
    subtitle,
    slabs,
  } = req.body;

  const code = (coupon_code || 'WELCOME100').toUpperCase().trim();
  const discountVal = parseFloat(discount_amount ?? 100);
  const minOrderVal = parseFloat(min_order ?? 0);
  const slabsVal = Array.isArray(slabs) && slabs.length > 0 ? JSON.stringify(slabs) : JSON.stringify(DEFAULT_SLABS);

  const updates = [
    ['first_purchase_enabled', enabled === false ? 'false' : 'true'],
    ['first_purchase_discount_amount', String(discountVal)],
    ['first_purchase_min_order', String(minOrderVal)],
    ['first_purchase_coupon_code', code],
    ['first_purchase_auto_apply', auto_apply === false ? 'false' : 'true'],
    ['first_purchase_title', title || '🎉 1st Order Welcome Discount!'],
    ['first_purchase_subtitle', subtitle || 'Get exclusive welcome discount savings automatically on your 1st order!'],
    ['first_purchase_slabs', slabsVal],
  ];

  for (const [key, val] of updates) {
    await db.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, val]
    );
  }

  // Auto-sync or create coupon in database coupons table
  await db.query(
    `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, is_active)
     VALUES ($1, 'fixed', $2, $3, $4)
     ON CONFLICT (code) DO UPDATE SET 
       discount_type = 'fixed',
       discount_value = $2,
       min_order_amount = $3,
       is_active = $4`,
    [code, discountVal, minOrderVal, enabled !== false]
  ).catch(() => {});

  ok(res, { message: 'First purchase offer settings saved successfully!' });
};

module.exports = {
  getConfig,
  updateConfig,
};
