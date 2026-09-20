const db = require('../../../config/db');
const { ok, created, notFound, badRequest, error } = require('../../../utils/response');
const { getFileUrl } = require('../../../utils/upload');

const list = async (req, res) => {
  const { page = 1, limit = 20, search, category, show_hidden, new_arrival } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (show_hidden !== 'true') conditions.push('p.is_hidden = false');

  if (search)   { params.push(`%${search}%`); conditions.push(`p.name ILIKE $${params.length}`); }
  if (category) { params.push(category);       conditions.push(`c.slug = $${params.length}`); }
  if (new_arrival === 'true')  conditions.push('p.is_new_arrival = true');
  if (new_arrival === 'false') conditions.push('p.is_new_arrival = false');

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countParams = params.slice();
  params.push(limit, offset);

  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT p.*, c.name AS category_name, b.name AS brand_name,
              (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS primary_image
       FROM products p
       JOIN categories c ON p.category_id=c.id
       LEFT JOIN brands b ON p.brand_id=b.id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    db.query(
      `SELECT COUNT(*) FROM products p JOIN categories c ON p.category_id=c.id ${where}`,
      countParams
    ),
  ]);
  ok(res, { products: rows, total: parseInt(countRes.rows[0].count) });
};

const create = async (req, res) => {
  const {
    category_id, brand_id, name, description, material, type, gender, age_group,
    cost_price, price, offer_price, stock, sku, product_code, variants, reviews, sub_category, pattern, default_rating,
  } = req.body;

  let imageColors = [];
  try { imageColors = JSON.parse(req.body.image_colors || '[]'); } catch (_) {}
  const primaryIdx = req.body.primary_index !== undefined ? parseInt(req.body.primary_index) : 0;

  // req.files is a flat list from upload.any() — split back out by which
  // form field each file was attached under (product photos vs. review photos).
  const productFiles = (req.files || []).filter((f) => f.fieldname === 'images');
  const reviewFiles = (req.files || []).filter((f) => f.fieldname === 'review_images');

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO products (category_id, brand_id, name, description, material, type, gender, age_group,
                             cost_price, price, offer_price, stock, sku, product_code, sub_category, pattern, default_rating)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [category_id, brand_id || null, name, description, material, type, gender, age_group,
        cost_price || null, price, offer_price || null, stock || 0, sku || null, product_code || null,
        sub_category || null, pattern || null, default_rating || null]
    );
    const product = rows[0];

    if (productFiles.length) {
      for (let i = 0; i < productFiles.length; i++) {
        const color = imageColors[i] || null;
        await client.query(
          'INSERT INTO product_images (product_id, url, is_primary, sort_order, color) VALUES ($1,$2,$3,$4,$5)',
          [product.id, getFileUrl(productFiles[i]), i === primaryIdx, i, color]
        );
      }
    }

    if (variants?.length) {
      const parsed = typeof variants === 'string' ? JSON.parse(variants) : variants;
      for (const v of parsed) {
        await client.query(
          'INSERT INTO product_variants (product_id, size, color, stock, sku) VALUES ($1,$2,$3,$4,$5)',
          [product.id, v.size || null, v.color || null, v.stock || 0, v.sku || null]
        );
      }
      await client.query(
        'UPDATE products SET stock=(SELECT COALESCE(SUM(stock),0) FROM product_variants WHERE product_id=$1) WHERE id=$1',
        [product.id]
      );
    }

    if (reviews) {
      const parsedReviews = typeof reviews === 'string' ? JSON.parse(reviews) : reviews;
      let reviewFileIdx = 0;
      for (const r of parsedReviews) {
        // Each review that had a photo attached client-side consumes the next
        // file in reviewFiles, in the same order the reviews array was built.
        const reviewImageUrl = r.has_image && reviewFiles[reviewFileIdx]
          ? getFileUrl(reviewFiles[reviewFileIdx++])
          : null;

        const reviewerName = (r.reviewer_name || '').trim();
        const rating = Math.min(5, Math.max(1, parseInt(r.rating, 10) || 0));
        if (!reviewerName || !rating) continue; // skip incomplete rows rather than fail the whole product save
        await client.query(
          `INSERT INTO reviews (product_id, user_id, reviewer_name, rating, review, is_admin_created, image_url)
           VALUES ($1, NULL, $2, $3, $4, true, $5)`,
          [product.id, reviewerName, rating, r.review?.trim() || null, reviewImageUrl]
        );
      }
    }

    await client.query('COMMIT');
    created(res, { product });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505' && err.constraint === 'products_product_code_key') {
      return badRequest(res, `Product code "${product_code}" already exists. Change it and try again.`);
    }
    error(res, err.message || 'Failed to create product');
  } finally {
    client.release();
  }
};

