const db = require('../../config/db');
const { ok, created, notFound, badRequest } = require('../../utils/response');

const syncFromOrders = async (_req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
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
          FLOOR(o.total / 500) * 20                                     AS earned,
          FLOOR(COALESCE(o.loyalty_discount, 0) / 200) * 200            AS redeemed,
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
    `);
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
    [cleanPhone, name || null, parseInt(points), parseFloat(total_spent)]
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
  if (points !== undefined)             { vals.push(Math.max(0, parseInt(points)));                  updates.push(`points=$${vals.length}`); }
  else if (points_delta !== undefined)  { vals.push(Math.max(0, existing[0].points + parseInt(points_delta))); updates.push(`points=$${vals.length}`); }
  if (total_spent !== undefined)        { vals.push(parseFloat(total_spent));                        updates.push(`total_spent=$${vals.length}`); }

  if (!updates.length) return badRequest(res, 'Nothing to update');
  updates.push('updated_at=now()');
  vals.push(cleanPhone);
  const { rows } = await db.query(
    `UPDATE loyalty_cards SET ${updates.join(', ')} WHERE phone=$${vals.length} RETURNING *`,
    vals
  );
  ok(res, { card: rows[0] }, 'Loyalty card updated');
};

const remove = async (req, res) => {
  const cleanPhone = req.params.phone.replace(/\D/g, '');
  const { rowCount } = await db.query('DELETE FROM loyalty_cards WHERE phone=$1', [cleanPhone]);
  if (!rowCount) return notFound(res, 'Loyalty card not found');
  ok(res, {}, 'Loyalty card deleted');
};

module.exports = { syncFromOrders, list, create, update, remove };
