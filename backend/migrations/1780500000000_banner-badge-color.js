exports.up = (pgm) => {
  pgm.sql("ALTER TABLE banners ADD COLUMN IF NOT EXISTS badge_color varchar(20) DEFAULT '#e91e8c'");
};

exports.down = (pgm) => {
  pgm.dropColumns('banners', ['badge_color']);
};
