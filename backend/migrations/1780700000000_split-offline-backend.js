/**
 * Online/offline backend split: branches, branch-tied admin logins,
 * branch-exclusive products, and POS orders have all been copied to the new
 * `dundu_offline` database. This migration removes them from
 * the online DB and drops the columns that only existed to support them.
 */
exports.up = async (pgm) => {
  pgm.sql(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='is_pos_order') THEN DELETE FROM orders WHERE is_pos_order = true; END IF; END $$;`);
  pgm.sql(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='branch_id') THEN DELETE FROM products WHERE branch_id IS NOT NULL; END IF; END $$;`);
  pgm.sql(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='branch_id') THEN DELETE FROM users WHERE role = 'admin' AND branch_id IS NOT NULL; END IF; END $$;`);

  pgm.dropColumns('products', ['branch_id'], { ifExists: true });
  pgm.dropColumns('orders', ['is_pos_order', 'branch_id', 'customer_name', 'customer_phone'], { ifExists: true });
  pgm.dropColumns('users', ['branch_id'], { ifExists: true });
  pgm.dropTable('branches', { ifExists: true });
};

exports.down = async (pgm) => {
  pgm.createTable('branches', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', notNull: true },
    address: { type: 'text' },
    phone: { type: 'varchar(20)' },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  }, { ifNotExists: true });

  pgm.addColumns('users', {
    branch_id: { type: 'uuid', references: 'branches', onDelete: 'SET NULL' },
  }, { ifNotExists: true });
  pgm.addColumns('products', {
    branch_id: { type: 'uuid', references: 'branches', onDelete: 'SET NULL' },
  }, { ifNotExists: true });
  pgm.addColumns('orders', {
    is_pos_order: { type: 'boolean', default: false, notNull: true },
    branch_id: { type: 'uuid', references: 'branches', onDelete: 'SET NULL' },
    customer_name: { type: 'varchar(200)' },
    customer_phone: { type: 'varchar(20)' },
  }, { ifNotExists: true });
};
