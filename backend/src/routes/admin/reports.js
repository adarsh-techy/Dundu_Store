const router = require('express').Router();
const ah = require('../../utils/asyncHandler');
const report = require('../../controllers/admin/report.controller');

router.get('/daily', ah(report.dailyReport));

module.exports = router;
