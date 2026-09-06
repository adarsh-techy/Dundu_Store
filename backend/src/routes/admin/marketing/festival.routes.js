const router = require('express').Router();
const festival = require('../../../controllers/admin/marketing/festival.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/', ah(festival.getFestival));
router.put('/', ah(festival.updateFestival));

module.exports = router;
