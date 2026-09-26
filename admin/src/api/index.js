import client from './client';

export const authApi = {
  login: (data) => client.post('/auth/login', data),
  me: () => client.get('/auth/me'),
  adminRegister: (data) => client.post('/auth/admin-register', data),
};

export const dashboardApi = {
  get:       (date) => client.get('/admin/dashboard',        { params: date ? { date } : {} }),
  getStore:  (date, branchId) => client.get('/admin/dashboard/store',  { params: { ...(date ? { date } : {}), ...(branchId ? { branch_id: branchId } : {}) } }),
};

export const inventoryApi = {
  get: (params) => client.get('/admin/inventory', { params }),
};

export const productApi = {
  list: (params) => client.get('/admin/products', { params }),
  getOne: (id) => client.get(`/admin/products/${id}`),
  getAnalytics: (id) => client.get(`/admin/products/${id}/analytics`),
  nextCode: (category_id) => client.get('/admin/products/next-code', { params: { category_id } }),
  create: (data) => client.post('/admin/products', data),
  update: (id, data) => client.put(`/admin/products/${id}`, data),
  remove: (id) => client.delete(`/admin/products/${id}`),
  deleteImage: (productId, imageId) => client.delete(`/admin/products/${productId}/images/${imageId}`),
  setPrimaryImage: (productId, imageId) => client.patch(`/admin/products/${productId}/images/${imageId}/primary`),
  toggleHidden: (id) => client.patch(`/admin/products/${id}/toggle-hidden`),
  toggleFeatured: (id) => client.patch(`/admin/products/${id}/toggle-featured`),
  toggleOffer: (id) => client.patch(`/admin/products/${id}/toggle-offer`),
  toggleNewArrival: (id) => client.patch(`/admin/products/${id}/toggle-new-arrival`),
};

