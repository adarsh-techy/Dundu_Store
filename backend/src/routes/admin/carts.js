const router = require('express').Router();
const ah = require('../../utils/asyncHandler');
const cart = require('../../controllers/admin/cart.controller');

router.get('/', ah(cart.listCarts));

module.exports = router;
