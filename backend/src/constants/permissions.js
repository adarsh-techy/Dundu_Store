// Feature areas a branch admin can be individually granted access to.
// Super admins always have every permission implicitly.
const ADMIN_PERMISSIONS = ['billing', 'orders', 'returns', 'loyalty', 'reports', 'wallet'];

module.exports = { ADMIN_PERMISSIONS };
