const router = require('express').Router();
const upload = require('../../utils/upload');
const ah = require('../../utils/asyncHandler');
const banner = require('../../controllers/admin/banner.controller');

router.get('/', ah(banner.list));
router.post('/', upload.single('image'), ah(banner.create));
router.put('/:id', upload.single('image'), ah(banner.update));
router.patch('/:id/toggle', ah(banner.toggle));
router.delete('/:id', ah(banner.remove));

module.exports = router;
