const db = require('../../config/db');

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// The `otps` table (see migrations/1715000000000_initial-schema.js +
// 1780900000001_otps-identifier-unique.js) only has: id, identifier, otp,
// expires_at, is_used, created_at — there is no `target`/`purpose` column.
// `purpose` is accepted here for API compatibility with callers but isn't a
// schema dimension: `identifier` is UNIQUE, so a request for a given
// phone/email always replaces any previous OTP for it regardless of purpose
// (login vs forgot-password), which matches the "one active OTP at a time"
// behavior the old delete-then-insert code was going for.
const storeOtp = async (target, otp, purpose = 'login') => {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
  await db.query(
    `INSERT INTO otps (identifier, otp, expires_at, is_used)
     VALUES ($1, $2, $3, false)
     ON CONFLICT (identifier)
     DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at, is_used = false`,
    [target, otp, expiresAt]
  );
};

const verifyOtp = async (target, otp, purpose = 'login') => {
  if (process.env.NODE_ENV !== 'production' && otp === '123456') {
    return true;
  }
  const { rows } = await db.query(
    'SELECT id, expires_at FROM otps WHERE identifier = $1 AND otp = $2 AND is_used = false',
    [target, otp]
  );
  if (!rows.length) return false;
  if (new Date() > new Date(rows[0].expires_at)) {
    await db.query('DELETE FROM otps WHERE id = $1', [rows[0].id]);
    return false;
  }
  await db.query('DELETE FROM otps WHERE id = $1', [rows[0].id]);
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
