const bcrypt = require('bcryptjs');
const db = require('../../../config/db');
const { sign } = require('../../../utils/jwt');
const { ok, created, badRequest, unauthorized, error } = require('../../../utils/response');
const otpService = require('../../../services/otp/otp.service');
const whatsapp = require('../../../services/whatsapp/whatsapp.service');
const env = require('../../../config/env');
const audit = require('../../../services/audit/audit.service');

const tokenFor = (user) =>
  sign({ id: user.id, role: user.role, email: user.email, phone: user.phone, permissions: user.permissions || [] });

const sanitize = ({ password_hash, google_id, ...user }) => user;

const REFERRAL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const generateReferralCode = () => {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += REFERRAL_CHARS[Math.floor(Math.random() * REFERRAL_CHARS.length)];
  }
  return `DND${suffix}`;
};

const getUniqueReferralCode = async () => {
  let code;
  let attempts = 0;
  do {
    code = generateReferralCode();
    const { rows } = await db.query('SELECT id FROM users WHERE referral_code=$1', [code]);
    if (!rows.length) return code;
    attempts++;
  } while (attempts < 10);
  throw new Error('Could not generate unique referral code');
};

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const phone = req.body.phone?.trim() || null;
    const incomingReferralCode = req.body.referral_code?.trim() || null;

    const emailCheck = await db.query('SELECT id FROM users WHERE email=$1', [email]);
    if (emailCheck.rows.length) return badRequest(res, 'Email already registered');

    if (phone) {
      const phoneCheck = await db.query('SELECT id FROM users WHERE phone=$1', [phone]);
      if (phoneCheck.rows.length) return badRequest(res, 'Phone number already registered');
    }

    let referredBy = null;
    if (incomingReferralCode) {
      const { rows: referrerRows } = await db.query(
        'SELECT id FROM users WHERE referral_code=$1',
        [incomingReferralCode]
      );
      if (referrerRows.length) referredBy = incomingReferralCode;
    }

    const myReferralCode = await getUniqueReferralCode();
    const password_hash = await bcrypt.hash(password, 10);

    const { rows } = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, referral_code, referred_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, email, phone, password_hash, myReferralCode, referredBy]
    );
    const newUser = rows[0];

    if (referredBy) {
      const { rows: settings } = await db.query(
        "SELECT value FROM settings WHERE key='referred_discount_percent'"
      );
      const discountPercent = settings.length ? parseInt(settings[0].value, 10) : 30;
      await db.query(
        `INSERT INTO referral_rewards (user_id, reward_type, discount_percent)
         VALUES ($1,'referred',$2)`,
        [newUser.id, discountPercent]
      );
    }

    if (newUser.phone) {
      whatsapp.sendWelcome?.(newUser.phone, newUser.name)?.catch(() => {});
    }

    created(res, { token: tokenFor(newUser), user: sanitize(newUser) });
  } catch (err) {
    console.error('signup error:', err);
    error(res, err.message || 'Signup failed');
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await db.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!rows.length) return unauthorized(res, 'Invalid credentials');

    const user = rows[0];
    if (user.is_blocked) return unauthorized(res, 'Account blocked');
    if (!user.password_hash) return unauthorized(res, 'Please login with Google or OTP');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return unauthorized(res, 'Invalid credentials');

    db.query('UPDATE users SET last_login_at=now() WHERE id=$1', [user.id]).catch(() => {});
    db.query('INSERT INTO login_logs (user_id) VALUES ($1)', [user.id]).catch(() => {});
    if (['admin', 'super_admin'].includes(user.role)) {
      audit.record({ actor: user, action: 'login', entityType: 'auth', entityId: user.id, summary: `${user.name || user.email} signed in to the admin panel`,
        method: 'POST', path: req.originalUrl, statusCode: 200, ip: req.ip, userAgent: req.get('user-agent') });
    }
    ok(res, { token: tokenFor(user), user: sanitize(user) });
  } catch (err) {
    console.error('login error:', err);
    error(res, err.message || 'Login failed');
  }
};

