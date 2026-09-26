/* eslint-disable camelcase */
// The admin referral page reads referral_rewards.used_at, which no migration ever created (500 on load).
exports.shorthands = undefined;
exports.up = (pgm) => {
  pgm.sql('ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ');
  pgm.sql("UPDATE referral_rewards rr SET used_at = COALESCE(o.created_at, rr.created_at) FROM orders o WHERE rr.order_id = o.id AND rr.is_used = true AND rr.used_at IS NULL");
};
exports.down = (pgm) => {
  pgm.sql('ALTER TABLE referral_rewards DROP COLUMN IF EXISTS used_at');
};
