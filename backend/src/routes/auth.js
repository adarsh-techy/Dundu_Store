const router = require('express').Router();
const { body } = require('express-validator');
const passport = require('../config/passport');
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { handleValidation } = require('../middleware/error');

router.post('/signup',
  [body('name').notEmpty(), body('email').isEmail(), body('phone').optional({ checkFalsy: true }), body('password').isLength({ min: 6 })],
  handleValidation, ctrl.signup
);

router.post('/login',
  [body('email').isEmail(), body('password').notEmpty()],
  handleValidation, ctrl.login
);

router.post('/otp/send', [body('phone').notEmpty()], handleValidation, ctrl.sendOtp);
router.post('/otp/verify', [body('phone').notEmpty(), body('otp').notEmpty()], handleValidation, ctrl.verifyOtp);

router.post('/forgot-password', [body('email').isEmail()], handleValidation, ctrl.forgotPassword);
router.post('/reset-password',
  [body('email').isEmail(), body('otp').notEmpty(), body('newPassword').isLength({ min: 6 })],
  handleValidation, ctrl.resetPassword
);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  ctrl.googleCallback
);

router.post('/admin-register',
  [body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 })],
  handleValidation, ctrl.adminRegister
);

router.get('/me', authenticate, ctrl.me);

module.exports = router;
