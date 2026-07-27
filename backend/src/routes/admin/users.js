const router = require('express').Router();
const ah = require('../../utils/asyncHandler');
const { requireRole } = require('../../middleware/role');
const user = require('../../controllers/admin/user.controller');
const db = require('../../config/db');
const { ok } = require('../../utils/response');

router.get('/', requireRole(['admin', 'super_admin']), ah(user.list));
router.get('/:id', requireRole(['admin', 'super_admin']), ah(user.getOne));
router.patch('/:id/block', requireRole('super_admin'), ah(user.toggleBlock));
router.delete('/:id', requireRole('super_admin'), ah(user.deleteUser));

// Per-user wishlist (admin view)
router.get('/:id/wishlist', requireRole(['admin', 'super_admin']), ah(async (req, res) => {
  const { rows } = await db.query(
    `SELECT w.id, p.id AS product_id, p.name AS product_name, p.price, p.offer_price,
            (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS image_url
     FROM wishlists w
     JOIN products p ON w.product_id=p.id
     WHERE w.user_id=$1
     ORDER BY w.id DESC`,
    [req.params.id]
  );
  ok(res, { wishlist: rows });
}));
router.delete('/:id/wishlist', requireRole('super_admin'), ah(async (req, res) => {
  await db.query('DELETE FROM wishlists WHERE user_id=$1', [req.params.id]);
  ok(res, {}, 'Wishlist cleared');
}));
router.delete('/:id/wishlist/:itemId', requireRole('super_admin'), ah(async (req, res) => {
  await db.query('DELETE FROM wishlists WHERE id=$1 AND user_id=$2', [req.params.itemId, req.params.id]);
  ok(res, {}, 'Item removed');
}));

// Per-user cart (admin view)
router.get('/:id/cart', requireRole(['admin', 'super_admin']), ah(async (req, res) => {
  const { rows } = await db.query(
    `SELECT c.id, c.quantity, c.variant_id,
            p.id AS product_id, p.name AS product_name, p.price, p.offer_price,
            (SELECT pi.url FROM product_images pi WHERE pi.product_id=p.id AND pi.is_primary=true LIMIT 1) AS image_url,
            pv.size, pv.color, pv.sku AS variant_sku
     FROM cart c
     JOIN products p ON c.product_id=p.id
     LEFT JOIN product_variants pv ON c.variant_id=pv.id
     WHERE c.user_id=$1
     ORDER BY c.id`,
    [req.params.id]
  );
  ok(res, { cart: rows });
}));
router.delete('/:id/cart', requireRole('super_admin'), ah(async (req, res) => {
  await db.query('DELETE FROM cart WHERE user_id=$1', [req.params.id]);
  ok(res, {}, 'Cart cleared');
}));
router.delete('/:id/cart/:itemId', requireRole('super_admin'), ah(async (req, res) => {
  await db.query('DELETE FROM cart WHERE id=$1 AND user_id=$2', [req.params.itemId, req.params.id]);
  ok(res, {}, 'Item removed');
}));

// Per-user login + product-view activity (admin view)
router.get('/:id/activity', requireRole(['admin', 'super_admin']), ah(async (req, res) => {
  const [{ rows: login_history }, { rows: product_views }] = await Promise.all([
    db.query(
      'SELECT created_at FROM login_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',
      [req.params.id]
    ),
    db.query(
      `SELECT p.id AS product_id, p.name AS product_name,
              (SELECT pi.url FROM product_images pi WHERE pi.product_id=p.id AND pi.is_primary=true LIMIT 1) AS image_url,
              COUNT(*)::int AS view_count, MAX(pv.created_at) AS last_viewed_at
       FROM product_views pv
       JOIN products p ON pv.product_id=p.id
       WHERE pv.user_id=$1
       GROUP BY p.id
       ORDER BY view_count DESC, last_viewed_at DESC
       LIMIT 50`,
      [req.params.id]
    ),
  ]);
  ok(res, { login_history, product_views });
}));

module.exports = router;
