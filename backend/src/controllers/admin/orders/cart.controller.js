const db = require('../../../config/db');
const { ok } = require('../../../utils/response');

const listCarts = async (req, res) => {
  const { abandoned, category, date, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = ['1=1'];

  if (abandoned === 'true') {
    conditions.push("c.updated_at < now() - interval '24 hours'");
  } else if (abandoned === 'false') {
    conditions.push("c.updated_at >= now() - interval '24 hours'");
  }

  if (category) {
    params.push(category);
    conditions.push(
      `c.user_id IN (SELECT DISTINCT c2.user_id FROM cart c2
                     JOIN products p ON c2.product_id=p.id
                     JOIN categories cat ON p.category_id=cat.id
                     WHERE cat.slug=$${params.length})`
    );
  }

  if (date) {
    params.push(date);
    conditions.push(`c.updated_at::date = $${params.length}::date`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(
      `(u.name ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR (u.email IS NOT NULL AND u.email ILIKE $${params.length}) OR p.name ILIKE $${params.length})`
    );
  }

  const where = conditions.join(' AND ');
  const countParams = params.slice();
  params.push(limit, offset);

  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT c.user_id, u.id AS user_id, u.name, u.phone, u.email,
              COUNT(c.id) AS items,
              COALESCE(SUM(c.quantity), 0) AS total_quantity,
              COALESCE(SUM(c.quantity * COALESCE(p.offer_price, p.price)), 0) AS cart_total,
              MAX(c.updated_at) AS last_active,
              (MAX(c.updated_at) < now() - interval '24 hours') AS is_abandoned,
              (
                SELECT json_agg(item_row)
                FROM (
                  SELECT c2.id, c2.quantity, p2.id AS product_id, p2.name AS product_name,
                         COALESCE(p2.offer_price, p2.price) AS unit_price,
                         (
                           SELECT pi.url FROM product_images pi
                           WHERE pi.product_id = p2.id AND pi.is_primary = true
                           LIMIT 1
                         ) AS product_image,
                         (
                           SELECT jsonb_build_object('size', pv.size, 'color', pv.color)
                           FROM product_variants pv WHERE pv.id = c2.variant_id
                         ) AS variant_info
                  FROM cart c2
                  JOIN products p2 ON c2.product_id = p2.id
                  WHERE c2.user_id = c.user_id
                  ORDER BY c2.updated_at DESC
                  LIMIT 6
                ) item_row
              ) AS items_preview
       FROM cart c
       JOIN users u ON c.user_id=u.id
       JOIN products p ON c.product_id=p.id
       WHERE ${where}
       GROUP BY c.user_id, u.id, u.name, u.phone, u.email
       ORDER BY last_active DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    db.query(
      `SELECT COUNT(*) FROM (
         SELECT c.user_id
         FROM cart c
         JOIN users u ON c.user_id=u.id
         JOIN products p ON c.product_id=p.id
         WHERE ${where}
         GROUP BY c.user_id
       ) sub`,
      countParams
    ),
  ]);

  ok(res, { carts: rows, total: parseInt(countRes.rows[0]?.count || 0, 10) });
};

module.exports = { listCarts };
