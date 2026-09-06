const db = require('../../../config/db');
const { ok, badRequest, notFound } = require('../../../utils/response');

const getConfig = async (_req, res) => {
  const [settingsRes, segmentsRes, logsCountRes, userTargetsRes] = await Promise.all([
    db.query(
      `SELECT key, value FROM settings WHERE key IN (
        'spin_wheel_enabled',
        'spin_wheel_cooldown_hours',
        'spin_wheel_delay_seconds',
        'spin_wheel_max_per_day',
        'spin_wheel_start_time',
        'spin_wheel_end_time',
        'spin_wheel_require_login',
        'spin_wheel_time_slot',
        'spin_wheel_morning_start',
        'spin_wheel_morning_end',
        'spin_wheel_evening_start',
        'spin_wheel_evening_end',
        'spin_wheel_night_start',
        'spin_wheel_night_end',
        'spin_wheel_title',
        'spin_wheel_subtitle',
        'spin_wheel_force_all_timestamp',
        'spin_wheel_min_orders',
        'spin_wheel_active_from',
        'spin_wheel_active_until'
      )`
    ),
    db.query('SELECT * FROM spin_wheel_segments ORDER BY sort_order ASC, id ASC'),
    db.query('SELECT COUNT(*)::int AS total_spins FROM spin_wheel_logs'),
    db.query(`
      SELECT t.*, u.name AS user_name, u.email AS user_email, s.label AS segment_label
      FROM spin_wheel_user_targets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN spin_wheel_segments s ON t.segment_id = s.id
      ORDER BY t.created_at DESC
    `),
  ]);

  const map = Object.fromEntries(settingsRes.rows.map((r) => [r.key, r.value]));

  ok(res, {
    enabled: map.spin_wheel_enabled !== 'false',
    cooldown_hours: parseFloat(map.spin_wheel_cooldown_hours ?? '24'),
    delay_seconds: parseInt(map.spin_wheel_delay_seconds ?? '3', 10),
    max_per_day: parseInt(map.spin_wheel_max_per_day ?? '1', 10),
    start_time: map.spin_wheel_start_time || '00:00',
    end_time: map.spin_wheel_end_time || '23:59',
    require_login: map.spin_wheel_require_login !== 'false',
    time_slot_mode: map.spin_wheel_time_slot || 'anytime',
    morning_start: map.spin_wheel_morning_start || '06:00',
    morning_end: map.spin_wheel_morning_end || '12:00',
    evening_start: map.spin_wheel_evening_start || '16:00',
    evening_end: map.spin_wheel_evening_end || '20:00',
    night_start: map.spin_wheel_night_start || '20:00',
    night_end: map.spin_wheel_night_end || '23:59',
    title: map.spin_wheel_title || 'Spin & Win Real Rewards! 🎉',
    subtitle: map.spin_wheel_subtitle || 'Spin the wheel today and win exclusive discounts & gift rewards!',
    force_all_timestamp: map.spin_wheel_force_all_timestamp || null,
    min_orders: parseInt(map.spin_wheel_min_orders ?? '0', 10),
    active_from: map.spin_wheel_active_from || '',
    active_until: map.spin_wheel_active_until || '',
    total_spins: logsCountRes.rows[0]?.total_spins || 0,
    segments: segmentsRes.rows,
    user_targets: userTargetsRes.rows,
  });
};

const updateSettings = async (req, res) => {
  const {
    enabled,
    cooldown_hours,
    delay_seconds,
    max_per_day,
    start_time,
    end_time,
    require_login,
    time_slot_mode,
    morning_start,
    morning_end,
    evening_start,
    evening_end,
    night_start,
    night_end,
    title,
    subtitle,
  } = req.body;

  const updates = [
    ['spin_wheel_enabled', enabled === false ? 'false' : 'true'],
    ['spin_wheel_cooldown_hours', String(cooldown_hours ?? '24')],
    ['spin_wheel_delay_seconds', String(delay_seconds ?? '3')],
    ['spin_wheel_max_per_day', String(max_per_day ?? '1')],
    ['spin_wheel_start_time', start_time || '00:00'],
    ['spin_wheel_end_time', end_time || '23:59'],
    ['spin_wheel_require_login', require_login === false ? 'false' : 'true'],
    ['spin_wheel_time_slot', time_slot_mode || 'anytime'],
    ['spin_wheel_morning_start', morning_start || '06:00'],
    ['spin_wheel_morning_end', morning_end || '12:00'],
    ['spin_wheel_evening_start', evening_start || '16:00'],
    ['spin_wheel_evening_end', evening_end || '20:00'],
    ['spin_wheel_night_start', night_start || '20:00'],
    ['spin_wheel_night_end', night_end || '23:59'],
    ['spin_wheel_title', title || 'Spin & Win Real Rewards! 🎉'],
    ['spin_wheel_subtitle', subtitle || 'Spin the wheel today and win exclusive discounts & gift rewards!'],
  ];

  for (const [key, val] of updates) {
    await db.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, val]
    );
  }

  ok(res, { message: 'Settings updated successfully' });
};

