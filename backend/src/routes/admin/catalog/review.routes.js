const router = require('express').Router();
const review = require('../../../controllers/admin/catalog/review.controller');
const ah = require('../../../utils/asyncHandler');
const upload = require('../../../utils/upload');

router.get('/', ah(review.list));
router.post('/', upload.any(), ah(review.create));
router.put('/:id', upload.any(), ah(review.update));
router.delete('/:id', ah(review.remove));

module.exports = router;
