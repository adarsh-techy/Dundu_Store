exports.up = async (pgm) => {
  pgm.addColumns('spin_wheel_logs', {
    is_redeemed: { type: 'boolean', default: false },
  });
};

exports.down = async (pgm) => {
  pgm.dropColumns('spin_wheel_logs', ['is_redeemed'], { ifExists: true });
};
