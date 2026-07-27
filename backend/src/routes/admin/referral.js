const router = require('express').Router();
const ah = require('../../utils/asyncHandler');
const referral = require('../../controllers/admin/referral.controller');

router.get('/stats', ah(referral.getStats));
router.get('/rewards', ah(referral.getRewards));

module.exports = router;
