const router = require('express').Router();
const { notTrashed } = require('../../../services/trash/trash.service');
// Records sitting in Trash cannot be read, edited or toggled here (restore them first).
router.use('/:id', (req, res, next) => (req.method === 'DELETE' ? next() : notTrashed('products')(req, res, next)));
const upload = require('../../../utils/upload');
const ah = require('../../../utils/asyncHandler');
const product = require('../../../controllers/admin/catalog/product.controller');

router.get('/next-code', ah(product.getNextCode));
router.get('/', ah(product.list));
router.get('/:id', ah(product.getOne));
router.get('/:id/analytics', ah(product.getAnalytics));
// upload.any() — this request carries both product images ("images") and,
// for reviews added while creating the product, review photos ("review_images")
router.post('/', upload.any(), ah(product.create));
router.put('/:id', upload.array('images', 10), ah(product.update));
router.delete('/:id', ah(product.remove));
router.delete('/:id/images/:imageId', ah(product.deleteImage));
router.patch('/:id/images/:imageId/primary', ah(product.setPrimaryImage));
router.patch('/:id/toggle-hidden', ah(product.toggleHidden));
router.patch('/:id/toggle-featured', ah(product.toggleFeatured));
router.patch('/:id/toggle-offer', ah(product.toggleOffer));
router.patch('/:id/toggle-new-arrival', ah(product.toggleNewArrival));

module.exports = router;
