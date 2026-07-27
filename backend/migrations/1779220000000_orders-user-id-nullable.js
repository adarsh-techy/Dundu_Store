exports.up = (pgm) => {
  pgm.alterColumn('orders', 'user_id', { notNull: false });
};

exports.down = (pgm) => {
  pgm.alterColumn('orders', 'user_id', { notNull: true });
};
