const router = require('express').Router();
const { authenticate } = require('../../middleware/auth/auth.middleware');
const { requireRole, requirePermission } = require('../../middleware/role/role.middleware');

router.use(authenticate, requireRole(['admin', 'super_admin']));

// Analytics & Reports
router.get('/dashboard', require('../../controllers/admin/analytics/dashboard.controller').getDashboard);
router.get('/inventory', require('../../controllers/admin/catalog/inventory.controller').getInventory);
router.use('/insights', require('./analytics/insights.routes'));
router.use('/reports',  requirePermission('reports'), require('./analytics/reports.routes'));

// Catalog
router.use('/products',          require('./catalog/product.routes'));
router.use('/categories',        require('./catalog/category.routes'));
router.use('/combos',            require('./catalog/combo.routes'));
router.use('/product-materials', require('./catalog/material.routes'));
router.use('/brands',            require('./catalog/brand.routes'));
router.use('/reviews',           require('./catalog/review.routes'));

// Marketing
router.use('/marketing-control', require('./marketing/marketingControl.routes'));
router.use('/announcements',     require('./marketing/announcement.routes'));
router.use('/banners',           require('./marketing/banner.routes'));
router.use('/birthdays',         require('./marketing/birthday.routes'));
router.use('/coupons',           require('./marketing/coupon.routes'));
router.use('/loyalty',           requirePermission('loyalty'), require('./marketing/loyalty.routes'));
router.use('/referral',          require('./marketing/referral.routes'));
router.use('/whatsapp',          require('./marketing/whatsapp.routes'));
router.use('/spin-wheel',        require('./marketing/spinWheel.routes'));
router.use('/festival',          require('./marketing/festival.routes'));
router.use('/first-purchase',    require('./marketing/firstPurchase.routes'));
router.use('/scratch-card',      require('./marketing/scratchCard.routes'));

// Orders & Returns
router.use('/orders',            requirePermission('orders'), require('./orders/order.routes'));
router.use('/returns',           requirePermission('returns'), require('./orders/return.routes'));
router.use('/carts',             require('./orders/cart.routes'));
router.use('/wishlists',         require('./orders/wishlist.routes'));

// Users & Staff
router.use('/users',             require('./users/user.routes'));
router.use('/admins',            require('./users/admin.routes'));
router.use('/delivery-staff',    require('./users/deliveryStaff.routes'));
router.use('/wallets',           requirePermission('wallet'), require('./users/wallet.routes'));

// Settings
router.use('/settings',          require('./settings/settings.routes'));
router.use('/splash',            require('./settings/splash.routes'));

module.exports = router;
