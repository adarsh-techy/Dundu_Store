const router = require('express').Router();
const upload = require('../../utils/upload');
const ah = require('../../utils/asyncHandler');
const product = require('../../controllers/admin/product.controller');

router.get('/next-code', ah(product.getNextCode));
router.get('/', ah(product.list));
router.get('/:id/analytics', ah(product.getAnalytics));
router.get('/:id', ah(product.getOne));
router.post('/', upload.any(), ah(product.create));
router.put('/:id', upload.any(), ah(product.update));
router.delete('/:id', ah(product.remove));
router.delete('/:id/images/:imageId', ah(product.deleteImage));
router.patch('/:id/images/:imageId/primary', ah(product.setPrimaryImage));
router.patch('/:id/toggle-hidden', ah(product.toggleHidden));
router.patch('/:id/toggle-featured', ah(product.toggleFeatured));
router.patch('/:id/toggle-offer', ah(product.toggleOffer));
router.patch('/:id/toggle-new-arrival', ah(product.toggleNewArrival));

module.exports = router;
