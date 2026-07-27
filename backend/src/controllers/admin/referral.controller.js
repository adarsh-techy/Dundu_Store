const db = require('../../config/db');
const { ok } = require('../../utils/response');

const getStats = async (_req, res) => {
  const [totalRes, pendingRes, usedRes] = await Promise.all([
    db.query('SELECT COUNT(*) FROM users WHERE referred_by IS NOT NULL'),
    db.query('SELECT COUNT(*) FROM referral_rewards WHERE is_used = false'),
    db.query('SELECT COUNT(*) FROM referral_rewards WHERE is_used = true'),
  ]);
  ok(res, {
    total_referrals: parseInt(totalRes.rows[0].count),
    pending_rewards: parseInt(pendingRes.rows[0].count),
    used_rewards: parseInt(usedRes.rows[0].count),
  });
};

const getRewards = async (_req, res) => {
  const { rows } = await db.query(
    `SELECT rr.id, rr.user_id, rr.reward_type, rr.discount_percent, rr.is_used, rr.used_at, rr.created_at,
            u.name AS user_name, u.email AS user_email,
            o.order_number
     FROM referral_rewards rr
     JOIN users u ON rr.user_id = u.id
     LEFT JOIN orders o ON rr.order_id = o.id
     ORDER BY rr.created_at DESC
     LIMIT 100`
  );
  ok(res, { rewards: rows });
};

module.exports = { getStats, getRewards };
