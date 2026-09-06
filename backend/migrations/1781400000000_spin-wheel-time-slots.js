exports.up = async (pgm) => {
  pgm.sql(`
    INSERT INTO settings (key, value) VALUES
      ('spin_wheel_require_login', 'true'),
      ('spin_wheel_time_slot', 'anytime'),
      ('spin_wheel_morning_start', '06:00'),
      ('spin_wheel_morning_end', '12:00'),
      ('spin_wheel_evening_start', '16:00'),
      ('spin_wheel_evening_end', '20:00'),
      ('spin_wheel_night_start', '20:00'),
      ('spin_wheel_night_end', '23:59')
    ON CONFLICT (key) DO NOTHING;
  `);
};

exports.down = async (pgm) => {
  pgm.sql(`
    DELETE FROM settings WHERE key IN (
      'spin_wheel_require_login',
      'spin_wheel_time_slot',
      'spin_wheel_morning_start',
      'spin_wheel_morning_end',
      'spin_wheel_evening_start',
      'spin_wheel_evening_end',
      'spin_wheel_night_start',
      'spin_wheel_night_end'
    );
  `);
};
