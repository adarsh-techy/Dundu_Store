const router = require('express').Router();
const ah = require('../../../utils/asyncHandler');
const controller = require('../../../controllers/admin/marketing/firstPurchase.controller');

router.get('/', ah(controller.getConfig));
router.put('/', ah(controller.updateConfig));

module.exports = router;
