const crypto = require('crypto');
const db = require('../../config/db');
const env = require('../../config/env');

const DEFAULT_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

// The `otps` table only has: id, identifier, otp, expires_at, is_used, attempts, created_at.
// `identifier` is UNIQUE, so a request for a given phone/email always replaces any
// previous OTP for it ("one active OTP at a time").
//
// The third argument is the TTL in minutes (used for delivery PINs, which need to live
// for hours rather than minutes). Strings such as the legacy `purpose` values are ignored.
const storeOtp = async (target, otp, ttlMinutes = DEFAULT_TTL_MINUTES) => {
  const ttl = Number.isFinite(Number(ttlMinutes)) && Number(ttlMinutes) > 0
    ? Number(ttlMinutes)
    : DEFAULT_TTL_MINUTES;
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000);
  await db.query(
    `INSERT INTO otps (identifier, otp, expires_at, is_used, attempts)
     VALUES ($1, $2, $3, false, 0)
     ON CONFLICT (identifier)
     DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at, is_used = false, attempts = 0`,
    [target, otp, expiresAt]
  );
};

const verifyOtp = async (target, otp) => {
  if (typeof otp !== 'string' && typeof otp !== 'number') return false;
  const supplied = String(otp).trim();
  if (!/^\d{4,10}$/.test(supplied)) return false;

  // Development-only shortcut, must be explicitly enabled via ALLOW_DEV_OTP=true and
  // is never honoured when NODE_ENV=production (see config/env.js).
  if (env.allowDevOtp && supplied === '123456') return true;

  const { rows } = await db.query(
    'SELECT id, otp, expires_at, attempts FROM otps WHERE identifier = $1 AND is_used = false',
    [target]
  );
  if (!rows.length) return false;
  const row = rows[0];

  if (new Date() > new Date(row.expires_at) || row.attempts >= MAX_ATTEMPTS) {
    await db.query('DELETE FROM otps WHERE id = $1', [row.id]);
    return false;
  }

  const a = Buffer.from(String(row.otp));
  const b = Buffer.from(supplied);
  const matches = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!matches) {
    // Count the failed attempt; the OTP is invalidated after MAX_ATTEMPTS wrong guesses.
    await db.query('UPDATE otps SET attempts = attempts + 1 WHERE id = $1', [row.id]);
    return false;
  }

  await db.query('DELETE FROM otps WHERE id = $1', [row.id]);
  return true;
};

module.exports = {
  generateOtp,
  storeOtp,
  verifyOtp,
  generate: generateOtp,
  save: storeOtp,
  verify: verifyOtp,
};
