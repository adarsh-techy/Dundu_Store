const db = require('../../../config/db');
const { ok, badRequest, notFound } = require('../../../utils/response');

// Ensure tables exist on startup
async function initTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS scratch_card_prizes (
      id SERIAL PRIMARY KEY,
      label VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'coupon',
      value NUMERIC DEFAULT 0,
      coupon_code VARCHAR(100),
      color VARCHAR(50) DEFAULT '#FFD700',
      text_color VARCHAR(50) DEFAULT '#000000',
      probability INT DEFAULT 10,
      is_active BOOLEAN DEFAULT true,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS scratch_card_logs (
      id SERIAL PRIMARY KEY,
      user_id UUID,
      phone VARCHAR(50),
      user_name VARCHAR(255),
      prize_id INT,
      prize_label VARCHAR(255),
      prize_type VARCHAR(50),
      prize_value NUMERIC DEFAULT 0,
      coupon_code VARCHAR(100),
      order_id UUID,
      scratched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS force_scratch_popup BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_scratch_at TIMESTAMP WITH TIME ZONE;
  `).catch(() => {});
}

initTables();

const SCRATCH_SETTINGS_KEYS = [
  'scratch_card_enabled',
  'scratch_card_min_order',
  'scratch_card_payment_methods', // 'all' | 'prepaid_only' | 'cod_only'
  'scratch_card_auto_grant',      // 'true' | 'false'
  'scratch_card_title',
  'scratch_card_subtitle',
  'scratch_card_foil_color',
  'scratch_card_min_orders',       // min completed/placed orders required
  'scratch_card_active_from',      // start date/time
  'scratch_card_active_until',     // end date/time
  'scratch_card_max_per_day',      // max scratches allowed per day
  'scratch_card_cooldown_hours',   // cooldown hours between scratches
];

const getConfig = async (_req, res) => {
  const [settingsRes, prizesRes, logsCountRes] = await Promise.all([
    db.query(`SELECT key, value FROM settings WHERE key = ANY($1)`, [SCRATCH_SETTINGS_KEYS]),
    db.query(`SELECT * FROM scratch_card_prizes ORDER BY sort_order ASC, id ASC`),
    db.query(`SELECT COUNT(*)::int AS total_scratches FROM scratch_card_logs`),
  ]);

  const map = Object.fromEntries(settingsRes.rows.map((r) => [r.key, r.value]));

  // Provide default prizes if table is empty
  let prizes = prizesRes.rows;
  if (prizes.length === 0) {
    const defaultPrizes = [
      { label: '₹100 Cashback Voucher', type: 'cashback', value: 100, coupon_code: 'SCRATCH100', color: '#FFD700', text_color: '#000', probability: 25 },
      { label: '15% OFF Special Discount', type: 'coupon', value: 15, coupon_code: 'SCRATCH15', color: '#E91E8C', text_color: '#FFF', probability: 35 },
      { label: 'Free Delivery Pass', type: 'free_shipping', value: 0, coupon_code: 'FREESHIP', color: '#3B82F6', text_color: '#FFF', probability: 30 },
      { label: 'Better Luck Next Time', type: 'no_prize', value: 0, coupon_code: null, color: '#6B7280', text_color: '#FFF', probability: 10 },
    ];
    for (let i = 0; i < defaultPrizes.length; i++) {
      const p = defaultPrizes[i];
      const inserted = await db.query(
        `INSERT INTO scratch_card_prizes (label, type, value, coupon_code, color, text_color, probability, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [p.label, p.type, p.value, p.coupon_code, p.color, p.text_color, p.probability, i + 1]
      );
      prizes.push(inserted.rows[0]);
    }
  }

  ok(res, {
    enabled: map.scratch_card_enabled !== 'false',
    min_order: parseFloat(map.scratch_card_min_order ?? '499'),
    payment_methods: map.scratch_card_payment_methods || 'all',
    auto_grant: map.scratch_card_auto_grant !== 'false',
    title: map.scratch_card_title || ' Scratch & Win Guaranteed Prizes!',
    subtitle: map.scratch_card_subtitle || 'Scratch the card to reveal your instant discount reward!',
    foil_color: map.scratch_card_foil_color || '#C0C0C0',
    min_orders: parseInt(map.scratch_card_min_orders ?? '0', 10),
    active_from: map.scratch_card_active_from || '',
    active_until: map.scratch_card_active_until || '',
    max_per_day: parseInt(map.scratch_card_max_per_day ?? '1', 10),
    cooldown_hours: parseFloat(map.scratch_card_cooldown_hours ?? '24'),
    total_scratches: logsCountRes.rows[0]?.total_scratches || 0,
    prizes,
  });
};

const updateSettings = async (req, res) => {
  const {
    enabled,
    min_order,
    payment_methods,
    auto_grant,
    title,
    subtitle,
    foil_color,
    min_orders,
    active_from,
    active_until,
    max_per_day,
    cooldown_hours,
  } = req.body;

  const updates = [
    ['scratch_card_enabled', enabled === false ? 'false' : 'true'],
    ['scratch_card_min_order', String(parseFloat(min_order ?? 499))],
    ['scratch_card_payment_methods', payment_methods || 'all'],
    ['scratch_card_auto_grant', auto_grant === false ? 'false' : 'true'],
    ['scratch_card_title', title || ' Scratch & Win Guaranteed Prizes!'],
    ['scratch_card_subtitle', subtitle || 'Scratch the card to reveal your instant discount reward!'],
    ['scratch_card_foil_color', foil_color || '#C0C0C0'],
    ['scratch_card_min_orders', String(parseInt(min_orders ?? '0', 10))],
    ['scratch_card_active_from', active_from || ''],
    ['scratch_card_active_until', active_until || ''],
    ['scratch_card_max_per_day', String(parseInt(max_per_day ?? '1', 10))],
    ['scratch_card_cooldown_hours', String(parseFloat(cooldown_hours ?? '24'))],
  ];

  for (const [key, val] of updates) {
    await db.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, val]
    );
  }

  ok(res, { message: 'Scratch & Win settings saved successfully!' });
};

