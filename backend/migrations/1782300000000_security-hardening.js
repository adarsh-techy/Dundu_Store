/* eslint-disable camelcase */
// Schema support for the security/money-logic hardening:
//  - OTP brute-force attempt counter
//  - one-time date-of-birth (birthday discount abuse)
//  - order bookkeeping needed to reverse discounts on cancel, and server-side shipping
//  - per-user / user-bound coupons (spin & scratch prizes)
//  - redeemable scratch-card prizes
//  - DB-level guarantee that quantities are positive
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql('ALTER TABLE otps ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0');
  pgm.sql('ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth_set_at TIMESTAMPTZ');
  pgm.sql('ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20)');
  pgm.sql('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0');
  pgm.sql('ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INT NOT NULL DEFAULT 0');
  pgm.sql('ALTER TABLE coupons ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE');
  pgm.sql('ALTER TABLE coupons ADD COLUMN IF NOT EXISTS per_user_limit INT');
  pgm.sql(`CREATE TABLE IF NOT EXISTS scratch_card_logs (
    id SERIAL PRIMARY KEY, user_id UUID, phone VARCHAR(50), user_name VARCHAR(255), prize_id INT,
    prize_label VARCHAR(255), prize_type VARCHAR(50), prize_value NUMERIC DEFAULT 0, coupon_code VARCHAR(100),
    order_id UUID, scratched_at TIMESTAMPTZ DEFAULT now())`);
  pgm.sql('ALTER TABLE scratch_card_logs ADD COLUMN IF NOT EXISTS is_redeemed BOOLEAN NOT NULL DEFAULT false');
  pgm.sql('ALTER TABLE spin_wheel_logs ADD COLUMN IF NOT EXISTS is_redeemed BOOLEAN DEFAULT false');
  pgm.sql('ALTER TABLE cart DROP CONSTRAINT IF EXISTS cart_quantity_positive');
  pgm.sql('ALTER TABLE cart ADD CONSTRAINT cart_quantity_positive CHECK (quantity > 0)');
  pgm.sql('ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_quantity_positive');
  pgm.sql('ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0)');
};

exports.down = (pgm) => {
  pgm.sql('ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_quantity_positive');
  pgm.sql('ALTER TABLE cart DROP CONSTRAINT IF EXISTS cart_quantity_positive');
  pgm.sql('ALTER TABLE scratch_card_logs DROP COLUMN IF EXISTS is_redeemed');
  pgm.sql('ALTER TABLE coupons DROP COLUMN IF EXISTS per_user_limit');
  pgm.sql('ALTER TABLE coupons DROP COLUMN IF EXISTS user_id');
  pgm.sql('ALTER TABLE orders DROP COLUMN IF EXISTS loyalty_points_redeemed');
  pgm.sql('ALTER TABLE orders DROP COLUMN IF EXISTS delivery_charge');
  pgm.sql('ALTER TABLE orders DROP COLUMN IF EXISTS discount_type');
  pgm.sql('ALTER TABLE users DROP COLUMN IF EXISTS date_of_birth_set_at');
  pgm.sql('ALTER TABLE otps DROP COLUMN IF EXISTS attempts');
};
