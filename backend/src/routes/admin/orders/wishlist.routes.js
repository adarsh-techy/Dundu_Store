const router = require('express').Router();
const wishlist = require('../../../controllers/admin/orders/wishlist.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/', ah(wishlist.list));
router.delete('/:id', ah(wishlist.remove));

module.exports = router;
