const router = require('express').Router();
const settings = require('../../../controllers/admin/settings/settings.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/', ah(settings.getSettings));
router.put('/', ah(settings.updateSettings));

module.exports = router;
