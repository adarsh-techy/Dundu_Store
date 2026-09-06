const db = require('../../../config/db');
const { ok } = require('../../../utils/response');
const walletService = require('../../../services/wallet/wallet.service');

const getWallet = async (req, res) => {
  const wallet = await walletService.getOrCreateWallet(db, req.user.id);
  ok(res, { wallet: { balance: Number(wallet.balance) } });
};

const listTransactions = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

  const wallet = await walletService.getOrCreateWallet(db, req.user.id);
  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT id, type, amount, balance_after, reason, reference_type, reference_id, note, created_at
       FROM wallet_transactions WHERE wallet_id=$1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [wallet.id, parseInt(limit), offset]
    ),
    db.query('SELECT COUNT(*) FROM wallet_transactions WHERE wallet_id=$1', [wallet.id]),
  ]);

  ok(res, {
    balance: Number(wallet.balance),
    transactions: rows,
    total: parseInt(countRes.rows[0].count),
  });
};

module.exports = { getWallet, listTransactions };
