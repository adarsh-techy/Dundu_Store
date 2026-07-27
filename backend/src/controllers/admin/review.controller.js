const db = require('../../config/db');
const { ok, created, notFound, badRequest } = require('../../utils/response');

const list = async (req, res) => {
  const { product_id, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const filter = product_id ? 'WHERE r.product_id=$1' : '';
  const params = product_id ? [product_id] : [];
  const countParams = params.slice();
  params.push(limit, offset);

  const [{ rows }, statsRes] = await Promise.all([
    db.query(
      `SELECT r.*, p.name AS product_name, COALESCE(r.reviewer_name, u.name) AS user_name
       FROM reviews r
       JOIN products p ON r.product_id = p.id
       LEFT JOIN users u ON r.user_id = u.id
       ${filter}
       ORDER BY r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    db.query(
      `SELECT COUNT(*)::int AS total,
              COALESCE(AVG(rating),0)::numeric(10,2) AS avg_rating,
              COUNT(*) FILTER (WHERE rating=5)::int AS star5,
              COUNT(*) FILTER (WHERE rating=4)::int AS star4,
              COUNT(*) FILTER (WHERE rating=3)::int AS star3,
              COUNT(*) FILTER (WHERE rating=2)::int AS star2,
              COUNT(*) FILTER (WHERE rating=1)::int AS star1
       FROM reviews r
       ${filter}`,
      countParams
    ),
  ]);

  const s = statsRes.rows[0];
  ok(res, {
    reviews: rows,
    total: s.total,
    stats: {
      total: s.total,
      avg_rating: parseFloat(s.avg_rating),
      distribution: { 5: s.star5, 4: s.star4, 3: s.star3, 2: s.star2, 1: s.star1 },
    },
  });
};

const create = async (req, res) => {
  const { product_id, reviewer_name, rating, review } = req.body;
  if (!product_id || !reviewer_name?.trim() || !rating) {
    return badRequest(res, 'product_id, reviewer_name and rating are required');
  }
  const r = parseInt(rating, 10);
  if (isNaN(r) || r < 1 || r > 5) return badRequest(res, 'Rating must be 1–5');

  const { getFileUrl } = require('../../utils/upload');
  const image_url = req.files && req.files.length ? getFileUrl(req.files[0]) : null;

  const { rows } = await db.query(
    `INSERT INTO reviews (product_id, user_id, reviewer_name, rating, review, is_admin_created, image_url)
     VALUES ($1, NULL, $2, $3, $4, true, $5) RETURNING *`,
    [product_id, reviewer_name.trim(), r, review?.trim() || null, image_url]
  );
  created(res, { review: rows[0] });
};

const update = async (req, res) => {
  const { reviewer_name, rating, review, image_url } = req.body;
  if (!reviewer_name?.trim() || !rating) return badRequest(res, 'reviewer_name and rating are required');
  const r = parseInt(rating, 10);
  if (isNaN(r) || r < 1 || r > 5) return badRequest(res, 'Rating must be 1–5');

  const { getFileUrl } = require('../../utils/upload');
  const new_image_url = req.files && req.files.length ? getFileUrl(req.files[0]) : (image_url !== undefined ? image_url : undefined);

  const updateFields = ['reviewer_name=$1', 'rating=$2', 'review=$3'];
  const params = [reviewer_name.trim(), r, review?.trim() || null];

  if (new_image_url !== undefined) {
    updateFields.push(`image_url=$${params.length + 1}`);
    params.push(new_image_url);
  }

  params.push(req.params.id);
  const { rows } = await db.query(
    `UPDATE reviews SET ${updateFields.join(', ')} WHERE id=$${params.length} RETURNING *`,
    params
  );
  if (!rows.length) return notFound(res, 'Review not found');
  ok(res, { review: rows[0] });
};

const remove = async (req, res) => {
  await db.query('DELETE FROM reviews WHERE id=$1', [req.params.id]);
  ok(res, { message: 'Review deleted' });
};

module.exports = { list, create, update, remove };
