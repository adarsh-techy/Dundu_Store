const db = require('../../../config/db');
const { ok, created, badRequest } = require('../../../utils/response');

const getProductReviews = async (req, res) => {
  const { rows } = await db.query(
    `SELECT r.*,
       COALESCE(r.reviewer_name, u.name) AS user_name,
       u.avatar_url
     FROM reviews r
     LEFT JOIN users u ON r.user_id = u.id
     WHERE r.product_id = $1
     ORDER BY r.created_at DESC`,
    [req.params.id]
  );
  ok(res, { reviews: rows });
};

const canReview = async (req, res) => {
  const { id: product_id } = req.params;
  const user_id = req.user.id;

  const { rows: orderRows } = await db.query(
    `SELECT o.id FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'delivered'
     LIMIT 1`,
    [user_id, product_id]
  );

  const { rows: existingRows } = await db.query(
    `SELECT * FROM reviews WHERE user_id = $1 AND product_id = $2`,
    [user_id, product_id]
  );

  ok(res, {
    can_review: orderRows.length > 0,
    existing_review: existingRows[0] || null,
  });
};

const addReview = async (req, res) => {
  const { rating, review } = req.body;
  const product_id = req.params.id;
  const user_id = req.user.id;

  const { rows: orderRows } = await db.query(
    `SELECT o.id FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'delivered'
     LIMIT 1`,
    [user_id, product_id]
  );
  if (!orderRows.length) {
    return badRequest(res, 'You can only review products you have purchased and received');
  }

  const { getFileUrl } = require('../../../utils/upload');
  const image_url = req.files && req.files.length ? getFileUrl(req.files[0]) : null;

  const { rows } = await db.query(
    `INSERT INTO reviews (product_id, user_id, rating, review, image_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, product_id) WHERE user_id IS NOT NULL
     DO UPDATE SET rating = EXCLUDED.rating, review = EXCLUDED.review, image_url = COALESCE(EXCLUDED.image_url, reviews.image_url)
     RETURNING *`,
    [product_id, user_id, rating, review || null, image_url]
  );
  created(res, { review: rows[0] });
};

module.exports = { getProductReviews, canReview, addReview };
