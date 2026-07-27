const router = require('express').Router();
const ah = require('../../utils/asyncHandler');
const coupon = require('../../controllers/admin/coupon.controller');

router.get('/', ah(coupon.list));
router.post('/', ah(coupon.create));
router.put('/:id', ah(coupon.update));
router.delete('/:id', ah(coupon.remove));

module.exports = router;