const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    const otp = otpService.generate();
    await otpService.save(phone, otp);
    await whatsapp.sendOtp(phone, otp);
    ok(res, {}, 'OTP sent');
  } catch (err) {
    console.error('sendOtp error:', err);
    error(res, err.message || 'Failed to send OTP');
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const valid = await otpService.verify(phone, otp);
    if (!valid) return badRequest(res, 'Invalid or expired OTP');

    let { rows } = await db.query('SELECT * FROM users WHERE phone=$1', [phone]);
    let isNew = false;
    if (!rows.length) {
      const myReferralCode = await getUniqueReferralCode();
      const ins = await db.query(
        `INSERT INTO users (name, phone, referral_code) VALUES ($1,$2,$3) RETURNING *`,
        ['Dundu User', phone, myReferralCode]
      );
      rows = ins.rows;
      isNew = true;
    }

    const user = rows[0];
    if (user.is_blocked) return unauthorized(res, 'Account blocked');

    if (isNew) {
      whatsapp.sendWelcome?.(user.phone, user.name)?.catch(() => {});
    }

    db.query('UPDATE users SET last_login_at=now() WHERE id=$1', [user.id]).catch(() => {});
    db.query('INSERT INTO login_logs (user_id) VALUES ($1)', [user.id]).catch(() => {});
    ok(res, { token: tokenFor(user), user: sanitize(user) });
  } catch (err) {
    console.error('verifyOtp error:', err);
    error(res, err.message || 'OTP verification failed');
  }
};

const GENERIC_FORGOT_MSG = 'If an account exists for this email, a reset code has been sent to its registered WhatsApp number';

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await db.query('SELECT id, phone FROM users WHERE email=$1', [email]);
    // Always answer the same way so the endpoint cannot be used to enumerate accounts.
    if (!rows.length || !rows[0].phone) return ok(res, {}, GENERIC_FORGOT_MSG);

    const otp = otpService.generate();
    await otpService.save(email, otp);
    await whatsapp.sendOtp(rows[0].phone, otp);
    ok(res, {}, GENERIC_FORGOT_MSG);
  } catch (err) {
    console.error('forgotPassword error:', err);
    error(res, err.message || 'Failed to process request');
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const valid = await otpService.verify(email, otp);
    if (!valid) return badRequest(res, 'Invalid or expired OTP');

    const password_hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash=$1 WHERE email=$2', [password_hash, email]);
    ok(res, {}, 'Password reset successful');
  } catch (err) {
    console.error('resetPassword error:', err);
    error(res, err.message || 'Password reset failed');
  }
};

const googleCallback = (req, res) => {
  const token = tokenFor(req.user);
  db.query('UPDATE users SET last_login_at=now() WHERE id=$1', [req.user.id]).catch(() => {});
  db.query('INSERT INTO login_logs (user_id) VALUES ($1)', [req.user.id]).catch(() => {});
  const clientUrl = process.env.WEB_CLIENT_URL || env.corsOrigins[0] || '';
  // Put the token in the URL fragment: fragments are not sent to servers, so the token
  // does not end up in proxy/access logs or Referer headers.
  res.redirect(`${clientUrl}/auth/callback#token=${encodeURIComponent(token)}`);
};

const me = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    if (!rows.length) return unauthorized(res);
    ok(res, { user: sanitize(rows[0]) });
  } catch (err) {
    console.error('me error:', err);
    error(res, err.message || 'Failed to fetch user');
  }
};

const adminRegister = async (req, res) => {
  try {
    const { rows: existingAdmins } = await db.query(
      "SELECT id FROM users WHERE role IN ('admin','super_admin') LIMIT 1"
    );
    if (existingAdmins.length) {
      return res.status(403).json({ message: 'Admin setup already complete. Ask a super admin to create your account.' });
    }

    const { name, email, password } = req.body;
    const phone = req.body.phone?.trim() || null;

    const emailCheck = await db.query('SELECT id FROM users WHERE email=$1', [email]);
    if (emailCheck.rows.length) return badRequest(res, 'Email already registered');

    const password_hash = await bcrypt.hash(password, 10);
    const referral_code = await getUniqueReferralCode();
    await db.query(
      `INSERT INTO users (name, email, phone, password_hash, role, referral_code)
       VALUES ($1,$2,$3,$4,'super_admin',$5)`,
      [name, email, phone, password_hash, referral_code]
    );
    ok(res, { message: 'Super admin account created. Please login.' });
  } catch (err) {
    error(res, err.message || 'Registration failed');
  }
};

module.exports = { signup, login, sendOtp, verifyOtp, forgotPassword, resetPassword, googleCallback, me, adminRegister };
