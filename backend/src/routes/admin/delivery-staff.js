const router = require('express').Router();
const ah = require('../../utils/asyncHandler');
const staff = require('../../controllers/admin/deliveryStaff.controller');

router.get('/', ah(staff.list));
router.post('/', ah(staff.create));
router.patch('/:id/block', ah(staff.toggleBlock));
router.delete('/:id', ah(staff.remove));

module.exports = router;
