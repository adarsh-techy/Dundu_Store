const router = require('express').Router();
const { requireRole } = require('../../../middleware/role/role.middleware');
const user = require('../../../controllers/admin/users/user.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/', ah(user.listAdmins));
router.post('/', requireRole('super_admin'), ah(user.createAdmin));
router.patch('/:id/permissions', requireRole('super_admin'), ah(user.updateAdminPermissions));
router.patch('/:id/block', requireRole('super_admin'), ah(user.toggleBlockAdmin));
router.delete('/:id', requireRole('super_admin'), ah(user.deleteAdmin));

module.exports = router;
