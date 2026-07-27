const router = require('express').Router();
const ah = require('../../utils/asyncHandler');
const brand = require('../../controllers/admin/brand.controller');

router.get('/', ah(brand.list));
router.post('/', ah(brand.create));
router.put('/:id', ah(brand.update));
router.patch('/:id/toggle', ah(brand.toggle));
router.delete('/:id', ah(brand.remove));

module.exports = router;
