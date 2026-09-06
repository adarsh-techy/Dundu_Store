exports.up = (pgm) => {
  pgm.createTable('settings', {
    key:   { type: 'varchar(100)', primaryKey: true },
    value: { type: 'text', notNull: true },
  }, { ifNotExists: true });
  pgm.sql("INSERT INTO settings (key, value) VALUES ('popup_interval_minutes', '10') ON CONFLICT (key) DO NOTHING");
};

exports.down = (pgm) => {
  pgm.dropTable('settings');
};
