const router = require('express').Router();
const ah = require('../../utils/asyncHandler');
const settings = require('../../controllers/admin/settings.controller');

router.get('/', ah(settings.getSettings));
router.put('/', ah(settings.updateSettings));
router.get('/payment', ah(settings.getPaymentSettings));
router.put('/payment', ah(settings.updatePaymentSettings));

module.exports = router;
