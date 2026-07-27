const router = require('express').Router();
const upload = require('../../utils/upload');
const ah = require('../../utils/asyncHandler');
const category = require('../../controllers/admin/category.controller');

router.get('/', ah(category.list));
router.post('/', upload.single('image'), ah(category.create));
router.post('/bulk', ah(category.bulkCreate));
router.put('/:id', upload.single('image'), ah(category.update));
router.patch('/:id/meta', ah(category.updateMeta));
router.patch('/:id/toggle', ah(category.toggle));
router.patch('/:id/size-chart', upload.single('size_chart'), ah(category.uploadSizeChart));
router.patch('/:id/size-chart-table', ah(category.saveSizeChartTable));
router.delete('/:id/size-chart', ah(category.deleteSizeChart));
router.delete('/:id', ah(category.remove));

module.exports = router;
