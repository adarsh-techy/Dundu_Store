exports.up = (pgm) => {
  pgm.createTable('loyalty_cards', {
    id: { type: 'bigserial', primaryKey: true },
    phone: { type: 'varchar(20)', notNull: true, unique: true },
    name: { type: 'varchar(100)' },
    points: { type: 'integer', notNull: true, default: 0 },
    total_spent: { type: 'decimal(12,2)', notNull: true, default: 0 },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  }, { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropTable('loyalty_cards');
};
