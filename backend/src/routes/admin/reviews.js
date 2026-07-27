const router = require('express').Router();
const ah = require('../../utils/asyncHandler');
const review = require('../../controllers/admin/review.controller');

const upload = require('../../utils/upload');

router.get('/', ah(review.list));
router.post('/', upload.any(), ah(review.create));
router.put('/:id', upload.any(), ah(review.update));
router.delete('/:id', ah(review.remove));

module.exports = router;
