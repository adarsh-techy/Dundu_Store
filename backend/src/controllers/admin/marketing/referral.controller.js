const db = require('../../../config/db');
const { ok, badRequest } = require('../../../utils/response');

const REFERRAL_KEYS = [
  'referral_program_enabled',
  'referrer_discount_percent',
  'referred_discount_percent',
  'referral_min_order_amount',
  'referral_max_discount_cap',
  'referral_reward_validity_days',
  'referral_share_message',
];

const getConfig = async (_req, res) => {
  const { rows } = await db.query(
    `SELECT key, value FROM settings WHERE key = ANY($1)`,
    [REFERRAL_KEYS]
  );
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  ok(res, {
    config: {
      enabled: cfg.referral_program_enabled !== 'false',
      referrer_discount_percent: parseInt(cfg.referrer_discount_percent || '20', 10),
      referred_discount_percent: parseInt(cfg.referred_discount_percent || '30', 10),
      min_order_amount: parseFloat(cfg.referral_min_order_amount || '500'),
      max_discount_cap: parseFloat(cfg.referral_max_discount_cap || '500'),
      validity_days: parseInt(cfg.referral_reward_validity_days || '30', 10),
      share_message: cfg.referral_share_message || 'Shop on Dundu Online using my referral code {code} to get a special discount on your first order! 🛍️✨',
    },
  });
};

const updateConfig = async (req, res) => {
  const {
    enabled,
    referrer_discount_percent,
    referred_discount_percent,
    min_order_amount,
    max_discount_cap,
    validity_days,
    share_message,
  } = req.body;

  const referrerPct = referrer_discount_percent ?? 20;
  const referredPct = referred_discount_percent ?? 30;
  if (referrerPct < 1 || referrerPct > 100 || referredPct < 1 || referredPct > 100) {
    return badRequest(res, 'Discount percentages must be between 1 and 100');
  }

  const updates = [
    ['referral_program_enabled', enabled === false ? 'false' : 'true'],
    ['referrer_discount_percent', String(referrerPct)],
    ['referred_discount_percent', String(referredPct)],
    ['referral_min_order_amount', String(min_order_amount ?? 500)],
    ['referral_max_discount_cap', String(max_discount_cap ?? 500)],
    ['referral_reward_validity_days', String(validity_days ?? 30)],
    ['referral_share_message', String(share_message ?? '')],
  ];

  for (const [key, value] of updates) {
    await db.query(
      `INSERT INTO settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value]
    );
  }

  return getConfig(req, res);
};

const getStats = async (_req, res) => {
  const [totalRes, pendingRes, usedRes, revenueRes] = await Promise.all([
    db.query('SELECT COUNT(*) FROM users WHERE referred_by IS NOT NULL'),
    db.query('SELECT COUNT(*) FROM referral_rewards WHERE is_used = false'),
    db.query('SELECT COUNT(*) FROM referral_rewards WHERE is_used = true'),
    db.query(`
      SELECT COALESCE(SUM(o.total), 0) AS total_revenue
      FROM referral_rewards rr
      JOIN orders o ON rr.order_id = o.id
      WHERE rr.is_used = true AND o.status <> 'cancelled'
    `),
  ]);
  ok(res, {
    total_referrals: parseInt(totalRes.rows[0].count),
    pending_rewards: parseInt(pendingRes.rows[0].count),
    used_rewards: parseInt(usedRes.rows[0].count),
    total_revenue: parseFloat(revenueRes.rows[0]?.total_revenue || 0),
  });
};

const getRewards = async (req, res) => {
  const { page = 1, limit = 20, type = 'all', status = 'all', search = '' } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];

  if (type && type !== 'all') {
    params.push(type);
    conditions.push(`rr.reward_type = $${params.length}`);
  }

  if (status === 'used') {
    conditions.push('rr.is_used = true');
  } else if (status === 'pending') {
    conditions.push('rr.is_used = false');
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR o.order_number ILIKE $${params.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT rr.id, rr.user_id, rr.reward_type, rr.discount_percent, rr.is_used, rr.used_at, rr.created_at,
              u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
              o.order_number, o.total AS order_total
       FROM referral_rewards rr
       JOIN users u ON rr.user_id = u.id
       LEFT JOIN orders o ON rr.order_id = o.id
       ${whereClause}
       ORDER BY rr.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    ),
    db.query(
      `SELECT COUNT(*) FROM referral_rewards rr
       JOIN users u ON rr.user_id = u.id
       LEFT JOIN orders o ON rr.order_id = o.id
       ${whereClause}`,
      params
    ),
  ]);

  ok(res, {
    rewards: rows,
    total: parseInt(countRes.rows[0].count, 10),
  });
};

module.exports = { getConfig, updateConfig, getStats, getRewards };
