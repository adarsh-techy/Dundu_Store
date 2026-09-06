exports.up = (pgm) => {
  pgm.createTable('login_logs', {
    id:         { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id:    { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  }, { ifNotExists: true });
  pgm.createIndex('login_logs', ['user_id', 'created_at'], { ifNotExists: true });

  pgm.createTable('product_views', {
    id:         { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id:    { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  }, { ifNotExists: true });
  pgm.createIndex('product_views', ['user_id', 'created_at'], { ifNotExists: true });
  pgm.createIndex('product_views', ['product_id'], { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropTable('product_views');
  pgm.dropTable('login_logs');
};
