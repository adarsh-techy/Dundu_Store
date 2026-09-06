const router = require('express').Router();
const ah = require('../../../utils/asyncHandler');
const controller = require('../../../controllers/admin/marketing/scratchCard.controller');

router.get('/config',            ah(controller.getConfig));
router.put('/settings',          ah(controller.updateSettings));
router.put('/permission-rules',  ah(controller.updatePermissionRules));
router.post('/prizes',           ah(controller.createPrize));
router.put('/prizes/:id',        ah(controller.updatePrize));
router.delete('/prizes/:id',     ah(controller.deletePrize));
router.get('/users-permissions', ah(controller.getUsersPermissions));
router.post('/force-user',       ah(controller.forceUserScratchPopup));
router.get('/logs',              ah(controller.getLogs));

module.exports = router;
