const router = require('express').Router();
const upload = require('../../utils/upload');
const ah = require('../../utils/asyncHandler');
const splash = require('../../controllers/admin/splash.controller');

router.get('/', ah(splash.get));
router.put('/', upload.single('bg_image'), ah(splash.upsert));
router.delete('/:id/image', ah(splash.removeBgImage));

module.exports = router;
