const router = require('express').Router();
const stockCheck = require('../../../controllers/admin/catalog/stockCheck.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/', ah(stockCheck.getStockCheck));
router.get('/:id', ah(stockCheck.getStockCheckProduct));

module.exports = router;
