const router = require('express').Router();
const ctrl = require('../../controllers/customer/spinWheel/spinWheel.controller');
const { authenticateOptional } = require('../../middleware/auth/auth.middleware');
const ah = require('../../utils/asyncHandler');

router.get('/config', authenticateOptional, ah(ctrl.getConfig));
router.get('/active-reward', authenticateOptional, ah(ctrl.getActiveReward));
router.post('/spin', authenticateOptional, ah(ctrl.spin));

module.exports = router;
