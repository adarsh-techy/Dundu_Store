const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const delivery = require('../controllers/delivery.controller');

router.use(authenticate, requireRole('delivery_staff'));

router.get('/available', ah(delivery.available));
router.get('/my-orders', ah(delivery.myOrders));
router.post('/pickup', ah(delivery.pickup));
router.post('/resend-otp', ah(delivery.resendOtp));
router.post('/complete', ah(delivery.complete));

module.exports = router;
