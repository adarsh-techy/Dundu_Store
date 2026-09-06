exports.up = (pgm) => {
  pgm.createTable('wallets', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, unique: true, references: 'users', onDelete: 'CASCADE' },
    balance: { type: 'decimal(12,2)', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  }, { ifNotExists: true });

  pgm.createTable('wallet_transactions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    wallet_id: { type: 'uuid', notNull: true, references: 'wallets', onDelete: 'CASCADE' },
    // 'credit' adds to balance, 'debit' subtracts from it
    type: { type: 'varchar(10)', notNull: true },
    amount: { type: 'decimal(12,2)', notNull: true },
    balance_after: { type: 'decimal(12,2)', notNull: true },
    // order_payment | order_refund | return_refund | admin_credit | admin_debit
    reason: { type: 'varchar(50)', notNull: true },
    reference_type: { type: 'varchar(30)' }, // 'order' | 'return_request' | 'admin'
    reference_id: { type: 'uuid' },
    note: { type: 'text' },
    created_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' }, // admin id, null if system/customer-triggered
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  }, { ifNotExists: true });
  pgm.createIndex('wallet_transactions', 'wallet_id');
  pgm.createIndex('wallet_transactions', 'created_at');

  pgm.addColumns('orders', {
    wallet_amount: { type: 'decimal(12,2)', notNull: true, default: 0 },
    // tracks whether wallet_amount has actually been deducted yet (immediately for
    // COD, only after payment verification for online orders) so cancelOrder knows
    // whether a refund-to-wallet is owed
    wallet_debited: { type: 'boolean', notNull: true, default: false },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('orders', ['wallet_amount', 'wallet_debited']);
  pgm.dropTable('wallet_transactions');
  pgm.dropTable('wallets');
};
