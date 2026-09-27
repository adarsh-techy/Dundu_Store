const router = require('express').Router();
const ah = require('../../../utils/asyncHandler');
const ctrl = require('../../../controllers/admin/trash/trash.controller');

router.get('/', ah(ctrl.overview));
router.post('/:type/:id/restore', ah(ctrl.restore));
router.delete('/:type/:id', ah(ctrl.purge));
router.delete('/empty/:type?', ah(ctrl.empty));

module.exports = router;
