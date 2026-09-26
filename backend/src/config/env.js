require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// Secrets that must never run in production with a placeholder / missing value.
const PLACEHOLDER_RE = /^(your[_-]|change[_-]?me|xxx|placeholder|dundu_default)/i;
const requireSecret = (name, devFallback) => {
  const value = process.env[name];
  if (value && !PLACEHOLDER_RE.test(value)) return value;
  if (isProduction) {
    throw new Error(`${name} must be set to a real value when NODE_ENV=production`);
  }
  if (!value) console.warn(`⚠️  ${name} not set — using an insecure development fallback`);
  else console.warn(`⚠️  ${name} looks like a placeholder — using an insecure development fallback`);
  return devFallback;
};

const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  isProduction,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/dundu',
  jwtSecret: requireSecret('JWT_SECRET', 'dundu_dev_only_jwt_secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Explicit opt-in for the fixed "123456" OTP used in local development.
  // Never honoured in production regardless of the flag.
  allowDevOtp: !isProduction && process.env.ALLOW_DEV_OTP === 'true',

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxSizeBytes: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  corsOrigins: [
    process.env.WEB_CLIENT_URL,
    process.env.ADMIN_CLIENT_URL,
    process.env.SUPER_ADMIN_CLIENT_URL,
  ].filter(Boolean),
};

module.exports = env;
