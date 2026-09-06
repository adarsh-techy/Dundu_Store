const router = require('express').Router();
const ctrl = require('../../controllers/customer/catalog/product.controller');
const reviewCtrl = require('../../controllers/customer/catalog/review.controller');
const { authenticate, authenticateOptional } = require('../../middleware/auth/auth.middleware');
const { handleValidation } = require('../../middleware/error/error.middleware');
const { reviewRules } = require('../../validators/product.validator');
const ah = require('../../utils/asyncHandler');
const upload = require('../../utils/upload');

router.get('/filters', ah(ctrl.getFilters));

router.get('/', authenticateOptional, (req, res, next) => {
  const term = (req.query.search || '').trim();
  if (term.length >= 2) {
    const db = require('../../config/db');
    db.query('INSERT INTO search_logs (term) VALUES ($1)', [term.toLowerCase()]).catch(() => {});
  }
  next();
}, ah(ctrl.list));

router.get('/:id', authenticateOptional, ah(ctrl.getOne));
router.get('/:id/related', authenticateOptional, ah(ctrl.getRelated));
router.get('/:id/reviews', ah(reviewCtrl.getProductReviews));
router.get('/:id/can-review', authenticate, ah(reviewCtrl.canReview));

router.post('/:id/reviews',
  authenticate,
  upload.any(),
  reviewRules,
  handleValidation,
  ah(reviewCtrl.addReview)
);

module.exports = router;