const update = async (req, res) => {
  const {
    category_id, brand_id, name, description, material, type, gender, age_group,
    cost_price, price, offer_price, stock, sku, product_code, variants, sub_category, pattern, default_rating,
  } = req.body;

  let imageColors = [];
  try { imageColors = JSON.parse(req.body.image_colors || '[]'); } catch (_) {}
  const primaryIdx = req.body.primary_index !== undefined ? parseInt(req.body.primary_index) : -1;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const updateParams = [category_id, brand_id || null, name, description, material, type, gender, age_group,
      cost_price || null, price, offer_price || null, stock, sku || null, product_code || null,
      sub_category || null, pattern || null, default_rating || null, req.params.id];

    const { rows } = await client.query(
      `UPDATE products SET
         category_id=$1, brand_id=$2, name=$3, description=$4, material=$5, type=$6,
         gender=$7, age_group=$8, cost_price=$9, price=$10, offer_price=$11, stock=$12, sku=$13, product_code=$14,
         sub_category=$15, pattern=$16, default_rating=$17, updated_at=now()
       WHERE id=$18 RETURNING *`,
      updateParams
    );
    if (!rows.length) { await client.query('ROLLBACK'); return notFound(res); }

    if (req.files?.length) {
      const { rows: existing } = await client.query(
        'SELECT COUNT(*) FROM product_images WHERE product_id=$1', [req.params.id]
      );
      const offset = parseInt(existing[0].count);
      const newPrimaryIdx = primaryIdx >= 0 && primaryIdx < req.files.length ? primaryIdx : -1;
      if (newPrimaryIdx >= 0) {
        await client.query('UPDATE product_images SET is_primary=false WHERE product_id=$1', [req.params.id]);
      }
      for (let i = 0; i < req.files.length; i++) {
        const color = imageColors[i] || null;
        const isPrimary = newPrimaryIdx >= 0 ? i === newPrimaryIdx : (offset === 0 && i === 0);
        await client.query(
          'INSERT INTO product_images (product_id, url, is_primary, sort_order, color) VALUES ($1,$2,$3,$4,$5)',
          [req.params.id, getFileUrl(req.files[i]), isPrimary, offset + i, color]
        );
      }
    }

    if (variants !== undefined) {
      const parsed = typeof variants === 'string' ? JSON.parse(variants) : variants;
      await client.query('DELETE FROM product_variants WHERE product_id=$1', [req.params.id]);
      for (const v of parsed) {
        await client.query(
          'INSERT INTO product_variants (product_id, size, color, stock, sku) VALUES ($1,$2,$3,$4,$5)',
          [req.params.id, v.size || null, v.color || null, v.stock || 0, v.sku || null]
        );
      }
      await client.query(
        'UPDATE products SET stock=(SELECT COALESCE(SUM(stock),0) FROM product_variants WHERE product_id=$1) WHERE id=$1',
        [req.params.id]
      );
    }

    await client.query('COMMIT');
    ok(res, { product: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505' && err.constraint === 'products_product_code_key') {
      return badRequest(res, `Product code "${product_code}" already exists. Change it and try again.`);
    }
    error(res, err.message || 'Failed to update product');
  } finally {
    client.release();
  }
};

const remove = async (req, res) => {
  const { id } = req.params;

  const { rows } = await db.query(
    'SELECT 1 FROM order_items WHERE product_id=$1 LIMIT 1', [id]
  );

  if (rows.length > 0) {
    await db.query('UPDATE products SET is_hidden=true, updated_at=now() WHERE id=$1', [id]);
    return ok(res, { soft_deleted: true }, 'Product hidden (has order history — cannot be permanently deleted)');
  }

  await db.query('DELETE FROM product_images WHERE product_id=$1', [id]);
  await db.query('DELETE FROM product_variants WHERE product_id=$1', [id]);
  await db.query('DELETE FROM products WHERE id=$1', [id]);
  ok(res, { soft_deleted: false }, 'Product deleted');
};

const getOne = async (req, res) => {
  const { rows } = await db.query(
    `SELECT p.*, c.name AS category_name, b.name AS brand_name
     FROM products p
     JOIN categories c ON p.category_id=c.id
     LEFT JOIN brands b ON p.brand_id=b.id
     WHERE p.id=$1`,
    [req.params.id]
  );
  if (!rows.length) return notFound(res, 'Product not found');
  const [images, variants] = await Promise.all([
    db.query('SELECT * FROM product_images WHERE product_id=$1 ORDER BY is_primary DESC, sort_order', [req.params.id]),
    db.query('SELECT * FROM product_variants WHERE product_id=$1', [req.params.id]),
  ]);
  ok(res, { product: { ...rows[0], images: images.rows, variants: variants.rows } });
};

