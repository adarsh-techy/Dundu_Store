const router = require('express').Router();
const ah = require('../../../utils/asyncHandler');
const order = require('../../../controllers/admin/orders/order.controller');

router.get('/', ah(order.list));
router.get('/:id', ah(order.getOne));
router.patch('/:id/status', ah(order.updateStatus));
router.get('/:id/qr', ah(order.getQr));
router.patch('/:id/courier', ah(order.updateCourier));

module.exports = router;
