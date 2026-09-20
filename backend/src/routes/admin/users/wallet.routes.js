const router = require('express').Router();
const wallet = require('../../../controllers/admin/users/wallet.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/config', ah(wallet.getConfig));
router.put('/config', ah(wallet.updateConfig));
router.get('/', ah(wallet.list));
router.get('/:userId/transactions', ah(wallet.getTransactions));
router.post('/:userId/adjust', ah(wallet.adjust));

module.exports = router;
