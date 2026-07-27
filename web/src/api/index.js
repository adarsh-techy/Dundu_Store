import client from './client';

// Auth
export const authApi = {
  signup: (data) => client.post('/auth/signup', data),
  login: (data) => client.post('/auth/login', data),
  sendOtp: (phone) => client.post('/auth/otp/send', { phone }),
  verifyOtp: (phone, otp) => client.post('/auth/otp/verify', { phone, otp }),
  forgotPassword: (email) => client.post('/auth/forgot-password', { email }),
  resetPassword: (data) => client.post('/auth/reset-password', data),
  me: () => client.get('/auth/me'),
};

// Home
export const homeApi = {
  getHomeData: () => client.get('/home'),
};

// Announcements
export const announcementApi = {
  list: () => client.get('/announcements'),
};

// Products
export const productApi = {
  list: (params) => client.get('/products', { params }),
  getFilters: () => client.get('/products/filters'),
  getOne: (id) => client.get(`/products/${id}`),
  getRelated: (id) => client.get(`/products/${id}/related`),
  getReviews: (id) => client.get(`/products/${id}/reviews`),
  canReview: (id) => client.get(`/products/${id}/can-review`),
  addReview: (id, data) => client.post(`/products/${id}/reviews`, data),
};

// Categories
export const categoryApi = {
  list: () => client.get('/categories'),
  getOne: (slug) => client.get(`/categories/${slug}`),
};

// Cart
export const cartApi = {
  get: () => client.get('/cart'),
  add: (data) => client.post('/cart', data),
  update: (id, quantity) => client.put(`/cart/${id}`, { quantity }),
  remove: (id) => client.delete(`/cart/${id}`),
  clear: () => client.delete('/cart'),
};

// Orders
export const orderApi = {
  place: (data) => client.post('/orders', data),
  verifyPayment: (data) => client.post('/orders/verify-payment', data),
  list: () => client.get('/orders'),
  getOne: (id) => client.get(`/orders/${id}`),
  cancel: (id) => client.post(`/orders/${id}/cancel`),
  returnRequest: (id, reason) => client.post(`/orders/${id}/return`, { reason }),
  getRestrictions: () => client.get('/orders/restrictions'),
};

// Coupons
export const couponApi = {
  validate: (code, order_amount) => client.post('/coupons/validate', { code, order_amount }),
};

// Loyalty
export const loyaltyApi = {
  check: (phone) => client.get('/loyalty/check', { params: { phone } }),
  getMyCard: () => client.get('/loyalty/my-card'),
};

// Referral
export const referralApi = {
  getInfo: () => client.get('/users/referral'),
};

// Settings
export const settingsApi = {
  getPayment: () => client.get('/settings/payment'),
};

// User
export const userApi = {
  getProfile: () => client.get('/users/profile'),
  updateProfile: (data) => client.put('/users/profile', data),
  getAddresses: () => client.get('/users/addresses'),
  addAddress: (data) => client.post('/users/addresses', data),
  updateAddress: (id, data) => client.put(`/users/addresses/${id}`, data),
  deleteAddress: (id) => client.delete(`/users/addresses/${id}`),
  getWishlist: () => client.get('/users/wishlist'),
  toggleWishlist: (product_id) => client.post('/users/wishlist', { product_id }),
  getNotifications: () => client.get('/users/notifications'),
  markNotificationsRead: () => client.post('/users/notifications/read'),
};
