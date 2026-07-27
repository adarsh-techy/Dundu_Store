exports.up = (pgm) => {
  pgm.addColumn('product_images', {
    color: { type: 'varchar(50)', default: null },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('product_images', 'color');
};
