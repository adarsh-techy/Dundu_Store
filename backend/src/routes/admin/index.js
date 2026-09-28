const router = require('express').Router();
const { authenticate } = require('../../middleware/auth/auth.middleware');
const { requireRole, requirePermission } = require('../../middleware/role/role.middleware');
const { auditAdminActions } = require('../../services/audit/audit.service');

router.use(authenticate, requireRole(['admin', 'super_admin']));

// Branch admins ("admin") are limited to the areas they were explicitly granted via
// `permissions` (orders, returns, loyalty, reports, wallet, billing). Every other admin
// area is super-admin only — the sidebar hides these for branch admins, and this is the
// server-side enforcement of the same rule.
const superOnly = requireRole('super_admin');

// Every successful create/update/delete under /api/admin is written to audit_logs.
router.use(auditAdminActions);

// Analytics & Reports
router.get('/dashboard', superOnly, require('../../controllers/admin/analytics/dashboard.controller').getDashboard);
router.get('/inventory', superOnly, require('../../controllers/admin/catalog/inventory.controller').getInventory);
router.use('/stock-check', superOnly, require('./catalog/stockCheck.routes'));
router.use('/insights', superOnly, require('./analytics/insights.routes'));
router.use('/reports',  requirePermission('reports'), require('./analytics/reports.routes'));

// Catalog
router.use('/products',          superOnly, require('./catalog/product.routes'));
router.use('/categories',        superOnly, require('./catalog/category.routes'));
router.use('/combos',            superOnly, require('./catalog/combo.routes'));
router.use('/product-materials', superOnly, require('./catalog/material.routes'));
router.use('/brands',            superOnly, require('./catalog/brand.routes'));
router.use('/reviews',           superOnly, require('./catalog/review.routes'));

// Marketing
router.use('/marketing-control', superOnly, require('./marketing/marketingControl.routes'));
router.use('/announcements',     superOnly, require('./marketing/announcement.routes'));
router.use('/banners',           superOnly, require('./marketing/banner.routes'));
router.use('/birthdays',         superOnly, require('./marketing/birthday.routes'));
router.use('/coupons',           superOnly, require('./marketing/coupon.routes'));
router.use('/loyalty',           requirePermission('loyalty'), require('./marketing/loyalty.routes'));
router.use('/referral',          superOnly, require('./marketing/referral.routes'));
router.use('/whatsapp',          superOnly, require('./marketing/whatsapp.routes'));
router.use('/spin-wheel',        superOnly, require('./marketing/spinWheel.routes'));
router.use('/festival',          superOnly, require('./marketing/festival.routes'));
router.use('/first-purchase',    superOnly, require('./marketing/firstPurchase.routes'));
router.use('/scratch-card',      superOnly, require('./marketing/scratchCard.routes'));

// Orders & Returns
router.use('/orders',            requirePermission('orders'), require('./orders/order.routes'));
router.use('/returns',           requirePermission('returns'), require('./orders/return.routes'));
router.use('/carts',             superOnly, require('./orders/cart.routes'));
router.use('/wishlists',         superOnly, require('./orders/wishlist.routes'));

// Users & Staff
router.use('/users',             superOnly, require('./users/user.routes'));
router.use('/admins',            superOnly, require('./users/admin.routes'));
router.use('/delivery-staff',    superOnly, require('./users/deliveryStaff.routes'));
router.use('/wallets',           requirePermission('wallet'), require('./users/wallet.routes'));

// Trash (soft-deleted catalogue & marketing records, super admin)
router.use('/trash',             superOnly, require('./trash/trash.routes'));

// Audit trail (read-only, super admin)
router.use('/audit-logs',        superOnly, require('./audit/audit.routes'));

// Settings
router.use('/settings',          superOnly, require('./settings/settings.routes'));
router.use('/splash',            superOnly, require('./settings/splash.routes'));

module.exports = router;
