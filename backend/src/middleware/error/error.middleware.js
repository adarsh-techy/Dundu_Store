const { validationResult } = require('express-validator');
const { badRequest, error } = require('../../utils/response');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return badRequest(res, errors.array()[0].msg);
  next();
};

const globalError = (err, _req, res, _next) => {
  console.error(err);
  if (err.message === 'Only JPEG, PNG, WebP allowed') return badRequest(res, err.message);
  if (err.name === 'MulterError') return badRequest(res, err.message);
  if (err.type === 'entity.too.large') return badRequest(res, 'Request body too large');
  // Database/driver messages can reveal schema details — hide them outside development.
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error');
  error(res, message);
};

module.exports = { handleValidation, globalError };