const getAnalytics = async (req, res) => {
  const { id } = req.params;

  const { rows: prows } = await db.query(
    `SELECT p.*, c.name AS category_name, b.name AS brand_name
     FROM products p
     JOIN categories c ON p.category_id=c.id
     LEFT JOIN brands b ON p.brand_id=b.id
     WHERE p.id=$1`, [id]
  );
  if (!prows.length) return notFound(res, 'Product not found');

  const [imagesRes, variantsRes, statsRes, monthlySalesRes, ordersRes] = await Promise.all([
    db.query(
      'SELECT * FROM product_images WHERE product_id=$1 ORDER BY is_primary DESC, sort_order', [id]
    ),
    db.query(
      'SELECT * FROM product_variants WHERE product_id=$1 ORDER BY size, color', [id]
    ),
    db.query(`
      SELECT
        COUNT(DISTINCT o.id)::int AS total_orders,
        COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('return_requested','returned'))::int AS return_orders,
        COALESCE(SUM(oi.quantity) FILTER (WHERE o.status IN ('return_requested','returned')), 0)::int AS returned_units
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = $1 AND o.status != 'cancelled'
    `, [id]),
    db.query(`
      SELECT TO_CHAR(o.created_at, 'YYYY-MM') AS month,
             SUM(oi.quantity)::int             AS units
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = $1
        AND o.status NOT IN ('cancelled')
        AND o.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month
    `, [id]),
    db.query(`
      SELECT u.name AS customer_name, u.phone AS customer_phone,
             o.id AS order_id, o.status, o.created_at AS order_date,
             CASE WHEN o.status IN ('return_requested','returned') THEN o.updated_at END AS return_date,
             oi.quantity,
             pv.size, pv.color
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      WHERE oi.product_id = $1
      ORDER BY o.created_at DESC
      LIMIT 100
    `, [id]),
  ]);

  ok(res, {
    product:       { ...prows[0], images: imagesRes.rows, variants: variantsRes.rows },
    stats:         statsRes.rows[0],
    monthly_sales: monthlySalesRes.rows,
    orders:        ordersRes.rows,
  });
};

const getNextCode = async (req, res) => {
  const { category_id } = req.query;
  if (!category_id) return badRequest(res, 'category_id required');
  const cat = await db.query('SELECT name FROM categories WHERE id=$1', [category_id]);
  if (!cat.rows.length) return notFound(res, 'Category not found');
  const prefix = (cat.rows[0].name.replace(/[^a-zA-Z]/g, '') || 'PROD').substring(0, 3).toUpperCase();
  const { rows } = await db.query('SELECT COUNT(*) FROM products WHERE category_id=$1', [category_id]);
  let n = parseInt(rows[0].count) + 1;
  let code = `${prefix}-${String(n).padStart(3, '0')}`;
  while (true) {
    const { rows: taken } = await db.query('SELECT 1 FROM products WHERE product_code=$1', [code]);
    if (!taken.length) break;
    n++;
    code = `${prefix}-${String(n).padStart(3, '0')}`;
  }
  ok(res, { code });
};

const deleteImage = async (req, res) => {
  await db.query('DELETE FROM product_images WHERE id=$1 AND product_id=$2', [req.params.imageId, req.params.id]);
  ok(res, {}, 'Image deleted');
};

const setPrimaryImage = async (req, res) => {
  await db.query('UPDATE product_images SET is_primary=false WHERE product_id=$1', [req.params.id]);
  await db.query('UPDATE product_images SET is_primary=true WHERE id=$1 AND product_id=$2', [req.params.imageId, req.params.id]);
  ok(res, {}, 'Primary image updated');
};

const toggleFlag = (flag) => async (req, res) => {
  const { rows } = await db.query(`SELECT ${flag} FROM products WHERE id=$1`, [req.params.id]);
  if (!rows.length) return notFound(res);
  await db.query(`UPDATE products SET ${flag}=$1, updated_at=now() WHERE id=$2`, [!rows[0][flag], req.params.id]);
  ok(res, { [flag]: !rows[0][flag] });
};

module.exports = {
  list, getOne, getAnalytics, getNextCode, create, update, remove,
  deleteImage, setPrimaryImage,
  toggleHidden: toggleFlag('is_hidden'),
  toggleFeatured: toggleFlag('is_featured'),
  toggleOffer: toggleFlag('is_offer_product'),
  toggleNewArrival: toggleFlag('is_new_arrival'),
};
