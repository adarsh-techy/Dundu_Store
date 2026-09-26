/* eslint-disable camelcase */
// Bookkeeping needed to make refunds idempotent and loyalty reversible:
//  - orders.loyalty_points_earned   points granted by this order (clawed back on cancel/return)
//  - orders.delivered_at            first time the order became delivered (drives the return window)
//  - orders.razorpay_refund_id      gateway refund reference; presence = already refunded
//  - wallets.balance CHECK >= 0     the ledger can never go negative even under races
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql('ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_earned INT NOT NULL DEFAULT 0');
  pgm.sql('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ');
  pgm.sql('ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_refund_id VARCHAR(100)');
  pgm.sql("UPDATE orders SET delivered_at = COALESCE(delivery_completed_at, updated_at) WHERE status::text IN ('delivered','return_requested','returned') AND delivered_at IS NULL");
  pgm.sql('ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_balance_non_negative');
  pgm.sql('ALTER TABLE wallets ADD CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0)');
  // `settings` is created lazily by initDb on first boot; make sure it exists on a fresh database.
  pgm.sql("CREATE TABLE IF NOT EXISTS settings (key VARCHAR(100) PRIMARY KEY, value TEXT NOT NULL DEFAULT '')");
  pgm.sql("INSERT INTO settings (key, value) VALUES ('wallet_max_adjustment', '10000') ON CONFLICT (key) DO NOTHING");
};

exports.down = (pgm) => {
  pgm.sql('ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_balance_non_negative');
  pgm.sql('ALTER TABLE orders DROP COLUMN IF EXISTS razorpay_refund_id');
  pgm.sql('ALTER TABLE orders DROP COLUMN IF EXISTS delivered_at');
  pgm.sql('ALTER TABLE orders DROP COLUMN IF EXISTS loyalty_points_earned');
};
