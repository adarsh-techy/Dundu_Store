const router = require('express').Router();
const coupon = require('../../../controllers/admin/marketing/coupon.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/', ah(coupon.list));
router.post('/', ah(coupon.create));
router.put('/:id', ah(coupon.update));
router.delete('/:id', ah(coupon.remove));

module.exports = router;
