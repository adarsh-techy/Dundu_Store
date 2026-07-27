/**
 * Online/offline backend split: branches, branch-tied admin logins,
 * branch-exclusive products, and POS orders have all been copied to the new
 * `dundu_offline` database (see backend-offline/scripts/copy-from-online.js,
 * verified row-for-row before this ran). This migration removes them from
 * the online DB and drops the columns that only existed to support them.
 */
exports.up = async (pgm) => {
  // Delete in FK-safe order: orders first (cascades order_items), then
  // branch-exclusive products (cascades variants/images), then branch admins,
  // then the branches table itself.
  pgm.sql(`DELETE FROM orders WHERE is_pos_order = true`);
  pgm.sql(`DELETE FROM products WHERE branch_id IS NOT NULL`);
  pgm.sql(`DELETE FROM users WHERE role = 'admin' AND branch_id IS NOT NULL`);

  pgm.dropColumns('products', ['branch_id']);
  pgm.dropColumns('orders', ['is_pos_order', 'branch_id', 'customer_name', 'customer_phone']);
  pgm.dropColumns('users', ['branch_id']);
  pgm.dropTable('branches');
};

exports.down = async (pgm) => {
  pgm.createTable('branches', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', notNull: true },
    address: { type: 'text' },
    phone: { type: 'varchar(20)' },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  });

  pgm.addColumns('users', {
    branch_id: { type: 'uuid', references: 'branches', onDelete: 'SET NULL' },
  });
  pgm.addColumns('products', {
    branch_id: { type: 'uuid', references: 'branches', onDelete: 'SET NULL' },
  });
  pgm.addColumns('orders', {
    is_pos_order: { type: 'boolean', default: false, notNull: true },
    branch_id: { type: 'uuid', references: 'branches', onDelete: 'SET NULL' },
    customer_name: { type: 'varchar(200)' },
    customer_phone: { type: 'varchar(20)' },
  });
};
