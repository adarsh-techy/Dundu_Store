// Wallet ledger service. Every function takes a `queryable` (the shared `db`
// pool, or a checked-out `client` inside a BEGIN/COMMIT transaction) so
// callers can compose wallet moves atomically with the rest of an order.

const round2 = (n) => Math.round(Number(n) * 100) / 100;

const getOrCreateWallet = async (queryable, userId) => {
  const { rows } = await queryable.query(
    `INSERT INTO wallets (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING *`,
    [userId]
  );
  return rows[0];
};

const getBalance = async (queryable, userId) => {
  const { rows } = await queryable.query('SELECT balance FROM wallets WHERE user_id=$1', [userId]);
  return rows.length ? Number(rows[0].balance) : 0;
};

/**
 * Add money to a user's wallet (refund, admin credit, etc.) and log the transaction.
 * Returns the updated wallet row, or null if amount <= 0.
 */
const credit = async (queryable, { userId, amount, reason, referenceType = null, referenceId = null, note = null, createdBy = null }) => {
  const amt = round2(amount);
  if (!(amt > 0)) return null;

  const wallet = await getOrCreateWallet(queryable, userId);
  const { rows } = await queryable.query(
    'UPDATE wallets SET balance = balance + $1, updated_at = now() WHERE id = $2 RETURNING *',
    [amt, wallet.id]
  );
  const updated = rows[0];
  await queryable.query(
    `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, reason, reference_type, reference_id, note, created_by)
     VALUES ($1,'credit',$2,$3,$4,$5,$6,$7,$8)`,
    [wallet.id, amt, updated.balance, reason, referenceType, referenceId, note, createdBy]
  );
  return updated;
};

/**
 * Subtract money from a user's wallet. Fails (does not go negative) if the
 * balance is insufficient. Locks the wallet row, so call this from inside a
 * transaction (a `client`, not the bare pool) whenever it must be atomic
 * with other writes (e.g. order placement).
 * Returns { success, wallet }.
 */
const debit = async (queryable, { userId, amount, reason, referenceType = null, referenceId = null, note = null, createdBy = null }) => {
  const amt = round2(amount);
  const wallet = await getOrCreateWallet(queryable, userId);
  if (!(amt > 0)) return { success: true, wallet };

  const { rows: locked } = await queryable.query('SELECT * FROM wallets WHERE id=$1 FOR UPDATE', [wallet.id]);
  const current = locked[0];
  if (Number(current.balance) < amt) {
    return { success: false, wallet: current };
  }

  const { rows } = await queryable.query(
    'UPDATE wallets SET balance = balance - $1, updated_at = now() WHERE id = $2 RETURNING *',
    [amt, wallet.id]
  );
  const updated = rows[0];
  await queryable.query(
    `INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, reason, reference_type, reference_id, note, created_by)
     VALUES ($1,'debit',$2,$3,$4,$5,$6,$7,$8)`,
    [wallet.id, amt, updated.balance, reason, referenceType, referenceId, note, createdBy]
  );
  return { success: true, wallet: updated };
};

module.exports = { getOrCreateWallet, getBalance, credit, debit };
