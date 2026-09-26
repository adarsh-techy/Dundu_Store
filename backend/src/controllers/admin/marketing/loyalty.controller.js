const db = require('../../../config/db');
const { ok, created, notFound, badRequest } = require('../../../utils/response');

const LOYALTY_KEYS = [
  'loyalty_program_enabled',
  'loyalty_earn_points',
  'loyalty_spend_amount',
  'loyalty_redeem_points',
  'loyalty_redeem_discount',
  'loyalty_min_order_earn',
  'loyalty_min_points_redeem',
  'loyalty_max_discount_per_order',
  'loyalty_welcome_bonus',
  'loyalty_terms',
];

const getConfig = async (_req, res) => {
  const { rows } = await db.query(
    `SELECT key, value FROM settings WHERE key = ANY($1)`,
    [LOYALTY_KEYS]
  );
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  ok(res, {
    config: {
      enabled: cfg.loyalty_program_enabled !== 'false',
      earn_points: parseInt(cfg.loyalty_earn_points || '20', 10),
      spend_amount: parseFloat(cfg.loyalty_spend_amount || '500'),
      redeem_points: parseInt(cfg.loyalty_redeem_points || '200', 10),
      redeem_discount: parseFloat(cfg.loyalty_redeem_discount || '200'),
      min_order_earn: parseFloat(cfg.loyalty_min_order_earn || '100'),
      min_points_redeem: parseInt(cfg.loyalty_min_points_redeem || '200', 10),
      max_discount_per_order: parseFloat(cfg.loyalty_max_discount_per_order || '1000'),
      welcome_bonus: parseInt(cfg.loyalty_welcome_bonus || '0', 10),
      terms: cfg.loyalty_terms || 'Earn 20 points for every ₹500 spent on Dundu Online. 200 points = ₹200 flat discount.',
    },
  });
};

const updateConfig = async (req, res) => {
  const {
    enabled,
    earn_points,
    spend_amount,
    redeem_points,
    redeem_discount,
    min_order_earn,
    min_points_redeem,
    max_discount_per_order,
    welcome_bonus,
    terms,
  } = req.body;

  const updates = [
    ['loyalty_program_enabled', enabled === false ? 'false' : 'true'],
    ['loyalty_earn_points', String(earn_points ?? 20)],
    ['loyalty_spend_amount', String(spend_amount ?? 500)],
    ['loyalty_redeem_points', String(redeem_points ?? 200)],
    ['loyalty_redeem_discount', String(redeem_discount ?? 200)],
    ['loyalty_min_order_earn', String(min_order_earn ?? 100)],
    ['loyalty_min_points_redeem', String(min_points_redeem ?? 200)],
    ['loyalty_max_discount_per_order', String(max_discount_per_order ?? 1000)],
    ['loyalty_welcome_bonus', String(welcome_bonus ?? 0)],
    ['loyalty_terms', String(terms || '')],
  ];

  for (const [key, val] of updates) {
    await db.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, val]
    );
  }

  ok(res, { message: 'Loyalty program settings and rules updated successfully!' });
};

