const db = require('../../../config/db');
const { ok, notFound, badRequest } = require('../../../utils/response');
const walletService = require('../../../services/wallet/wallet.service');

// List every user + their wallet balance (0 if they've never had a wallet
// row created yet), searchable by name/email/phone.
const list = async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const params = [];
  const conditions = ["u.role='user'"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.phone ILIKE $${params.length})`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const countParams = params.slice();

  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT u.id AS user_id, u.name, u.email, u.phone,
              COALESCE(w.balance, 0) AS balance, w.updated_at
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       ${where}
       ORDER BY COALESCE(w.balance, 0) DESC, u.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    ),
    db.query(`SELECT COUNT(*)::integer FROM users u ${where}`, countParams),
  ]);

  const [{ rows: totalsRows }] = await Promise.all([
    db.query('SELECT COALESCE(SUM(balance),0) AS total_balance, COUNT(*)::integer AS wallet_count FROM wallets'),
  ]);

  ok(res, {
    wallets: rows,
    total: countRes.rows[0].count,
    total_balance: Number(totalsRows[0].total_balance),
    wallet_count: totalsRows[0].wallet_count,
  });
};

const getTransactions = async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

  const { rows: userRows } = await db.query('SELECT id, name, email, phone FROM users WHERE id=$1', [userId]);
  if (!userRows.length) return notFound(res, 'User not found');

  const wallet = await walletService.getOrCreateWallet(db, userId);
  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT id, type, amount, balance_after, reason, reference_type, reference_id, note, created_by, created_at
       FROM wallet_transactions WHERE wallet_id=$1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [wallet.id, parseInt(limit), offset]
    ),
    db.query('SELECT COUNT(*) FROM wallet_transactions WHERE wallet_id=$1', [wallet.id]),
  ]);

  ok(res, {
    user: userRows[0],
    balance: Number(wallet.balance),
    transactions: rows,
    total: parseInt(countRes.rows[0].count),
  });
};

// Manual credit/debit by an admin — goodwill credit, correction, offline
// refund, etc. Always logged with the admin's id + a required reason note.
const adjust = async (req, res) => {
  const { userId } = req.params;
  const { type, amount, note } = req.body;

  if (!['credit', 'debit'].includes(type)) return badRequest(res, "type must be 'credit' or 'debit'");
  const amt = parseFloat(amount);
  if (!(amt > 0)) return badRequest(res, 'Amount must be greater than 0');
  if (!note || !note.trim()) return badRequest(res, 'A note explaining the adjustment is required');

  const { rows: userRows } = await db.query('SELECT id, role FROM users WHERE id=$1', [userId]);
  if (!userRows.length) return notFound(res, 'User not found');
  if (userRows[0].role !== 'user') return badRequest(res, 'Only customer accounts have a wallet');
  if (userId === req.user.id) return badRequest(res, 'You cannot adjust your own wallet');

  // Per-adjustment ceiling (setting `wallet_max_adjustment`, default ₹10,000) — super admins may exceed it.
  const { rows: capRows } = await db.query("SELECT value FROM settings WHERE key='wallet_max_adjustment'");
  const cap = parseFloat(capRows[0]?.value) || 10000;
  if (req.user.role !== 'super_admin' && amt > cap) {
    return badRequest(res, `Adjustments above ₹${cap} need a super admin`);
  }

  const client = await db.getClient();
  let result;
  try {
    await client.query('BEGIN');
    const fn = type === 'credit' ? walletService.credit : walletService.debit;
    result = await fn(client, {
      userId,
      amount: amt,
      reason: type === 'credit' ? 'admin_credit' : 'admin_debit',
      referenceType: 'admin',
      referenceId: req.user.id,
      note: note.trim(),
      createdBy: req.user.id,
    });
    if (type === 'debit' && result?.success === false) {
      await client.query('ROLLBACK');
      return badRequest(res, `Insufficient wallet balance (current: ₹${Number(result.wallet.balance).toFixed(2)})`);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  const wallet = result?.wallet ?? result; // credit() returns the wallet directly; debit() returns {success, wallet}

  ok(res, { balance: Number(wallet.balance) }, `Wallet ${type === 'credit' ? 'credited' : 'debited'}`);
};

const WALLET_KEYS = [
  'wallet_enabled',
  'wallet_max_usage_percent',
  'wallet_min_order_amount',
  'wallet_max_discount_cap',
  'wallet_welcome_bonus',
  'wallet_auto_refund_cancel',
  'wallet_auto_refund_return',
  'wallet_terms',
];

const getConfig = async (_req, res) => {
  const { rows } = await db.query(
    `SELECT key, value FROM settings WHERE key = ANY($1)`,
    [WALLET_KEYS]
  );
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  ok(res, {
    config: {
      enabled: cfg.wallet_enabled !== 'false',
      max_usage_percent: parseInt(cfg.wallet_max_usage_percent || '100', 10),
      min_order_amount: parseFloat(cfg.wallet_min_order_amount || '0'),
      max_discount_cap: parseFloat(cfg.wallet_max_discount_cap || '0'),
      welcome_bonus: parseFloat(cfg.wallet_welcome_bonus || '0'),
      auto_refund_cancel: cfg.wallet_auto_refund_cancel !== 'false',
      auto_refund_return: cfg.wallet_auto_refund_return !== 'false',
      terms: cfg.wallet_terms || 'Use Dundu Wallet for fast checkouts, cashback, and automated refunds.',
    },
  });
};

const updateConfig = async (req, res) => {
  const {
    enabled,
    max_usage_percent,
    min_order_amount,
    max_discount_cap,
    welcome_bonus,
    auto_refund_cancel,
    auto_refund_return,
    terms,
  } = req.body;

  const updates = [
    ['wallet_enabled', enabled === false ? 'false' : 'true'],
    ['wallet_max_usage_percent', String(max_usage_percent ?? 100)],
    ['wallet_min_order_amount', String(min_order_amount ?? 0)],
    ['wallet_max_discount_cap', String(max_discount_cap ?? 0)],
    ['wallet_welcome_bonus', String(welcome_bonus ?? 0)],
    ['wallet_auto_refund_cancel', auto_refund_cancel === false ? 'false' : 'true'],
    ['wallet_auto_refund_return', auto_refund_return === false ? 'false' : 'true'],
    ['wallet_terms', String(terms ?? '')],
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

module.exports = { list, getTransactions, adjust, getConfig, updateConfig };
