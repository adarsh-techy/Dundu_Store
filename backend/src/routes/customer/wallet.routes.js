const router = require('express').Router();
const ctrl = require('../../controllers/customer/wallet/wallet.controller');
const { authenticate } = require('../../middleware/auth/auth.middleware');
const ah = require('../../utils/asyncHandler');

router.use(authenticate);

router.get('/', ah(ctrl.getWallet));
router.get('/transactions', ah(ctrl.listTransactions));

module.exports = router;
