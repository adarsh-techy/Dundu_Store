const db = require('../../../config/db');
const { ok, created, notFound, badRequest } = require('../../../utils/response');
const { getFileUrl } = require('../../../utils/upload');

const list = async (req, res) => {
  const {
    product_id,
    rating,
    type,
    search,
    sort = 'newest',
    page = 1,
    limit = 20,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];

  // Filter: specific product
  if (product_id) {
    params.push(product_id);
    conditions.push(`r.product_id = $${params.length}`);
  }

  // Filter: specific star rating (1-5)
  if (rating && !isNaN(parseInt(rating, 10))) {
    const star = parseInt(rating, 10);
    if (star >= 1 && star <= 5) {
      params.push(star);
      conditions.push(`r.rating = $${params.length}`);
    }
  }

  // Filter: type
  if (type === 'verified') {
    conditions.push(`(r.is_admin_created = false OR r.is_admin_created IS NULL)`);
  } else if (type === 'admin') {
    conditions.push(`r.is_admin_created = true`);
  } else if (type === 'with_photos') {
    conditions.push(`(r.image_url IS NOT NULL AND r.image_url != '')`);
  }

  // Filter: search keyword
  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    const pIdx = params.length;
    conditions.push(`(
      LOWER(COALESCE(r.reviewer_name, u.name, '')) LIKE $${pIdx} OR
      LOWER(COALESCE(r.review, '')) LIKE $${pIdx} OR
      LOWER(p.name) LIKE $${pIdx}
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countParams = [...params];

  // Sorting
  let orderBy = 'ORDER BY r.created_at DESC';
  if (sort === 'oldest') {
    orderBy = 'ORDER BY r.created_at ASC';
  } else if (sort === 'highest') {
    orderBy = 'ORDER BY r.rating DESC, r.created_at DESC';
  } else if (sort === 'lowest') {
    orderBy = 'ORDER BY r.rating ASC, r.created_at DESC';
  }

  params.push(limitNum, offset);

  // Overall stats (scoped to product_id if filtered, otherwise entire store)
  const statsWhere = product_id ? 'WHERE r.product_id = $1' : '';
  const statsParams = product_id ? [product_id] : [];

  const [{ rows }, countRes, statsRes] = await Promise.all([
    db.query(
      `SELECT r.*,
              p.name AS product_name,
              p.sku AS product_sku,
              (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) AS product_image,
              COALESCE(r.reviewer_name, u.name) AS user_name,
              u.email AS user_email,
              u.phone AS user_phone
       FROM reviews r
       JOIN products p ON r.product_id = p.id
       LEFT JOIN users u ON r.user_id = u.id
       ${whereClause}
       ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    db.query(
      `SELECT COUNT(*)::int AS filtered_total
       FROM reviews r
       JOIN products p ON r.product_id = p.id
       LEFT JOIN users u ON r.user_id = u.id
       ${whereClause}`,
      countParams
    ),
    db.query(
      `SELECT COUNT(*)::int AS total,
              COALESCE(AVG(rating),0)::numeric(10,2) AS avg_rating,
              COUNT(*) FILTER (WHERE rating=5)::int AS star5,
              COUNT(*) FILTER (WHERE rating=4)::int AS star4,
              COUNT(*) FILTER (WHERE rating=3)::int AS star3,
              COUNT(*) FILTER (WHERE rating=2)::int AS star2,
              COUNT(*) FILTER (WHERE rating=1)::int AS star1,
              COUNT(*) FILTER (WHERE is_admin_created = true)::int AS admin_count,
              COUNT(*) FILTER (WHERE is_admin_created = false OR is_admin_created IS NULL)::int AS verified_count,
              COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '')::int AS with_photos_count
       FROM reviews r
       ${statsWhere}`,
      statsParams
    ),
  ]);

  const s = statsRes.rows[0] || {};
  const filteredTotal = countRes.rows[0]?.filtered_total || 0;

  ok(res, {
    reviews: rows,
    total: filteredTotal,
    page: pageNum,
    limit: limitNum,
    stats: {
      total: s.total || 0,
      avg_rating: parseFloat(s.avg_rating || 0),
      admin_count: s.admin_count || 0,
      verified_count: s.verified_count || 0,
      with_photos_count: s.with_photos_count || 0,
      distribution: {
        5: s.star5 || 0,
        4: s.star4 || 0,
        3: s.star3 || 0,
        2: s.star2 || 0,
        1: s.star1 || 0,
      },
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

  let image_url = null;
  if (req.file) {
    image_url = getFileUrl(req.file);
  } else if (req.files && req.files.length) {
    image_url = getFileUrl(req.files[0]);
  } else if (req.body.image_url) {
    image_url = req.body.image_url;
  }

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

  let new_image_url;
  if (req.file) {
    new_image_url = getFileUrl(req.file);
  } else if (req.files && req.files.length) {
    new_image_url = getFileUrl(req.files[0]);
  } else if (image_url !== undefined) {
    new_image_url = image_url;
  }

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