export const categoryApi = {
  list: () => client.get('/admin/categories'),
  create: (data) => client.post('/admin/categories', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => client.put(`/admin/categories/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  toggle: (id) => client.patch(`/admin/categories/${id}/toggle`),
  bulk: (categories) => client.post('/admin/categories/bulk', { categories }),
  remove: (id, reassign_to) => client.delete(`/admin/categories/${id}${reassign_to ? `?reassign_to=${reassign_to}` : ''}`),
  uploadSizeChart: (id, file) => {
    const fd = new FormData();
    fd.append('size_chart', file);
    return client.patch(`/admin/categories/${id}/size-chart`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  removeSizeChart: (id) => client.delete(`/admin/categories/${id}/size-chart`),
  saveSizeChartTable: (id, data) => client.patch(`/admin/categories/${id}/size-chart-table`, data),
  saveMeta: (id, data) => client.patch(`/admin/categories/${id}/meta`, data),
};

export const comboApi = {
  list:   ()         => client.get('/admin/combos'),
  getOne: (id)       => client.get(`/admin/combos/${id}`),
  create: (data)     => client.post('/admin/combos', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => client.put(`/admin/combos/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  toggle: (id)       => client.patch(`/admin/combos/${id}/toggle`),
  remove: (id)       => client.delete(`/admin/combos/${id}`),
};


export const materialApi = {
  list: () => client.get('/admin/product-materials'),
  create: (data) => client.post('/admin/product-materials', data),
  update: (id, data) => client.put(`/admin/product-materials/${id}`, data),
  toggle: (id) => client.patch(`/admin/product-materials/${id}/toggle`),
  remove: (id) => client.delete(`/admin/product-materials/${id}`),
};

export const brandApi = {
  list: () => client.get('/admin/brands'),
  create: (data) => client.post('/admin/brands', data),
  update: (id, data) => client.put(`/admin/brands/${id}`, data),
  toggle: (id) => client.patch(`/admin/brands/${id}/toggle`),
  remove: (id) => client.delete(`/admin/brands/${id}`),
};

export const bannerApi = {
  list: () => client.get('/admin/banners'),
  create: (data) => client.post('/admin/banners', data),
  update: (id, data) => client.put(`/admin/banners/${id}`, data),
  toggle: (id) => client.patch(`/admin/banners/${id}/toggle`),
  remove: (id) => client.delete(`/admin/banners/${id}`),
};

export const orderApi = {
  list: (params) => client.get('/admin/orders', { params }),
  getOne: (id) => client.get(`/admin/orders/${id}`),
  updateStatus: (id, body) => client.patch(`/admin/orders/${id}/status`, body),
  updateCourier: (id, data) => client.patch(`/admin/orders/${id}/courier`, data),
  remove: (id) => client.delete(`/admin/orders/${id}`),
  getReturns: (params) => client.get('/admin/returns', { params }),
  handleReturn: (id, data) => client.patch(`/admin/returns/${id}`, data),
  getQr: (id) => client.get(`/admin/orders/${id}/qr`),
};

export const deliveryStaffApi = {
  list: () => client.get('/admin/delivery-staff'),
  create: (data) => client.post('/admin/delivery-staff', data),
  toggleBlock: (id) => client.patch(`/admin/delivery-staff/${id}/block`),
  remove: (id) => client.delete(`/admin/delivery-staff/${id}`),
};

export const userApi = {
  list: (params) => client.get('/admin/users', { params }),
  getOne: (id) => client.get(`/admin/users/${id}`),
  toggleBlock: (id) => client.patch(`/admin/users/${id}/block`),
  toggleCodBlock: (id) => client.patch(`/admin/users/${id}/cod-block`),
  remove: (id) => client.delete(`/admin/users/${id}`),
  getCart: (id) => client.get(`/admin/users/${id}/cart`),
  clearCart: (id) => client.delete(`/admin/users/${id}/cart`),
  removeCartItem: (id, itemId) => client.delete(`/admin/users/${id}/cart/${itemId}`),
  getWishlist: (id) => client.get(`/admin/users/${id}/wishlist`),
  clearWishlist: (id) => client.delete(`/admin/users/${id}/wishlist`),
  removeWishlistItem: (id, itemId) => client.delete(`/admin/users/${id}/wishlist/${itemId}`),
  getActivity: (id) => client.get(`/admin/users/${id}/activity`),
  listAdmins: () => client.get('/admin/admins'),
  createAdmin: (data) => client.post('/admin/admins', data),
  updateAdminPermissions: (id, permissions) => client.patch(`/admin/admins/${id}/permissions`, { permissions }),
  blockAdmin: (id) => client.patch(`/admin/admins/${id}/block`),
  deleteAdmin: (id) => client.delete(`/admin/admins/${id}`),
};

export const walletApi = {
  getConfig:       ()               => client.get('/admin/wallets/config'),
  updateConfig:    (data)           => client.put('/admin/wallets/config', data),
  list:            (params)         => client.get('/admin/wallets', { params }),
  getTransactions: (userId, params) => client.get(`/admin/wallets/${userId}/transactions`, { params }),
  adjust:          (userId, data)   => client.post(`/admin/wallets/${userId}/adjust`, data),
};

export const couponApi = {
  list: () => client.get('/admin/coupons'),
  create: (data) => client.post('/admin/coupons', data),
  update: (id, data) => client.put(`/admin/coupons/${id}`, data),
  remove: (id) => client.delete(`/admin/coupons/${id}`),
};

export const cartApi = {
  monitor: (params) => client.get('/admin/carts', { params }),
};

export const branchApi = {
  list:   ()         => client.get('/admin/branches'),
  create: (data)     => client.post('/admin/branches', data),
  update: (id, data) => client.patch(`/admin/branches/${id}`, data),
  remove: (id)       => client.delete(`/admin/branches/${id}`),
};

// Read-only view of a branch's POS sales — actual billing/checkout only
// happens in the branch-admin app, this is for super-admin oversight.
export const salesApi = {
  list: (params) => client.get('/admin/billing/sales', { params }),
};

export const loyaltyApi = {
  getConfig:    ()       => client.get('/admin/loyalty/config'),
  updateConfig: (data)   => client.put('/admin/loyalty/config', data),
  list:         (params) => client.get('/admin/loyalty', { params }),
  sync:         ()       => client.post('/admin/loyalty/sync'),
  create:       (data)   => client.post('/admin/loyalty', data),
  update:       (phone, data) => client.patch(`/admin/loyalty/${encodeURIComponent(phone)}`, data),
  adjustPoints: (phone, data) => client.post(`/admin/loyalty/${encodeURIComponent(phone)}/adjust`, data),
  remove:       (phone)  => client.delete(`/admin/loyalty/${encodeURIComponent(phone)}`),
};

export const reportsApi = {
  daily: (date) => client.get('/admin/reports/daily', { params: { date } }),
  finance: (params) => client.get('/admin/reports/finance', { params }),
  updateCostPrice: (id, cost_price) => client.patch(`/admin/reports/products/${id}/cost-price`, { cost_price }),
};

export const announcementApi = {
  list: () => client.get('/admin/announcements'),
  create: (data) => client.post('/admin/announcements', data),
  update: (id, data) => client.put(`/admin/announcements/${id}`, data),
  toggle: (id) => client.patch(`/admin/announcements/${id}/toggle`),
  togglePopup: (id) => client.patch(`/admin/announcements/${id}/toggle-popup`),
  remove: (id) => client.delete(`/admin/announcements/${id}`),
};

export const birthdayApi = {
  getList:        () => client.get('/admin/birthdays'),
  sendOne:        (userId) => client.post(`/admin/birthdays/send/${userId}`),
  sendAllToday:   () => client.post('/admin/birthdays/send-all-today'),
  updateSettings: (data) => client.put('/admin/birthdays/settings', data),
};

export const whatsappApi = {
  getUsers: (search) => client.get('/admin/whatsapp/users', { params: search ? { search } : {} }),
  getLogs:  (params) => client.get('/admin/whatsapp/logs', { params }),
  getStats: ()       => client.get('/admin/whatsapp/stats'),
  send:     (data)   => client.post('/admin/whatsapp/send', data),
};

export const insightsApi = {
  getProducts: () => client.get('/admin/insights/products'),
  getUsers:    () => client.get('/admin/insights/users'),
  getUserActivity: (params) => client.get('/admin/insights/user-activity', { params }),
};

export const settingsApi = {
  get: () => client.get('/admin/settings'),
  update: (data) => client.put('/admin/settings', data),
  getPayment: () => client.get('/settings/payment'),
};

export const wishlistApi = {
  listAll: (params) => client.get('/admin/wishlists', { params }),
  remove: (id) => client.delete(`/admin/wishlists/${id}`),
};

export const reviewApi = {
  list: (params) => client.get('/admin/reviews', { params }),
  create: (data) => client.post('/admin/reviews', data),
  update: (id, data) => client.put(`/admin/reviews/${id}`, data),
  remove: (id) => client.delete(`/admin/reviews/${id}`),
};

export const splashApi = {
  get: () => client.get('/admin/splash'),
  update: (data) => client.put('/admin/splash', data),
  removeImage: (id) => client.delete(`/admin/splash/${id}/image`),
};

export const spinWheelApi = {
  getConfig:                    () => client.get('/admin/spin-wheel/config'),
  updateSettings:               (data) => client.put('/admin/spin-wheel/settings', data),
  updatePermissionRules:        (data) => client.put('/admin/spin-wheel/permission-rules', data),
  createSegment:                (data) => client.post('/admin/spin-wheel/segments', data),
  updateSegment:                (id, data) => client.put(`/admin/spin-wheel/segments/${id}`, data),
  deleteSegment:                (id) => client.delete(`/admin/spin-wheel/segments/${id}`),
  createUserTarget:             (data) => client.post('/admin/spin-wheel/user-targets', data),
  deleteUserTarget:             (id) => client.delete(`/admin/spin-wheel/user-targets/${id}`),
  getUsersPermissions:          (params) => client.get('/admin/spin-wheel/users-permissions', { params }),
  toggleUserSpinPermission:     (id, enabled) => client.patch(`/admin/spin-wheel/users-permissions/${id}/toggle`, { enabled }),
  bulkToggleUserSpinPermission: (user_ids, enabled) => client.post('/admin/spin-wheel/users-permissions/bulk', { user_ids, enabled }),
  forceUserSpinPopup:           (user_id, user_ids) => client.post('/admin/spin-wheel/force-user', { user_id, user_ids }),
  cancelForceUserSpinPopup:     (user_ids) => client.post('/admin/spin-wheel/cancel-force', { user_ids }),
  forceAllUsersSpinPopup:       () => client.post('/admin/spin-wheel/force-all'),
  getLogs:                      (params) => client.get('/admin/spin-wheel/logs', { params }),
};

export const festivalApi = {
  get:    () => client.get('/admin/festival'),
  update: (data) => client.put('/admin/festival', data),
};

export const firstPurchaseApi = {
  get:    () => client.get('/admin/first-purchase'),
  update: (data) => client.put('/admin/first-purchase', data),
};

export const scratchCardApi = {
  getConfig:            () => client.get('/admin/scratch-card/config'),
  updateSettings:       (data) => client.put('/admin/scratch-card/settings', data),
  updatePermissionRules: (data) => client.put('/admin/scratch-card/permission-rules', data),
  createPrize:          (data) => client.post('/admin/scratch-card/prizes', data),
  updatePrize:          (id, data) => client.put(`/admin/scratch-card/prizes/${id}`, data),
  deletePrize:          (id) => client.delete(`/admin/scratch-card/prizes/${id}`),
  getUsersPermissions:  (params) => client.get('/admin/scratch-card/users-permissions', { params }),
  forceUserScratchPopup: (user_id, user_ids) => client.post('/admin/scratch-card/force-user', { user_id, user_ids }),
  getLogs:              (params) => client.get('/admin/scratch-card/logs', { params }),
};

export const marketingControlApi = {
  getOverview: () => client.get('/admin/marketing-control'),
  toggle: (data) => client.put('/admin/marketing-control/toggle', data),
};

export const referralApi = {
  getConfig:    ()       => client.get('/admin/referral/config'),
  updateConfig: (data)   => client.put('/admin/referral/config', data),
  stats:        ()       => client.get('/admin/referral/stats'),
  rewards:      (params) => client.get('/admin/referral/rewards', { params }),
};

