const router = require('express').Router();
const ah = require('../../utils/asyncHandler');
const loyalty = require('../../controllers/admin/loyalty.controller');

router.post('/sync', ah(loyalty.syncFromOrders));
router.get('/', ah(loyalty.list));
router.post('/', ah(loyalty.create));
router.patch('/:phone', ah(loyalty.update));
router.delete('/:phone', ah(loyalty.remove));

module.exports = router;
