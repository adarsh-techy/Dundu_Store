const router = require('express').Router();
const controller = require('../../../controllers/admin/marketing/marketingControl.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/', ah(controller.getMarketingControlOverview));
router.put('/toggle', ah(controller.toggleMarketingFeature));

module.exports = router;
