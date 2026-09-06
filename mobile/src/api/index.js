import client from './client';

export const authApi = {
  signup: (data) => client.post('/auth/signup', data),
  login: (data) => client.post('/auth/login', data),
  sendOtp: (phone) => client.post('/auth/otp/send', { phone }),
  verifyOtp: (phone, otp) => client.post('/auth/otp/verify', { phone, otp }),
  forgotPassword: (email) => client.post('/auth/forgot-password', { email }),
  resetPassword: (data) => client.post('/auth/reset-password', data),
  me: () => client.get('/auth/me'),
};

export const homeApi = {
  getHomeData: () => client.get('/home'),
};

export const announcementApi = {
  getAll: () => client.get('/announcements'),
};

export const productApi = {
  list: (params) => client.get('/products', { params }),
  getFilters: (params) => client.get('/products/filters', { params }),
  getOne: (id) => client.get(`/products/${id}`),
  getRelated: (id) => client.get(`/products/${id}/related`),
  getReviews: (id) => client.get(`/products/${id}/reviews`),
  canReview: (id) => client.get(`/products/${id}/can-review`),
  addReview: (id, data) => {
    const isFormData = data instanceof FormData;
    return client.post(`/products/${id}/reviews`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
  },
};

export const categoryApi = {
  list: () => client.get('/categories'),
  getOne: (slug) => client.get(`/categories/${slug}`),
  getSizeChart: (id) => client.get(`/categories/${id}/size-chart`),
};

export const comboApi = {
  list:   ()   => client.get('/combos'),
  getOne: (id) => client.get(`/combos/${id}`),
};



export const cartApi = {
  get: () => client.get('/cart'),
  add: (data) => client.post('/cart', data),
  update: (id, qty) => client.put(`/cart/${id}`, { quantity: qty }),
  remove: (id) => client.delete(`/cart/${id}`),
  clear: () => client.delete('/cart'),
};

export const orderApi = {
  place: (data) => client.post('/orders', data),
  verifyPayment: (data) => client.post('/orders/verify-payment', data),
  list: () => client.get('/orders'),
  getOne: (id) => client.get(`/orders/${id}`),
  cancel: (id) => client.post(`/orders/${id}/cancel`),
  returnRequest: (id, reason) => client.post(`/orders/${id}/return`, { reason }),
};

export const couponApi = {
  validate: (code, order_amount) =>
    client.post('/coupons/validate', { code, order_amount }),
};

export const loyaltyApi = {
  check: (phone) => client.get('/loyalty/check', { params: { phone } }),
  myCard: () => client.get('/loyalty/my-card'),
};

export const referralApi = {
  getInfo: () => client.get('/users/referral'),
};

export const walletApi = {
  get:             ()       => client.get('/wallet'),
  getTransactions: (params) => client.get('/wallet/transactions', { params }),
};

export const userApi = {
  getProfile: () => client.get('/users/profile'),
  updateProfile: (data) => client.put('/users/profile', data),
  getAddresses: () => client.get('/users/addresses'),
  addAddress: (data) => client.post('/users/addresses', data),
  updateAddress: (id, data) => client.put(`/users/addresses/${id}`, data),
  deleteAddress: (id) => client.delete(`/users/addresses/${id}`),
  getWishlist: () => client.get('/users/wishlist'),
  toggleWishlist: (product_id) =>
    client.post('/users/wishlist', { product_id }),
  getNotifications: () => client.get('/users/notifications'),
  markNotificationsRead: () => client.post('/users/notifications/read'),
};

export const settingsApi = {
  getPayment: () => client.get('/settings/payment'),
};

export const deliveryApi = {
  available: () => client.get('/delivery/available'),
  myOrders: () => client.get('/delivery/my-orders'),
  pickup: (token) => client.post('/delivery/pickup', { token }),
  resendOtp: (orderId) => client.post('/delivery/resend-otp', { orderId }),
  complete: (orderId, otp) => client.post('/delivery/complete', { orderId, otp }),
};

export const festivalApi = {
  getConfig: () => client.get('/festival/config'),
};
