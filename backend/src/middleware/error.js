const { validationResult } = require('express-validator');
const { badRequest, error } = require('../utils/response');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return badRequest(res, errors.array()[0].msg);
  next();
};

// Global error handler — must be last middleware registered
const globalError = (err, _req, res, _next) => {
  console.error(err);
  if (err.message === 'Only JPEG, PNG, WebP allowed') return badRequest(res, err.message);
  error(res, err.message || 'Internal server error');
};

module.exports = { handleValidation, globalError };
