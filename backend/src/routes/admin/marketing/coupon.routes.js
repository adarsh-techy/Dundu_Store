const router = require('express').Router();
const { notTrashed } = require('../../../services/trash/trash.service');
// Records sitting in Trash cannot be read, edited or toggled here (restore them first).
router.use('/:id', (req, res, next) => (req.method === 'DELETE' ? next() : notTrashed('coupons')(req, res, next)));
const coupon = require('../../../controllers/admin/marketing/coupon.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/', ah(coupon.list));
router.post('/', ah(coupon.create));
router.put('/:id', ah(coupon.update));
router.delete('/:id', ah(coupon.remove));

module.exports = router;
