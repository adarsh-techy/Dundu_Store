exports.up = async (pgm) => {
  pgm.addColumns('spin_wheel_segments', {
    target_user_type: { type: 'varchar(50)', default: "'all'" }, // 'all', 'new_users', 'existing_users', 'vip_users'
  });

  pgm.createTable('spin_wheel_user_targets', {
    id:                 { type: 'serial', primaryKey: true },
    user_id:            { type: 'uuid', references: 'users', onDelete: 'CASCADE' },
    phone:              { type: 'varchar(20)' },
    segment_id:         { type: 'integer', references: 'spin_wheel_segments', onDelete: 'CASCADE' },
    custom_prize_label: { type: 'varchar(100)' },
    custom_prize_type:  { type: 'varchar(50)' }, // 'coupon', 'loyalty_points', 'free_shipping', 'no_prize'
    custom_prize_value: { type: 'numeric(10,2)', default: 0 },
    custom_coupon_code: { type: 'varchar(50)' },
    is_claimed:         { type: 'boolean', default: false },
    is_active:          { type: 'boolean', default: true },
    created_at:         { type: 'timestamptz', default: pgm.func('now()') },
  }, { ifNotExists: true });

  pgm.createIndex('spin_wheel_user_targets', ['user_id', 'is_claimed', 'is_active'], { ifNotExists: true });
  pgm.createIndex('spin_wheel_user_targets', ['phone', 'is_claimed', 'is_active'], { ifNotExists: true });
};

exports.down = async (pgm) => {
  pgm.dropTable('spin_wheel_user_targets', { ifExists: true });
  pgm.dropColumns('spin_wheel_segments', ['target_user_type'], { ifExists: true });
};
