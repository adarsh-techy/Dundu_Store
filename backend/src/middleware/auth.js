const { verify } = require('../utils/jwt');
const { unauthorized } = require('../utils/response');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return unauthorized(res);

  try {
    req.user = verify(header.slice(7));
    next();
  } catch {
    unauthorized(res, 'Invalid or expired token');
  }
};

const authenticateOptional = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try { req.user = verify(header.slice(7)); } catch {}
  }
  next();
};

module.exports = { authenticate, authenticateOptional };
