exports.up = (pgm) => {
  pgm.createTable('announcements', {
    id:         { type: 'serial', primaryKey: true },
    text:       { type: 'text', notNull: true },
    bg_color:   { type: 'varchar(20)', default: "'#e91e8c'" },
    text_color: { type: 'varchar(20)', default: "'#ffffff'" },
    is_active:  { type: 'boolean', default: true },
    sort_order: { type: 'integer', default: 0 },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('announcements');
};
