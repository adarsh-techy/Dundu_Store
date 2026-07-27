exports.up = (pgm) => {
  pgm.addConstraint('products', 'products_stock_non_negative', 'CHECK (stock >= 0)');
  pgm.addConstraint('product_variants', 'product_variants_stock_non_negative', 'CHECK (stock >= 0)');
};

exports.down = (pgm) => {
  pgm.dropConstraint('products', 'products_stock_non_negative');
  pgm.dropConstraint('product_variants', 'product_variants_stock_non_negative');
};
