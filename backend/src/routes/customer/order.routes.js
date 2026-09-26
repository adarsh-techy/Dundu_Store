const router = require('express').Router();
const ctrl = require('../../controllers/customer/order/order.controller');
const { authenticate } = require('../../middleware/auth/auth.middleware');
const ah = require('../../utils/asyncHandler');

router.use(authenticate);

router.get('/return-restrictions', ah(ctrl.getReturnRestrictions));
router.post('/', ah(ctrl.placeOrder));
router.post('/verify-payment', ah(ctrl.verifyPayment));
router.get('/', ah(ctrl.listOrders));
router.get('/:id', ah(ctrl.getOrder));
router.post('/:id/cancel', ah(ctrl.cancelOrder));
router.post('/:id/pay', ah(ctrl.retryPayment));
router.post('/:id/return', ah(ctrl.returnRequest));

module.exports = router;
