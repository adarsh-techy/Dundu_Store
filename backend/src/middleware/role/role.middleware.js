const { forbidden } = require('../../utils/response');

const requireRole = (roles) => (req, res, next) => {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!req.user || !allowed.includes(req.user.role)) return forbidden(res);
  next();
};

const requirePermission = (key) => (req, res, next) => {
  if (!req.user) return forbidden(res);
  if (req.user.role === 'super_admin') return next();
  if (req.user.role === 'admin' && Array.isArray(req.user.permissions) && req.user.permissions.includes(key)) {
    return next();
  }
  return forbidden(res);
};

module.exports = { requireRole, requirePermission };
