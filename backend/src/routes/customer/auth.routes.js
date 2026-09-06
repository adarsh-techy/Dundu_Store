const router = require('express').Router();
const passport = require('../../config/passport');
const ctrl = require('../../controllers/customer/auth/auth.controller');
const { authenticate } = require('../../middleware/auth/auth.middleware');
const { handleValidation } = require('../../middleware/error/error.middleware');
const {
  signupRules,
  loginRules,
  sendOtpRules,
  verifyOtpRules,
  forgotPasswordRules,
  resetPasswordRules,
  adminRegisterRules,
} = require('../../validators/auth.validator');

router.post('/signup', signupRules, handleValidation, ctrl.signup);
router.post('/login', loginRules, handleValidation, ctrl.login);

router.post('/otp/send', sendOtpRules, handleValidation, ctrl.sendOtp);
router.post('/otp/verify', verifyOtpRules, handleValidation, ctrl.verifyOtp);

router.post('/forgot-password', forgotPasswordRules, handleValidation, ctrl.forgotPassword);
router.post('/reset-password', resetPasswordRules, handleValidation, ctrl.resetPassword);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  ctrl.googleCallback
);

router.post('/admin-register', adminRegisterRules, handleValidation, ctrl.adminRegister);

router.get('/me', authenticate, ctrl.me);

module.exports = router;
