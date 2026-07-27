const router = require('express').Router();
const ah = require('../../utils/asyncHandler');
const { requireRole } = require('../../middleware/role');
const user = require('../../controllers/admin/user.controller');

router.get('/', requireRole('super_admin'), ah(user.listAdmins));
router.post('/', requireRole('super_admin'), ah(user.createAdmin));
router.patch('/:id/permissions', requireRole('super_admin'), ah(user.updateAdminPermissions));
router.patch('/:id/block', requireRole('super_admin'), ah(user.toggleBlockAdmin));
router.delete('/:id', requireRole('super_admin'), ah(user.deleteAdmin));

module.exports = router;
