const router = require('express').Router();
const db = require('../../config/db');
const { ok } = require('../../utils/response');
const ah = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth/auth.middleware');

router.get('/check', ah(async (req, res) => {
  const phone = (req.query.phone || '').replace(/\D/g, '');
  if (phone.length < 10) return res.status(400).json({ message: 'Valid phone number required' });
  const { rows } = await db.query(
    'SELECT id, phone, name, points, total_spent, created_at, updated_at FROM loyalty_cards WHERE phone=$1',
    [phone]
  );
  ok(res, { card: rows[0] || null });
}));

router.get('/my-card', authenticate, ah(async (req, res) => {
  const { rows: userRows } = await db.query('SELECT phone FROM users WHERE id=$1', [req.user.id]);
  const phone = (userRows[0]?.phone || '').replace(/\D/g, '');
  if (!phone) return ok(res, { card: null });
  const { rows } = await db.query(
    'SELECT id, phone, name, points, total_spent FROM loyalty_cards WHERE phone=$1',
    [phone]
  );
  ok(res, { card: rows[0] || null });
}));

module.exports = router;
