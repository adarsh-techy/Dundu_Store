exports.up = (pgm) => {
  pgm.addColumns('users', {
    referral_code: { type: 'varchar(20)', unique: true },
    referred_by: { type: 'varchar(20)' },
  });
  pgm.createTable('referral_rewards', {
    id: { type: 'serial', primaryKey: true },
    user_id: { type: 'uuid', notNull: true, references: '"users"', onDelete: 'cascade' },
    reward_type: { type: 'varchar(20)', notNull: true }, // 'referrer' or 'referred'
    discount_percent: { type: 'integer', notNull: true },
    is_used: { type: 'boolean', notNull: true, default: false },
    order_id: { type: 'uuid', references: '"orders"', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.sql(`
    INSERT INTO settings (key, value) VALUES
      ('referrer_discount_percent', '20'),
      ('referred_discount_percent', '30')
    ON CONFLICT (key) DO NOTHING
  `);
};
exports.down = (pgm) => {
  pgm.dropTable('referral_rewards');
  pgm.dropColumns('users', ['referral_code', 'referred_by']);
};
