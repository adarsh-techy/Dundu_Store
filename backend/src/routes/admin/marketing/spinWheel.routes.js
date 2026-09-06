const router = require('express').Router();
const ctrl = require('../../../controllers/admin/marketing/spinWheel.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/config', ah(ctrl.getConfig));
router.put('/settings', ah(ctrl.updateSettings));
router.put('/permission-rules', ah(ctrl.updatePermissionRules));

router.post('/segments', ah(ctrl.createSegment));
router.put('/segments/:id', ah(ctrl.updateSegment));
router.delete('/segments/:id', ah(ctrl.deleteSegment));

router.post('/user-targets', ah(ctrl.createUserTarget));
router.delete('/user-targets/:id', ah(ctrl.deleteUserTarget));

router.get('/users-permissions', ah(ctrl.getUsersPermissions));
router.patch('/users-permissions/:id/toggle', ah(ctrl.toggleUserSpinPermission));
router.post('/users-permissions/bulk', ah(ctrl.bulkToggleUserSpinPermission));

router.post('/force-user', ah(ctrl.forceUserSpinPopup));
router.post('/force-all', ah(ctrl.forceAllUsersSpinPopup));
router.post('/cancel-force', ah(ctrl.cancelForceUserSpinPopup));

router.get('/logs', ah(ctrl.getLogs));

module.exports = router;
