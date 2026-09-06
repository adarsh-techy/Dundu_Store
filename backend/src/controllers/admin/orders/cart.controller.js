const db = require('../../../config/db');
const { ok } = require('../../../utils/response');

const listCarts = async (req, res) => {
  const { abandoned, category, date, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = ['1=1'];

  if (abandoned === 'true') conditions.push("c.updated_at < now() - interval '24 hours'");
  if (category) {
    params.push(category);
    conditions.push(
      `c.user_id IN (SELECT DISTINCT c2.user_id FROM cart c2
                     JOIN products p ON c2.product_id=p.id
                     JOIN categories cat ON p.category_id=cat.id
                     WHERE cat.slug=$${params.length})`
    );
  }
  if (date) { params.push(date); conditions.push(`c.updated_at::date = $${params.length}::date`); }

  const where = conditions.join(' AND ');
  const countParams = params.slice();
  params.push(limit, offset);

  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT c.user_id, u.id AS user_id, u.name, u.phone, COUNT(c.id) AS items, MAX(c.updated_at) AS last_active
       FROM cart c JOIN users u ON c.user_id=u.id
       WHERE ${where}
       GROUP BY c.user_id, u.id, u.name, u.phone
       ORDER BY last_active DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    db.query(
      `SELECT COUNT(*) FROM (
         SELECT c.user_id FROM cart c JOIN users u ON c.user_id=u.id
         WHERE ${where}
         GROUP BY c.user_id
       ) sub`,
      countParams
    ),
  ]);
  ok(res, { carts: rows, total: parseInt(countRes.rows[0].count) });
};

module.exports = { listCarts };
