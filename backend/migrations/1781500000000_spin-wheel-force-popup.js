exports.up = async (pgm) => {
  pgm.addColumns('users', {
    force_spin_popup: { type: 'boolean', default: false },
    last_forced_popup_at: { type: 'timestamp' },
  });

  pgm.sql(`
    INSERT INTO settings (key, value) VALUES ('spin_wheel_force_all_timestamp', '')
    ON CONFLICT (key) DO NOTHING;
  `);
};

exports.down = async (pgm) => {
  pgm.dropColumns('users', ['force_spin_popup', 'last_forced_popup_at'], { ifExists: true });
  pgm.sql("DELETE FROM settings WHERE key = 'spin_wheel_force_all_timestamp';");
};
