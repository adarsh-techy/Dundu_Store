const router = require('express').Router();
const { authenticate } = require('../../middleware/auth/auth.middleware');
const { requireRole } = require('../../middleware/role/role.middleware');
const ah = require('../../utils/asyncHandler');
const delivery = require('../../controllers/customer/delivery/delivery.controller');

router.use(authenticate, requireRole(['delivery_staff', 'admin', 'super_admin']));

router.get('/available', ah(delivery.available));
router.get('/my-orders', ah(delivery.myOrders));
router.post('/pickup', ah(delivery.pickup));
router.post('/resend-otp', ah(delivery.resendOtp));
router.post('/complete', ah(delivery.complete));

module.exports = router;