// Dedicated handler for quick eligibility rules (min orders + active date range + spin limits)
const updatePermissionRules = async (req, res) => {
  const { min_orders, active_from, active_until, max_per_day, cooldown_hours } = req.body;

  const updates = [
    ['spin_wheel_min_orders', String(parseInt(min_orders ?? '0', 10))],
    ['spin_wheel_active_from', active_from || ''],
    ['spin_wheel_active_until', active_until || ''],
    ['spin_wheel_max_per_day', String(parseInt(max_per_day ?? '1', 10))],
    ['spin_wheel_cooldown_hours', String(parseFloat(cooldown_hours ?? '24'))],
  ];

  for (const [key, val] of updates) {
    await db.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, val]
    );
  }

  ok(res, { message: 'Permission rules updated successfully' });
};

const createSegment = async (req, res) => {
  const { label, type, value, coupon_code, color, text_color, probability, is_active, sort_order, target_user_type } = req.body;

  if (!label?.trim()) return badRequest(res, 'Label is required');
  if (!type) return badRequest(res, 'Prize type is required');

  const { rows } = await db.query(
    `INSERT INTO spin_wheel_segments
       (label, type, value, coupon_code, color, text_color, probability, is_active, sort_order, target_user_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      label.trim(),
      type,
      value ?? 0,
      coupon_code?.trim() || null,
      color || '#E91E8C',
      text_color || '#FFFFFF',
      probability ?? 10,
      is_active !== false,
      sort_order ?? 0,
      target_user_type || 'all',
    ]
  );

  ok(res, { segment: rows[0] });
};

const updateSegment = async (req, res) => {
  const { id } = req.params;
  const { label, type, value, coupon_code, color, text_color, probability, is_active, sort_order, target_user_type } = req.body;

  const { rows } = await db.query(
    `UPDATE spin_wheel_segments
     SET label = COALESCE($1, label),
         type = COALESCE($2, type),
         value = COALESCE($3, value),
         coupon_code = $4,
         color = COALESCE($5, color),
         text_color = COALESCE($6, text_color),
         probability = COALESCE($7, probability),
         is_active = COALESCE($8, is_active),
         sort_order = COALESCE($9, sort_order),
         target_user_type = COALESCE($10, target_user_type)
     WHERE id = $11
     RETURNING *`,
    [label, type, value, coupon_code || null, color, text_color, probability, is_active, sort_order, target_user_type, id]
  );

  if (rows.length === 0) return notFound(res, 'Segment not found');
  ok(res, { segment: rows[0] });
};

const deleteSegment = async (req, res) => {
  const { id } = req.params;
  const { rowCount } = await db.query('DELETE FROM spin_wheel_segments WHERE id = $1', [id]);
  if (!rowCount) return notFound(res, 'Segment not found');
  ok(res, { message: 'Segment deleted' });
};

const createUserTarget = async (req, res) => {
  const { user_id, phone, segment_id, custom_prize_label, custom_prize_type, custom_prize_value, custom_coupon_code } = req.body;

  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (!user_id && !cleanPhone) {
    return badRequest(res, 'User ID or Phone number is required');
  }

  const { rows } = await db.query(
    `INSERT INTO spin_wheel_user_targets
       (user_id, phone, segment_id, custom_prize_label, custom_prize_type, custom_prize_value, custom_coupon_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      user_id || null,
      cleanPhone || null,
      segment_id || null,
      custom_prize_label || null,
      custom_prize_type || 'coupon',
      custom_prize_value || 0,
      custom_coupon_code || null,
    ]
  );

  ok(res, { target: rows[0] });
};

