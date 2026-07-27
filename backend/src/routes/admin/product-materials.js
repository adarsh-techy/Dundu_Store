const router = require('express').Router();
const ah = require('../../utils/asyncHandler');
const category = require('../../controllers/admin/category.controller');

router.get('/', ah(category.listMaterials));
router.post('/', ah(category.createMaterial));
router.put('/:id', ah(category.updateMaterial));
router.patch('/:id/toggle', ah(category.toggleMaterial));
router.delete('/:id', ah(category.deleteMaterial));

module.exports = router;
