const router = require('express').Router();
const ctrl = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/error');

router.use(authenticate);

router.post('/',
  [body('address_id').notEmpty(), body('payment_method').notEmpty()],
  handleValidation, ctrl.placeOrder
);
router.post('/verify-payment',
  [body('razorpay_order_id').notEmpty(), body('razorpay_payment_id').notEmpty(), body('razorpay_signature').notEmpty()],
  handleValidation, ctrl.verifyPayment
);
router.get('/restrictions', ctrl.getReturnRestrictions);
router.get('/', ctrl.listOrders);
router.get('/:id', ctrl.getOrder);
router.post('/:id/cancel', ctrl.cancelOrder);
router.post('/:id/return', [body('reason').notEmpty()], handleValidation, ctrl.returnRequest);

module.exports = router;
