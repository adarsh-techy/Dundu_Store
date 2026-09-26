const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const message = { success: false, message: 'Too many requests, please try again later' };
const common = { standardHeaders: true, legacyHeaders: false, message };

// Key by client IP plus the phone/email being targeted, so an attacker cannot spread
// attempts against one account across many IPs cheaply, and one busy NAT does not
// lock everyone out.
const identifierKey = (field) => (req) =>
  `${ipKeyGenerator(req.ip)}:${String(req.body?.[field] || '').trim().toLowerCase()}`;

// Whole API: generous ceiling to blunt scripted abuse.
const apiLimiter = rateLimit({ ...common, windowMs: 60 * 1000, limit: 300 });

// OTP delivery costs money (Twilio) — keep it tight.
const otpSendLimiter = rateLimit({
  ...common, windowMs: 10 * 60 * 1000, limit: 5, keyGenerator: identifierKey('phone'),
});

// OTP / password guesses.
const otpVerifyLimiter = rateLimit({
  ...common, windowMs: 10 * 60 * 1000, limit: 10, keyGenerator: identifierKey('phone'),
});
const passwordResetLimiter = rateLimit({
  ...common, windowMs: 15 * 60 * 1000, limit: 10, keyGenerator: identifierKey('email'),
});
const loginLimiter = rateLimit({
  ...common, windowMs: 15 * 60 * 1000, limit: 20, keyGenerator: identifierKey('email'),
});
const signupLimiter = rateLimit({ ...common, windowMs: 60 * 60 * 1000, limit: 20 });

// Prize endpoints — cheap to call, expensive if abused.
const rewardLimiter = rateLimit({ ...common, windowMs: 60 * 1000, limit: 10 });

module.exports = {
  apiLimiter, otpSendLimiter, otpVerifyLimiter, passwordResetLimiter, loginLimiter, signupLimiter, rewardLimiter,
};
