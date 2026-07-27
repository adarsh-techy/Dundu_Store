const router = require('express').Router();
const ctrl = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/error');

router.use(authenticate);

router.get('/', ctrl.getCart);
router.post('/',
  [body('product_id').notEmpty(), body('quantity').optional().isInt({ min: 1 })],
  handleValidation, ctrl.addToCart
);
router.put('/:id', [body('quantity').isInt({ min: 1 })], handleValidation, ctrl.updateCart);
router.delete('/:id', ctrl.removeFromCart);
router.delete('/', ctrl.clearCart);

module.exports = router;
