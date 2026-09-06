const router = require('express').Router();
const report = require('../../../controllers/admin/analytics/report.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/daily', ah(report.dailyReport));
router.get('/finance', ah(report.financeReport));
router.patch('/products/:id/cost-price', ah(report.updateProductCostPrice));

module.exports = router;
