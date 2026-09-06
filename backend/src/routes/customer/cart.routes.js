const router = require('express').Router();
const ctrl = require('../../controllers/customer/cart/cart.controller');
const { authenticate } = require('../../middleware/auth/auth.middleware');
const ah = require('../../utils/asyncHandler');

router.use(authenticate);

router.get('/', ah(ctrl.getCart));
router.post('/', ah(ctrl.addToCart));
router.put('/:id', ah(ctrl.updateCart));
router.delete('/clear', ah(ctrl.clearCart));
router.delete('/:id', ah(ctrl.removeFromCart));

module.exports = router;
