const router = require('express').Router();
const ah = require('../../../utils/asyncHandler');
const ctrl = require('../../../controllers/admin/audit/audit.controller');

router.get('/', ah(ctrl.list));
router.get('/filters', ah(ctrl.filters));
router.get('/:id', ah(ctrl.getOne));

module.exports = router;
