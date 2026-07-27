exports.up = (pgm) => {
  pgm.addColumn('products', {
    product_code: { type: 'varchar(100)', unique: true },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('products', 'product_code');
};
