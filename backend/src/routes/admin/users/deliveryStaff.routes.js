const router = require('express').Router();
const staff = require('../../../controllers/admin/users/deliveryStaff.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/', ah(staff.list));
router.post('/', ah(staff.create));
router.patch('/:id/block', ah(staff.toggleBlock));
router.delete('/:id', ah(staff.remove));

module.exports = router;
