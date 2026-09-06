const router = require('express').Router();
const splash = require('../../../controllers/admin/settings/splash.controller');
const ah = require('../../../utils/asyncHandler');
const upload = require('../../../utils/upload');

router.get('/', ah(splash.get));
router.put('/', upload.single('bg_image'), ah(splash.upsert));
router.delete('/:id/image', ah(splash.removeBgImage));

module.exports = router;
