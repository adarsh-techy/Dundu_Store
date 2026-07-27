const crypto = require('crypto');
const db = require('../config/db');

const generate = () => crypto.randomInt(100000, 999999).toString();

const save = async (identifier, otp, ttlMinutes = 10) => {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await db.query(
    `INSERT INTO otps (identifier, otp, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (identifier) DO UPDATE SET otp = $2, expires_at = $3, is_used = false`,
    [identifier, otp, expiresAt]
  );
};

const verify = async (identifier, otp) => {
  const { rows } = await db.query(
    `SELECT id FROM otps
     WHERE identifier = $1 AND otp = $2 AND is_used = false AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [identifier, otp]
  );
  if (!rows.length) return false;
  await db.query('UPDATE otps SET is_used = true WHERE id = $1', [rows[0].id]);
  return true;
};

const peek = async (identifier) => {
  const { rows } = await db.query(
    `SELECT otp FROM otps
     WHERE identifier = $1 AND is_used = false AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [identifier]
  );
  return rows.length ? rows[0].otp : null;
};

module.exports = { generate, save, verify, peek };
