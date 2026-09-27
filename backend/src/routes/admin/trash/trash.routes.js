const router = require('express').Router();
const ah = require('../../../utils/asyncHandler');
const ctrl = require('../../../controllers/admin/trash/trash.controller');

router.get('/', ah(ctrl.overview));
router.post('/:type/:id/restore', ah(ctrl.restore));
// Must come before '/:type/:id' or '/empty/products' is read as type=empty, id=products.
router.delete('/empty/:type?', ah(ctrl.empty));
router.delete('/:type/:id', ah(ctrl.purge));

module.exports = router;
