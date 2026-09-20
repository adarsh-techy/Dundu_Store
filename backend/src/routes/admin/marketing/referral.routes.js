const router = require('express').Router();
const referral = require('../../../controllers/admin/marketing/referral.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/config', ah(referral.getConfig));
router.put('/config', ah(referral.updateConfig));
router.get('/stats', ah(referral.getStats));
router.get('/rewards', ah(referral.getRewards));
router.get('/', ah(referral.getStats));

module.exports = router;