// Dedicated handler for quick eligibility rules (min orders + active date range + limits)
const updatePermissionRules = async (req, res) => {
  const { min_orders, active_from, active_until, max_per_day, cooldown_hours } = req.body;

  const updates = [
    ['scratch_card_min_orders', String(parseInt(min_orders ?? '0', 10))],
    ['scratch_card_active_from', active_from || ''],
    ['scratch_card_active_until', active_until || ''],
    ['scratch_card_max_per_day', String(parseInt(max_per_day ?? '1', 10))],
    ['scratch_card_cooldown_hours', String(parseFloat(cooldown_hours ?? '24'))],
  ];

  for (const [key, val] of updates) {
    await db.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, val]
    );
  }

  ok(res, { message: 'Scratch Card permission rules updated successfully!' });
};

// PRIZE CRUD
const createPrize = async (req, res) => {
  const { label, type, value, coupon_code, color, text_color, probability, is_active, sort_order } = req.body;

  if (!label?.trim()) return badRequest(res, 'Label is required');
  if (!type) return badRequest(res, 'Prize type is required');

  const { rows } = await db.query(
    `INSERT INTO scratch_card_prizes
       (label, type, value, coupon_code, color, text_color, probability, is_active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      label.trim(),
      type,
      value ?? 0,
      coupon_code?.trim() || null,
      color || '#FFD700',
      text_color || '#000000',
      probability ?? 10,
      is_active !== false,
      sort_order ?? 0,
    ]
  );

  ok(res, { prize: rows[0] });
};

const updatePrize = async (req, res) => {
  const { id } = req.params;
  const { label, type, value, coupon_code, color, text_color, probability, is_active, sort_order } = req.body;

  const { rows } = await db.query(
    `UPDATE scratch_card_prizes
     SET label = COALESCE($1, label),
         type = COALESCE($2, type),
         value = COALESCE($3, value),
         coupon_code = $4,
         color = COALESCE($5, color),
         text_color = COALESCE($6, text_color),
         probability = COALESCE($7, probability),
         is_active = COALESCE($8, is_active),
         sort_order = COALESCE($9, sort_order)
     WHERE id = $10
     RETURNING *`,
    [label, type, value, coupon_code, color, text_color, probability, is_active, sort_order, id]
  );

  if (rows.length === 0) return notFound(res, 'Prize card not found');
  ok(res, { prize: rows[0] });
};

const deletePrize = async (req, res) => {
  const { id } = req.params;
  const { rowCount } = await db.query('DELETE FROM scratch_card_prizes WHERE id = $1', [id]);
  if (!rowCount) return notFound(res, 'Prize card not found');
  ok(res, { message: 'Prize card removed successfully' });
};

// USER PERMISSIONS & FORCE POPUP
const getUsersPermissions = async (req, res) => {
  const search = (req.query.search || '').trim();
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const offset = (page - 1) * limit;

  let queryStr = `
    SELECT u.id, u.name, u.email, u.phone, u.force_scratch_popup, u.created_at,
           COUNT(l.id)::int AS total_scratches,
           (SELECT COUNT(*)::int FROM orders o WHERE o.user_id = u.id AND o.status != 'cancelled') AS total_orders
    FROM users u
    LEFT JOIN scratch_card_logs l ON (l.user_id = u.id OR (l.phone IS NOT NULL AND l.phone = u.phone))
  `;
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    queryStr += ` WHERE u.name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1`;
  }

  queryStr += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  let countStr = 'SELECT COUNT(*)::int AS total FROM users u';
  const countParams = [];
  if (search) {
    countParams.push(`%${search}%`);
    countStr += ' WHERE u.name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1';
  }

  const [{ rows: users }, countRes] = await Promise.all([
    db.query(queryStr, params),
    db.query(countStr, countParams),
  ]);

  ok(res, {
    users,
    total: countRes.rows[0].total,
    page,
    limit,
  });
};

const forceUserScratchPopup = async (req, res) => {
  const { user_id, user_ids } = req.body;

  if (Array.isArray(user_ids) && user_ids.length > 0) {
    await db.query(
      'UPDATE users SET force_scratch_popup = true WHERE id = ANY($1::uuid[])',
      [user_ids]
    );
  } else if (user_id) {
    await db.query(
      'UPDATE users SET force_scratch_popup = true WHERE id = $1',
      [user_id]
    );
  } else {
    return badRequest(res, 'user_id or user_ids is required');
  }

  ok(res, { message: 'Scratch card popup successfully forced for user(s)!' });
};

const getLogs = async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const offset = (page - 1) * limit;

  const [{ rows: logs }, countRes] = await Promise.all([
    db.query(
      `SELECT l.*, u.name AS user_name, u.email AS user_email
       FROM scratch_card_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ORDER BY l.scratched_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    db.query('SELECT COUNT(*)::int AS total FROM scratch_card_logs'),
  ]);

  ok(res, { logs, total: countRes.rows[0].total, page, limit });
};

module.exports = {
  getConfig,
  updateSettings,
  updatePermissionRules,
  createPrize,
  updatePrize,
  deletePrize,
  getUsersPermissions,
  forceUserScratchPopup,
  getLogs,
};
