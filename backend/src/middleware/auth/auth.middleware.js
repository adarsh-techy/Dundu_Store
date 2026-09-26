const db = require('../../config/db');
const { verify } = require('../../utils/jwt');
const { unauthorized } = require('../../utils/response');

// Re-load the fields that authorization depends on from the database on every request,
// so blocking a user/admin or changing role/permissions takes effect immediately instead
// of only when the (7-day) JWT expires.
const loadUser = async (payload) => {
  if (!payload?.id) return null;
  const { rows } = await db.query(
    'SELECT id, role, email, phone, name, permissions, is_blocked FROM users WHERE id=$1',
    [payload.id]
  );
  if (!rows.length || rows[0].is_blocked) return null;
  const u = rows[0];
  return {
    id: u.id,
    role: u.role,
    email: u.email,
    phone: u.phone,
    name: u.name,
    permissions: Array.isArray(u.permissions) ? u.permissions : [],
  };
};

const extractToken = (req) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
};

const authenticate = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return unauthorized(res);

  let payload;
  try {
    payload = verify(token);
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }

  try {
    const user = await loadUser(payload);
    if (!user) return unauthorized(res, 'Account not found or blocked');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const authenticateOptional = async (req, _res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      const user = await loadUser(verify(token));
      if (user) req.user = user;
    } catch {}
  }
  next();
};

module.exports = { authenticate, authenticateOptional };
