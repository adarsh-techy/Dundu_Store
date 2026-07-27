const db = require('../config/db');
const { ok } = require('../utils/response');

const getWishlist = async (req, res) => {
  const { rows } = await db.query(
    `SELECT w.id, p.id AS product_id, p.name, p.price, p.offer_price,
            (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS image
     FROM wishlists w
     JOIN products p ON w.product_id=p.id
     WHERE w.user_id=$1`,
    [req.user.id]
  );
  ok(res, { wishlist: rows });
};

const toggleWishlist = async (req, res) => {
  const { product_id } = req.body;
  const { rows } = await db.query('SELECT id FROM wishlists WHERE user_id=$1 AND product_id=$2', [req.user.id, product_id]);

  if (rows.length) {
    await db.query('DELETE FROM wishlists WHERE id=$1', [rows[0].id]);
    ok(res, { wishlisted: false });
  } else {
    await db.query('INSERT INTO wishlists (user_id, product_id) VALUES ($1,$2)', [req.user.id, product_id]);
    ok(res, { wishlisted: true });
  }
};

module.exports = { getWishlist, toggleWishlist };
