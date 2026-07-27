exports.up = (pgm) => {
  pgm.addColumns('orders', {
    loyalty_discount: { type: 'numeric(10,2)', default: 0, notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('orders', ['loyalty_discount']);
};
