exports.up = async (pgm) => {
  pgm.addColumns('users', {
    spin_wheel_enabled: { type: 'boolean', default: true },
  });

  pgm.createIndex('users', ['spin_wheel_enabled'], { ifNotExists: true });
};

exports.down = async (pgm) => {
  pgm.dropColumns('users', ['spin_wheel_enabled'], { ifExists: true });
};
