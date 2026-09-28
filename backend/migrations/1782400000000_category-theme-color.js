exports.up = (pgm) => {
  pgm.sql("ALTER TABLE categories ADD COLUMN IF NOT EXISTS theme_color varchar(30) DEFAULT NULL");
  pgm.sql("ALTER TABLE categories ADD COLUMN IF NOT EXISTS theme_bg_color varchar(30) DEFAULT NULL");
  pgm.sql("ALTER TABLE categories ADD COLUMN IF NOT EXISTS theme_enabled boolean DEFAULT false");
};

exports.down = (pgm) => {
  pgm.dropColumns('categories', ['theme_color', 'theme_bg_color', 'theme_enabled']);
};
