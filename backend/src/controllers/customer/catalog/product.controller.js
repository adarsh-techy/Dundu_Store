const db = require('../../../config/db');
const { ok, created, notFound } = require('../../../utils/response');

const list = async (req, res) => {
  const { category, search, featured, offer, new_arrival, color, type, material, sort,
          min_price, max_price, gender, sub_category, in_stock, age_group, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = ['p.is_hidden = false'];
  const params = [];

  if (category)     { params.push(category);              conditions.push(`c.slug = $${params.length}`); }
  if (search)       { params.push(`%${search}%`);         conditions.push(`p.name ILIKE $${params.length}`); }
  if (featured === 'true')     conditions.push('p.is_featured = true');
  if (offer === 'true')        conditions.push('p.is_offer_product = true');
  if (new_arrival === 'true')  conditions.push('p.is_new_arrival = true');
  if (type)         { params.push(type);                  conditions.push(`LOWER(p.type) = LOWER($${params.length})`); }
  if (material)     { params.push(material);              conditions.push(`LOWER(p.material) = LOWER($${params.length})`); }
  if (color)        { params.push(color);                 conditions.push(`EXISTS (SELECT 1 FROM product_variants WHERE product_id = p.id AND LOWER(color) = LOWER($${params.length}))`); }
  if (gender)       { params.push(gender);                conditions.push(`LOWER(p.gender) = LOWER($${params.length})`); }
  if (sub_category) { params.push(sub_category);          conditions.push(`p.sub_category = $${params.length}`); }
  if (age_group)    { params.push(`%${age_group}%`);      conditions.push(`p.age_group ILIKE $${params.length}`); }
  if (in_stock === 'true') conditions.push('p.stock > 0');
  if (min_price)    { params.push(parseFloat(min_price)); conditions.push(`COALESCE(p.offer_price, p.price) >= $${params.length}`); }
  if (max_price)    { params.push(parseFloat(max_price)); conditions.push(`COALESCE(p.offer_price, p.price) <= $${params.length}`); }

  const orderBy = sort === 'price_asc'
    ? 'COALESCE(p.offer_price, p.price) ASC'
    : sort === 'price_desc'
    ? 'COALESCE(p.offer_price, p.price) DESC'
    : 'p.created_at DESC';

  const where = conditions.join(' AND ');

  const userId = req.user?.id || null;
  const wishlistParamIdx = userId ? params.length + 1 : null;
  if (userId) params.push(userId);
  params.push(limit, offset);

  const wishlistExpr = wishlistParamIdx
    ? `EXISTS (SELECT 1 FROM wishlists WHERE product_id=p.id AND user_id=$${wishlistParamIdx}) AS is_wishlisted`
    : `false AS is_wishlisted`;

  const { rows } = await db.query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug, b.name AS brand_name,
            (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS primary_image,
            COALESCE(AVG(r.rating),0) AS avg_rating, COUNT(r.id) AS review_count,
            ${wishlistExpr}
     FROM products p
     JOIN categories c ON p.category_id=c.id
     LEFT JOIN brands b ON p.brand_id=b.id
     LEFT JOIN reviews r ON r.product_id=p.id
     WHERE ${where}
     GROUP BY p.id, c.name, c.slug, b.name
     ORDER BY ${orderBy}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  ok(res, { products: rows });
};

const getOne = async (req, res) => {
  const userId = req.user?.id || null;
  const wishlistExpr = userId
    ? `EXISTS (SELECT 1 FROM wishlists WHERE product_id=p.id AND user_id=$2) AS is_wishlisted`
    : `false AS is_wishlisted`;
  const params = userId ? [req.params.id, userId] : [req.params.id];

  const { rows } = await db.query(
    `SELECT p.*, c.name AS category_name, b.name AS brand_name,
            COALESCE(AVG(r.rating),0) AS avg_rating, COUNT(r.id) AS review_count,
            ${wishlistExpr}
     FROM products p
     JOIN categories c ON p.category_id=c.id
     LEFT JOIN brands b ON p.brand_id=b.id
     LEFT JOIN reviews r ON r.product_id=p.id
     WHERE p.id=$1 AND p.is_hidden=false
     GROUP BY p.id, c.name, b.name`,
    params
  );
  if (!rows.length) return notFound(res, 'Product not found');

  if (userId) {
    db.query('INSERT INTO product_views (user_id, product_id) VALUES ($1,$2)', [userId, req.params.id]).catch(() => {});
  }

  const [images, variants] = await Promise.all([
    db.query('SELECT * FROM product_images WHERE product_id=$1 ORDER BY is_primary DESC, sort_order', [req.params.id]),
    db.query('SELECT * FROM product_variants WHERE product_id=$1', [req.params.id]),
  ]);

  ok(res, { product: { ...rows[0], images: images.rows, variants: variants.rows } });
};

const getRelated = async (req, res) => {
  const { rows: product } = await db.query('SELECT category_id FROM products WHERE id=$1', [req.params.id]);
  if (!product.length) return notFound(res);

  const userId = req.user?.id || null;
  const wishlistExpr = userId
    ? `EXISTS (SELECT 1 FROM wishlists WHERE product_id=p.id AND user_id=$3) AS is_wishlisted`
    : `false AS is_wishlisted`;
  const params = userId
    ? [product[0].category_id, req.params.id, userId]
    : [product[0].category_id, req.params.id];

  const { rows } = await db.query(
    `SELECT p.*, (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS primary_image,
            ${wishlistExpr}
     FROM products p
     WHERE p.category_id=$1 AND p.id<>$2 AND p.is_hidden=false
     ORDER BY RANDOM() LIMIT 8`,
    params
  );
  ok(res, { products: rows });
};

const getFilters = async (req, res) => {
  const { category } = req.query;

  const catJoin  = category ? `JOIN categories c ON p.category_id = c.id` : '';
  const catWhere = category ? `AND c.slug = $1` : '';
  const params   = category ? [category] : [];

  const [types, materials, ageGroups, catsRes] = await Promise.all([
    db.query(`SELECT DISTINCT p.type AS value
              FROM products p ${catJoin}
              WHERE p.type IS NOT NULL AND p.type <> '' AND p.is_hidden = false ${catWhere}
              ORDER BY value`, params),
    db.query(`SELECT name AS value FROM product_materials WHERE is_active = true ORDER BY sort_order, name`),
    db.query(`SELECT DISTINCT p.age_group AS value
              FROM products p ${catJoin}
              WHERE p.age_group IS NOT NULL AND p.age_group <> '' AND p.is_hidden = false ${catWhere}
              ORDER BY value`, params),
    db.query(`SELECT sub_categories FROM categories WHERE is_active = true`),
  ]);

  const subCatSet = new Set();
  catsRes.rows.forEach((row) => {
    let arr = row.sub_categories;
    if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch { arr = []; } }
    if (Array.isArray(arr)) {
      arr.filter((s) => s.is_active && s.name).forEach((s) => subCatSet.add(s.name));
    }
  });

  ok(res, {
    types:          types.rows.map((r) => r.value),
    materials:      materials.rows.map((r) => r.value),
    age_groups:     ageGroups.rows.map((r) => r.value),
    sub_categories: [...subCatSet].sort(),
  });
};

module.exports = { list, getOne, getRelated, getFilters };