const deleteUserTarget = async (req, res) => {
  const { id } = req.params;
  const { rowCount } = await db.query('DELETE FROM spin_wheel_user_targets WHERE id = $1', [id]);
  if (!rowCount) return notFound(res, 'User target rule not found');
  ok(res, { message: 'User target rule removed' });
};

// USER SPIN PERMISSION ENDPOINTS
const getUsersPermissions = async (req, res) => {
  const search = (req.query.search || '').trim();
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const offset = (page - 1) * limit;

  let queryStr = `
    SELECT u.id, u.name, u.email, u.phone, u.spin_wheel_enabled, u.force_spin_popup, u.created_at,
           COUNT(l.id)::int AS total_spins
    FROM users u
    LEFT JOIN spin_wheel_logs l ON (l.user_id = u.id OR (l.phone IS NOT NULL AND l.phone = u.phone))
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

const toggleUserSpinPermission = async (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;

  const { rows } = await db.query(
    `UPDATE users
     SET spin_wheel_enabled = COALESCE($1, NOT spin_wheel_enabled)
     WHERE id = $2
     RETURNING id, name, email, phone, spin_wheel_enabled`,
    [enabled !== undefined ? enabled : null, id]
  );

  if (rows.length === 0) return notFound(res, 'User not found');
  ok(res, { user: rows[0] });
};

const bulkToggleUserSpinPermission = async (req, res) => {
  const { user_ids, enabled } = req.body;

  if (enabled === undefined) return badRequest(res, 'enabled boolean is required');

  if (Array.isArray(user_ids) && user_ids.length > 0) {
    await db.query(
      'UPDATE users SET spin_wheel_enabled = $1 WHERE id = ANY($2::uuid[])',
      [enabled, user_ids]
    );
  } else {
    // Toggle for ALL users
    await db.query('UPDATE users SET spin_wheel_enabled = $1', [enabled]);
  }

  ok(res, { message: 'User spin permissions updated successfully' });
};

// FORCE POPUP ENDPOINTS
const forceUserSpinPopup = async (req, res) => {
  const { user_id, user_ids } = req.body;

  if (Array.isArray(user_ids) && user_ids.length > 0) {
    await db.query(
      'UPDATE users SET force_spin_popup = true, spin_wheel_enabled = true WHERE id = ANY($1::uuid[])',
      [user_ids]
    );
  } else if (user_id) {
    await db.query(
      'UPDATE users SET force_spin_popup = true, spin_wheel_enabled = true WHERE id = $1',
      [user_id]
    );
  } else {
    return badRequest(res, 'user_id or user_ids array is required');
  }

  ok(res, { message: 'Spin popup successfully forced for user(s)!' });
};

const forceAllUsersSpinPopup = async (_req, res) => {
  const nowIso = new Date().toISOString();

  await db.query(
    `INSERT INTO settings (key, value) VALUES ('spin_wheel_force_all_timestamp', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1`,
    [nowIso]
  );

  // Enable spin wheel globally if disabled
  await db.query(
    `INSERT INTO settings (key, value) VALUES ('spin_wheel_enabled', 'true')
     ON CONFLICT (key) DO UPDATE SET value = 'true'`
  );

  ok(res, { message: '⚡ Spin Wheel popup successfully forced for ALL users globally!' });
};

// CANCEL / UN-FORCE a pending force_spin_popup for specific users
const cancelForceUserSpinPopup = async (req, res) => {
  const { user_ids } = req.body;

  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return badRequest(res, 'user_ids array is required');
  }

  await db.query(
    'UPDATE users SET force_spin_popup = false WHERE id = ANY($1::uuid[])',
    [user_ids]
  );

  ok(res, { message: 'Pending forced popup cancelled for selected user(s).' });
};

const getLogs = async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const offset = (page - 1) * limit;

  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT l.*, u.name AS user_name, u.email AS user_email
       FROM spin_wheel_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ORDER BY l.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    db.query('SELECT COUNT(*)::int AS total FROM spin_wheel_logs'),
  ]);

  ok(res, {
    logs: rows,
    total: countRes.rows[0].total,
    page,
    limit,
  });
};

module.exports = {
  getConfig,
  updateSettings,
  updatePermissionRules,
  createSegment,
  updateSegment,
  deleteSegment,
  createUserTarget,
  deleteUserTarget,
  getUsersPermissions,
  toggleUserSpinPermission,
  bulkToggleUserSpinPermission,
  forceUserSpinPopup,
  forceAllUsersSpinPopup,
  cancelForceUserSpinPopup,
  getLogs,
};
