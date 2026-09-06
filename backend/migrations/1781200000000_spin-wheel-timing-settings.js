exports.up = async (pgm) => {
  pgm.sql(`
    INSERT INTO settings (key, value) VALUES
      ('spin_wheel_delay_seconds', '3'),
      ('spin_wheel_max_per_day', '1'),
      ('spin_wheel_start_time', '00:00'),
      ('spin_wheel_end_time', '23:59')
    ON CONFLICT (key) DO NOTHING;
  `);
};

exports.down = async (pgm) => {
  pgm.sql(`
    DELETE FROM settings WHERE key IN ('spin_wheel_delay_seconds', 'spin_wheel_max_per_day', 'spin_wheel_start_time', 'spin_wheel_end_time');
  `);
};
