const { body } = require('express-validator');

const signupRules = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone().withMessage('Valid phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const phoneRule = () =>
  body('phone').isString().trim().matches(/^\+?[0-9]{10,15}$/).withMessage('Valid phone number is required');

const sendOtpRules = [
  phoneRule(),
];

const verifyOtpRules = [
  phoneRule(),
  body('otp').isString().trim().matches(/^[0-9]{4,10}$/).withMessage('OTP code is required'),
];

const forgotPasswordRules = [
  body('email').isEmail().withMessage('Valid email is required'),
];

const resetPasswordRules = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').isString().trim().matches(/^[0-9]{4,10}$/).withMessage('OTP is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

const adminRegisterRules = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

module.exports = {
  signupRules,
  loginRules,
  sendOtpRules,
  verifyOtpRules,
  forgotPasswordRules,
  resetPasswordRules,
  adminRegisterRules,
};
