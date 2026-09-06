const db = require('../../../config/db');
const { ok } = require('../../../utils/response');

const list = async (req, res) => {
  const { search = '', category = '', date = '', page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR p.name ILIKE $${params.length})`);
  }
  if (category) {
    params.push(category);
    conditions.push(`cat.slug=$${params.length}`);
  }
  if (date) { params.push(date); conditions.push(`w.created_at::date = $${params.length}::date`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countParams = params.slice();
  params.push(limit, offset);

  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT w.id, w.created_at,
              u.id AS user_id, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
              p.id AS product_id, p.name AS product_name, p.price, p.offer_price,
              (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS image_url,
              cat.name AS category_name
       FROM wishlists w
       JOIN users u ON w.user_id=u.id
       JOIN products p ON w.product_id=p.id
       JOIN categories cat ON p.category_id=cat.id
       ${where}
       ORDER BY w.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    db.query(
      `SELECT COUNT(*) FROM wishlists w
       JOIN users u ON w.user_id=u.id
       JOIN products p ON w.product_id=p.id
       JOIN categories cat ON p.category_id=cat.id
       ${where}`,
      countParams
    ),
  ]);
  ok(res, { wishlists: rows, total: parseInt(countRes.rows[0].count) });
};

const remove = async (req, res) => {
  await db.query('DELETE FROM wishlists WHERE id=$1', [req.params.id]);
  ok(res, {}, 'Removed');
};

module.exports = { list, remove };
