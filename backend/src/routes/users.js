const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const wishlistCtrl = require('../controllers/wishlist.controller');
const { authenticate } = require('../middleware/auth');
const db = require('../config/db');
const { ok, error } = require('../utils/response');

router.use(authenticate);

router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.put('/change-password', ctrl.changePassword);

router.get('/addresses', ctrl.getAddresses);
router.post('/addresses', ctrl.addAddress);
router.put('/addresses/:id', ctrl.updateAddress);
router.delete('/addresses/:id', ctrl.deleteAddress);

router.get('/wishlist', wishlistCtrl.getWishlist);
router.post('/wishlist', wishlistCtrl.toggleWishlist);

router.get('/notifications', ctrl.getNotifications);
router.post('/notifications/read', ctrl.markNotificationsRead);

router.get('/referral', async (req, res) => {
  try {
    const { rows: userRows } = await db.query(
      'SELECT referral_code FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!userRows.length) return error(res, 'User not found', 404);
    const { referral_code } = userRows[0];

    const { rows: referredRows } = await db.query(
      'SELECT COUNT(*)::integer AS count FROM users WHERE referred_by=$1',
      [referral_code]
    );
    const referredCount = referredRows[0]?.count || 0;

    const { rows: pendingRewards } = await db.query(
      `SELECT id, reward_type, discount_percent, created_at
       FROM referral_rewards WHERE user_id=$1 AND is_used=false ORDER BY created_at DESC`,
      [req.user.id]
    );

    const { rows: usedRewards } = await db.query(
      `SELECT id, reward_type, discount_percent, order_id, created_at
       FROM referral_rewards WHERE user_id=$1 AND is_used=true ORDER BY created_at DESC`,
      [req.user.id]
    );

    ok(res, {
      referral_code,
      referred_count: referredCount,
      pending_rewards: pendingRewards,
      used_rewards: usedRewards,
    });
  } catch (err) {
    console.error('referral info error:', err);
    error(res, err.message || 'Failed to fetch referral info');
  }
});

module.exports = router;
