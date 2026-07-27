exports.up = (pgm) => {
  pgm.addColumn('products', {
    is_new_arrival: { type: 'boolean', default: false, notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('products', 'is_new_arrival');
};
