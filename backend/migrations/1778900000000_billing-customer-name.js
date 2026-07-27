exports.up = (pgm) => {
  pgm.addColumn('orders', {
    customer_name: { type: 'varchar(200)' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('orders', 'customer_name');
};
