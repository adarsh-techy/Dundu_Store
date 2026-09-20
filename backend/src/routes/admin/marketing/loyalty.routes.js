const router = require('express').Router();
const loyalty = require('../../../controllers/admin/marketing/loyalty.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/config', ah(loyalty.getConfig));
router.put('/config', ah(loyalty.updateConfig));
router.get('/', ah(loyalty.list));
router.post('/sync', ah(loyalty.syncFromOrders));
router.post('/', ah(loyalty.create));
router.patch('/:phone', ah(loyalty.update));
router.post('/:phone/adjust', ah(loyalty.adjustPoints));
router.delete('/:phone', ah(loyalty.remove));

module.exports = router;
