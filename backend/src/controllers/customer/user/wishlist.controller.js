const db = require('../../../config/db');
const { ok, badRequest } = require('../../../utils/response');

const getWishlist = async (req, res) => {
  const { rows } = await db.query(
    `SELECT w.id, p.id AS product_id, p.id, p.name, p.price, p.offer_price,
            (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS image,
            true AS is_wishlisted
     FROM wishlists w
     JOIN products p ON w.product_id=p.id
     WHERE w.user_id=$1
     ORDER BY w.created_at DESC`,
    [req.user.id]
  );
  ok(res, { wishlist: rows, products: rows });
};

const toggleWishlist = async (req, res) => {
  const productId = req.body?.product_id || req.body?.productId || req.params?.product_id;

  if (!productId) {
    return badRequest(res, 'Product ID is required');
  }

  const { rows } = await db.query(
    'SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2',
    [req.user.id, productId]
  );

  if (rows.length > 0) {
    await db.query('DELETE FROM wishlists WHERE id = $1', [rows[0].id]);
    ok(res, { wishlisted: false, is_wishlisted: false, message: 'Removed from wishlist' });
  } else {
    await db.query(
      `INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING`,
      [req.user.id, productId]
    );
    ok(res, { wishlisted: true, is_wishlisted: true, message: 'Added to wishlist' });
  }
};

module.exports = { getWishlist, toggleWishlist };
