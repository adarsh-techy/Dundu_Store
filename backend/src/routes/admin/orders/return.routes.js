const router = require('express').Router();
const ah = require('../../../utils/asyncHandler');
const order = require('../../../controllers/admin/orders/order.controller');

router.get('/', ah(order.getReturnRequests));
router.patch('/:id', ah(order.handleReturn));

module.exports = router;
