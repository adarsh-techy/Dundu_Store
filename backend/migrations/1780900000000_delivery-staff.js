// Uses IF NOT EXISTS throughout — an app instance running alongside this
// migration already applies the same changes at boot (see the runtime
// safety migrations in src/routes/admin/index.js), so this must be safe
// to run whether or not that's already happened.
exports.up = async (pgm) => {
  pgm.sql("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'delivery_staff'");

  pgm.sql('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_qr_token varchar(64) UNIQUE');
  pgm.sql("ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_by uuid REFERENCES users(id) ON DELETE SET NULL");
  pgm.sql('ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_at timestamptz');
  pgm.sql("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_by uuid REFERENCES users(id) ON DELETE SET NULL");
  pgm.sql('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_completed_at timestamptz');
};

exports.down = async (pgm) => {
  pgm.dropColumns('orders', [
    'delivery_qr_token',
    'picked_up_by',
    'picked_up_at',
    'delivered_by',
    'delivery_completed_at',
  ]);
  // Postgres has no DROP VALUE for enums — leaving 'delivery_staff' in
  // user_role on rollback is harmless (no code path can set it once the
  // routes/controllers built around it are also rolled back).
};
