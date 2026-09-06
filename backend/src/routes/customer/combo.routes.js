const router = require('express').Router();
const ah = require('../../utils/asyncHandler');
const combo = require('../../controllers/customer/catalog/combo.controller');

router.get('/',    ah(combo.list));
router.get('/:id', ah(combo.getOne));

module.exports = router;
