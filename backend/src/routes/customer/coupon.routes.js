const router = require('express').Router();
const db = require('../../config/db');
const { ok, badRequest } = require('../../utils/response');
const ah = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth/auth.middleware');

router.post('/validate', authenticate, ah(async (req, res) => {
  const { code, order_amount } = req.body;
  if (!code || typeof code !== 'string') return badRequest(res, 'Coupon code is required');

  const { rows } = await db.query(
    `SELECT * FROM coupons WHERE UPPER(code)=UPPER($1) AND is_active=true
     AND (expires_at IS NULL OR expires_at > now())
     AND (usage_limit IS NULL OR used_count < usage_limit)
     AND (user_id IS NULL OR user_id = $2)`,
    [code.trim(), req.user.id]
  );

  if (!rows.length) return badRequest(res, 'Invalid or expired coupon');
  const coupon = rows[0];

  if (coupon.per_user_limit) {
    const { rows: used } = await db.query(
      "SELECT COUNT(*)::int AS count FROM orders WHERE coupon_id=$1 AND user_id=$2 AND status <> 'cancelled'",
      [coupon.id, req.user.id]
    );
    if (used[0].count >= coupon.per_user_limit) return badRequest(res, 'You have already used this coupon');
  }

  const amount = Number(order_amount);
  if (coupon.min_order_value && (!Number.isFinite(amount) || amount < Number(coupon.min_order_value)))
    return badRequest(res, `Minimum order value ₹${coupon.min_order_value} required`);

  const { user_id, ...publicCoupon } = coupon;
  ok(res, { coupon: publicCoupon });
}));

module.exports = router;
