exports.up = (pgm) => {
  pgm.addColumns('banners', {
    badge_text:   { type: 'varchar(100)', default: null },
    badge_active: { type: 'boolean', default: false },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('banners', ['badge_text', 'badge_active']);
};
