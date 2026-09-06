const router = require('express').Router();
const db = require('../../config/db');
const { ok, badRequest } = require('../../utils/response');
const { authenticate } = require('../../middleware/auth/auth.middleware');

router.post('/validate', authenticate, async (req, res) => {
  const { code, order_amount } = req.body;
  if (!code) return badRequest(res, 'Coupon code is required');

  const { rows } = await db.query(
    `SELECT * FROM coupons WHERE UPPER(code)=UPPER($1) AND is_active=true
     AND (expires_at IS NULL OR expires_at > now())
     AND (usage_limit IS NULL OR used_count < usage_limit)`,
    [code]
  );

  if (!rows.length) return badRequest(res, 'Invalid or expired coupon');
  const coupon = rows[0];

  if (coupon.min_order_value && order_amount < coupon.min_order_value)
    return badRequest(res, `Minimum order value ₹${coupon.min_order_value} required`);

  ok(res, { coupon });
});

module.exports = router;
