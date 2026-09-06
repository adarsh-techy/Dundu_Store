const router = require('express').Router();
const category = require('../../../controllers/admin/catalog/category.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/', ah(category.listMaterials));
router.post('/', ah(category.createMaterial));
router.patch('/:id/toggle', ah(category.toggleMaterial));
router.put('/:id', ah(category.updateMaterial));
router.delete('/:id', ah(category.deleteMaterial));

module.exports = router;
