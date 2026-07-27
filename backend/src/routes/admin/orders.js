const router = require('express').Router();
const ah = require('../../utils/asyncHandler');
const { requireRole } = require('../../middleware/role');
const order = require('../../controllers/admin/order.controller');
const db = require('../../config/db');
const { ok } = require('../../utils/response');

router.get('/', ah(order.list));
router.get('/:id', ah(order.getOne));
router.get('/:id/qr', ah(order.getQr));
router.patch('/:id/status', ah(order.updateStatus));
router.patch('/:id/courier', ah(order.updateCourier));
router.delete('/:id', requireRole('super_admin'), ah(async (req, res) => {
  const { rows } = await db.query('SELECT id FROM orders WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Order not found' });
  await db.query('DELETE FROM order_items WHERE order_id=$1', [req.params.id]);
  await db.query('DELETE FROM orders WHERE id=$1', [req.params.id]);
  ok(res, {}, 'Order deleted');
}));

module.exports = router;
