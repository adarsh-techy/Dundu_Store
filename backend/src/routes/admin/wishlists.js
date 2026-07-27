const router = require('express').Router();
const ah = require('../../utils/asyncHandler');
const { requireRole } = require('../../middleware/role');
const wishlist = require('../../controllers/admin/wishlist.controller');

router.get('/', requireRole('super_admin'), ah(wishlist.list));
router.delete('/:id', requireRole('super_admin'), ah(wishlist.remove));

module.exports = router;
