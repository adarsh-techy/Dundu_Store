const router = require('express').Router();
const upload = require('../../../utils/upload');
const ah = require('../../../utils/asyncHandler');
const combo = require('../../../controllers/admin/catalog/combo.controller');

router.get('/',       ah(combo.list));
router.get('/:id',    ah(combo.getOne));
router.post('/',      upload.single('image'), ah(combo.create));
router.put('/:id',    upload.single('image'), ah(combo.update));
router.patch('/:id/toggle', ah(combo.toggle));
router.delete('/:id', ah(combo.remove));

module.exports = router;
