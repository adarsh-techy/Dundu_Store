const router = require('express').Router();
const referral = require('../../../controllers/admin/marketing/referral.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/', ah(referral.getStats));
router.get('/rewards', ah(referral.getRewards));

module.exports = router;
