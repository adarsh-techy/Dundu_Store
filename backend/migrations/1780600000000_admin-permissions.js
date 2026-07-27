exports.up = async (pgm) => {
  pgm.addColumn('users', {
    permissions: { type: 'jsonb', notNull: true, default: pgm.func("'[]'::jsonb") },
  });

  // Grandfather in existing branch admins with full access to the areas
  // they already had before permissions existed, so nobody is locked out.
  pgm.sql(`
    UPDATE users SET permissions = '["billing","orders","returns","loyalty","reports"]'::jsonb
    WHERE role = 'admin'
  `);
};

exports.down = (pgm) => {
  pgm.dropColumns('users', ['permissions']);
};
