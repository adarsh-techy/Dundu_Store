const router = require('express').Router();
const ctrl = require('../controllers/product.controller');
const reviewCtrl = require('../controllers/review.controller');
const { authenticate, authenticateOptional } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/error');
const ah = require('../utils/asyncHandler');

const upload = require('../utils/upload');

router.get('/filters', ah(ctrl.getFilters));
router.get('/', authenticateOptional, (req, res, next) => {
  const term = (req.query.search || '').trim();
  if (term.length >= 2) {
    const db = require('../config/db');
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
  [body('rating').isInt({ min: 1, max: 5 })],
  handleValidation,
  ah(reviewCtrl.addReview)
);

module.exports = router;

