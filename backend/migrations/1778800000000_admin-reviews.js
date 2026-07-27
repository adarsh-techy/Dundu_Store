exports.up = (pgm) => {
  // Allow admin-created reviews: make user_id nullable, add reviewer_name
  pgm.alterColumn('reviews', 'user_id', { type: 'uuid', notNull: false });
  pgm.addColumn('reviews', {
    reviewer_name: { type: 'varchar(100)' },
    is_admin_created: { type: 'boolean', default: false },
  });

  // Drop old unique constraint (only worked when user_id was always present)
  pgm.dropConstraint('reviews', 'reviews_user_product_unique');

  // New partial unique: only one review per (user, product) when user is a real user
  pgm.sql(`
    CREATE UNIQUE INDEX reviews_user_product_unique
    ON reviews (user_id, product_id)
    WHERE user_id IS NOT NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS reviews_user_product_unique;');
  pgm.dropColumn('reviews', 'reviewer_name');
  pgm.dropColumn('reviews', 'is_admin_created');
  pgm.alterColumn('reviews', 'user_id', { type: 'uuid', notNull: true });
  pgm.addConstraint('reviews', 'reviews_user_product_unique', 'UNIQUE(user_id, product_id)');
};
