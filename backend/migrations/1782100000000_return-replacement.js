exports.up = (pgm) => {
  pgm.addColumns('return_requests', {
    // Set when refund_method='replacement' — the new $0 order created to ship a
    // replacement of the same item(s) instead of refunding money.
    replacement_order_id: { type: 'uuid', references: 'orders', onDelete: 'SET NULL' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('return_requests', ['replacement_order_id']);
};
