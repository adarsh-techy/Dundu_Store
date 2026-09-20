/**
 * cost_price ("Buy Price") on products and order_items — used to compute
 * profit on Price/Offer Price in the admin product form and the Finance
 * report. Previously only added lazily via an ad-hoc ALTER TABLE the first
 * time someone opened the Finance report; now a real, ordered migration so
 * the column always exists (e.g. product create/update, which now writes it).
 */
exports.up = (pgm) => {
  pgm.addColumns('products', {
    cost_price: { type: 'numeric(10,2)' },
  }, { ifNotExists: true });
  pgm.addColumns('order_items', {
    cost_price: { type: 'numeric(10,2)' },
  }, { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropColumns('products', ['cost_price'], { ifExists: true });
  pgm.dropColumns('order_items', ['cost_price'], { ifExists: true });
};
