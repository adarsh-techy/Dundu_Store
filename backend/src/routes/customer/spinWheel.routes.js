const router = require('express').Router();
const ctrl = require('../../controllers/customer/spinWheel/spinWheel.controller');
const { authenticate, authenticateOptional } = require('../../middleware/auth/auth.middleware');
const { rewardLimiter } = require('../../middleware/rateLimit.middleware');
const ah = require('../../utils/asyncHandler');

router.get('/config', authenticateOptional, ah(ctrl.getConfig));
router.get('/active-reward', authenticate, ah(ctrl.getActiveReward));
router.post('/spin', authenticate, rewardLimiter, ah(ctrl.spin));

module.exports = router;
