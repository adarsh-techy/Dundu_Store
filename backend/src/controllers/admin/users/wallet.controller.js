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

  const { rows: userRows } = await db.query('SELECT id FROM users WHERE id=$1', [userId]);
  if (!userRows.length) return notFound(res, 'User not found');

  const fn = type === 'credit' ? walletService.credit : walletService.debit;
  const result = await fn(db, {
    userId,
    amount: amt,
    reason: type === 'credit' ? 'admin_credit' : 'admin_debit',
    referenceType: 'admin',
    referenceId: req.user.id,
    note: note.trim(),
    createdBy: req.user.id,
  });

  const wallet = result?.wallet ?? result; // credit() returns the wallet directly; debit() returns {success, wallet}
  if (type === 'debit' && result?.success === false) {
    return badRequest(res, `Insufficient wallet balance (current: ₹${Number(wallet.balance).toFixed(2)})`);
  }

  ok(res, { balance: Number(wallet.balance) }, `Wallet ${type === 'credit' ? 'credited' : 'debited'}`);
};

module.exports = { list, getTransactions, adjust };
