const router = require('express').Router();
const cart = require('../../../controllers/admin/orders/cart.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/', ah(cart.listCarts));

module.exports = router;
