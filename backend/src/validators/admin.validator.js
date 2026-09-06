const { body } = require('express-validator');

const createProductRules = [
  body('name').notEmpty().withMessage('Product name is required'),
  body('price').isNumeric().withMessage('Price must be a valid number'),
];

const createCategoryRules = [
  body('name').notEmpty().withMessage('Category name is required'),
];

const updateOrderStatusRules = [
  body('status').notEmpty().withMessage('Order status is required'),
];

module.exports = {
  createProductRules,
  createCategoryRules,
  updateOrderStatusRules,
};
