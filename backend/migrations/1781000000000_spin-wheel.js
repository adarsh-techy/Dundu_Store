exports.up = async (pgm) => {
  pgm.createTable('spin_wheel_segments', {
    id:          { type: 'serial', primaryKey: true },
    label:       { type: 'varchar(100)', notNull: true },
    type:        { type: 'varchar(50)', notNull: true }, // 'coupon', 'loyalty_points', 'free_shipping', 'no_prize'
    value:       { type: 'numeric(10,2)', default: 0 },
    coupon_code: { type: 'varchar(50)' },
    color:       { type: 'varchar(20)', default: "'#E91E8C'" },
    text_color:  { type: 'varchar(20)', default: "'#FFFFFF'" },
    probability: { type: 'integer', notNull: true, default: 10 }, // weight
    is_active:   { type: 'boolean', default: true },
    sort_order:  { type: 'integer', default: 0 },
    created_at:  { type: 'timestamptz', default: pgm.func('now()') },
  }, { ifNotExists: true });

  pgm.createTable('spin_wheel_logs', {
    id:          { type: 'serial', primaryKey: true },
    user_id:     { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    phone:       { type: 'varchar(20)' },
    segment_id:  { type: 'integer', references: 'spin_wheel_segments', onDelete: 'SET NULL' },
    prize_label: { type: 'varchar(100)', notNull: true },
    prize_type:  { type: 'varchar(50)', notNull: true },
    prize_value: { type: 'numeric(10,2)', default: 0 },
    coupon_code: { type: 'varchar(50)' },
    created_at:  { type: 'timestamptz', default: pgm.func('now()') },
  }, { ifNotExists: true });

  pgm.createIndex('spin_wheel_logs', ['user_id'], { ifNotExists: true });
  pgm.createIndex('spin_wheel_logs', ['phone'], { ifNotExists: true });

  pgm.sql(`
    INSERT INTO settings (key, value) VALUES
      ('spin_wheel_enabled', 'true'),
      ('spin_wheel_cooldown_hours', '24'),
      ('spin_wheel_title', 'Spin & Win Real Rewards! 🎉'),
      ('spin_wheel_subtitle', 'Spin the wheel today and win exclusive discounts & gift rewards!')
    ON CONFLICT (key) DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO spin_wheel_segments (label, type, value, coupon_code, color, text_color, probability, sort_order) VALUES
      ('10% OFF',       'coupon',         10,  'SPIN10',   '#E91E8C', '#FFFFFF', 25, 1),
      ('₹100 OFF',      'coupon',         100, 'SPIN100',  '#8E24AA', '#FFFFFF', 15, 2),
      ('50 Points',     'loyalty_points', 50,  NULL,       '#3949AB', '#FFFFFF', 20, 3),
      ('Better Luck!',  'no_prize',       0,   NULL,       '#455A64', '#FFFFFF', 15, 4),
      ('Free Delivery', 'free_shipping',  0,   'SPINFREE', '#00897B', '#FFFFFF', 15, 5),
      ('15% OFF',       'coupon',         15,  'SPIN15',   '#F57C00', '#FFFFFF', 10, 6)
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = async (pgm) => {
  pgm.dropTable('spin_wheel_logs', { ifExists: true });
  pgm.dropTable('spin_wheel_segments', { ifExists: true });
};
