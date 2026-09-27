const router = require('express').Router();
const { notTrashed } = require('../../../services/trash/trash.service');
// Records sitting in Trash cannot be read, edited or toggled here (restore them first).
router.use('/:id', (req, res, next) => (req.method === 'DELETE' ? next() : notTrashed('banners')(req, res, next)));
const upload = require('../../../utils/upload');
const ah = require('../../../utils/asyncHandler');
const banner = require('../../../controllers/admin/marketing/banner.controller');

router.get('/', ah(banner.list));
router.post('/', upload.single('image'), ah(banner.create));
router.put('/:id', upload.single('image'), ah(banner.update));
router.patch('/:id/toggle', ah(banner.toggle));
router.delete('/:id', ah(banner.remove));

module.exports = router;