const syncFromOrders = async (_req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows: settingRows } = await client.query(
      "SELECT key, value FROM settings WHERE key IN ('loyalty_earn_points','loyalty_spend_amount','loyalty_redeem_points','loyalty_redeem_discount')"
    );
    const smap = Object.fromEntries(settingRows.map((r) => [r.key, r.value]));
    const earnPts = parseInt(smap.loyalty_earn_points || '20', 10);
    const spendAmt = parseFloat(smap.loyalty_spend_amount || '500');
    const redeemPts = parseInt(smap.loyalty_redeem_points || '200', 10);
    const redeemDisc = parseFloat(smap.loyalty_redeem_discount || '200');

    await client.query(`
      INSERT INTO loyalty_cards (phone, name, points, total_spent)
      SELECT
        phone,
        MAX(name) AS name,
        GREATEST(0, SUM(earned) - SUM(redeemed)) AS points,
        SUM(spent) AS total_spent
      FROM (
        SELECT
          REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g') AS phone,
          u.name,
          FLOOR(o.total / $1) * $2                                      AS earned,
          FLOOR(COALESCE(o.loyalty_discount, 0) / $3) * $4             AS redeemed,
          o.total                                                        AS spent
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.payment_status = 'paid'
          AND u.phone IS NOT NULL
          AND REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g') != ''
      ) all_orders
      GROUP BY phone
      ON CONFLICT (phone) DO UPDATE SET
        name        = COALESCE(EXCLUDED.name, loyalty_cards.name),
        points      = EXCLUDED.points,
        total_spent = EXCLUDED.total_spent,
        updated_at  = now()
    `, [spendAmt, earnPts, redeemDisc, redeemPts]);
    await client.query('COMMIT');
    const { rows } = await db.query('SELECT COUNT(*) FROM loyalty_cards');
    ok(res, { total: parseInt(rows[0].count) }, 'Loyalty cards synced from order history');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const list = async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = search ? [`%${search}%`, parseInt(limit), offset] : [parseInt(limit), offset];
  const where = search ? 'WHERE lc.phone ILIKE $1 OR lc.name ILIKE $1' : '';
  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT lc.*,
              (SELECT u.id FROM users u
               WHERE REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g') = lc.phone
               LIMIT 1) AS user_id,
              EXISTS(
                SELECT 1 FROM users u
                WHERE REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g') = lc.phone
              ) AS has_account
       FROM loyalty_cards lc
       ${where}
       ORDER BY lc.points DESC, lc.updated_at DESC
       LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}`,
      params
    ),
    db.query(
      `SELECT COUNT(*) FROM loyalty_cards ${search ? 'WHERE phone ILIKE $1 OR name ILIKE $1' : ''}`,
      search ? [`%${search}%`] : []
    ),
  ]);
  ok(res, { cards: rows, total: parseInt(countRes.rows[0].count) });
};

const create = async (req, res) => {
  const { phone, name, points = 0, total_spent = 0 } = req.body;
  if (!phone) return badRequest(res, 'Phone is required');
  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) return badRequest(res, 'Invalid phone number');
  const { rows } = await db.query(
    `INSERT INTO loyalty_cards (phone, name, points, total_spent)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (phone) DO UPDATE SET
       name        = COALESCE(EXCLUDED.name, loyalty_cards.name),
       points      = EXCLUDED.points,
       total_spent = EXCLUDED.total_spent,
       updated_at  = now()
     RETURNING *`,
    [cleanPhone, name || null, Math.max(0, parseInt(points, 10) || 0), Math.max(0, parseFloat(total_spent) || 0)]
  );
  ok(res, { card: rows[0] }, 'Loyalty card saved');
};

const update = async (req, res) => {
  const cleanPhone = req.params.phone.replace(/\D/g, '');
  const { name, points_delta, points, total_spent } = req.body;
  const { rows: existing } = await db.query('SELECT * FROM loyalty_cards WHERE phone=$1', [cleanPhone]);
  if (!existing.length) return notFound(res, 'Loyalty card not found');

  const updates = [];
  const vals = [];
  if (name !== undefined)               { vals.push(name);                                          updates.push(`name=$${vals.length}`); }
  if (points !== undefined)             { vals.push(Math.max(0, parseInt(points, 10) || 0));                  updates.push(`points=$${vals.length}`); }
  else if (points_delta !== undefined)  { vals.push(Math.max(0, existing[0].points + (parseInt(points_delta, 10) || 0))); updates.push(`points=$${vals.length}`); }
  if (total_spent !== undefined)        { vals.push(Math.max(0, parseFloat(total_spent) || 0));                        updates.push(`total_spent=$${vals.length}`); }

  if (!updates.length) return badRequest(res, 'Nothing to update');
  updates.push('updated_at=now()');
  vals.push(cleanPhone);
  const { rows } = await db.query(
    `UPDATE loyalty_cards SET ${updates.join(', ')} WHERE phone=$${vals.length} RETURNING *`,
    vals
  );
  ok(res, { card: rows[0] }, 'Loyalty card updated');
};

const adjustPoints = async (req, res) => {
  const cleanPhone = req.params.phone.replace(/\D/g, '');
  const { delta, reason } = req.body;

  if (delta === undefined || isNaN(delta)) {
    return badRequest(res, 'Valid points delta is required');
  }

  const { rows: existing } = await db.query('SELECT * FROM loyalty_cards WHERE phone=$1', [cleanPhone]);
  if (!existing.length) return notFound(res, 'Loyalty card not found');

  const currentPoints = parseInt(existing[0].points || 0);
  const newPoints = Math.max(0, currentPoints + parseInt(delta));

  const { rows } = await db.query(
    `UPDATE loyalty_cards SET points = $1, updated_at = now() WHERE phone = $2 RETURNING *`,
    [newPoints, cleanPhone]
  );

  ok(res, {
    card: rows[0],
    message: `Adjusted points by ${delta > 0 ? '+' + delta : delta} points. New balance: ${newPoints} pts`,
  });
};

const remove = async (req, res) => {
  const cleanPhone = req.params.phone.replace(/\D/g, '');
  const { rowCount } = await db.query('DELETE FROM loyalty_cards WHERE phone=$1', [cleanPhone]);
  if (!rowCount) return notFound(res, 'Loyalty card not found');
  ok(res, {}, 'Loyalty card deleted');
};

module.exports = {
  getConfig,
  updateConfig,
  syncFromOrders,
  list,
  create,
  update,
  adjustPoints,
  remove,
};
