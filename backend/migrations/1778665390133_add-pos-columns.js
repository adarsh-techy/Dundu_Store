/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.addColumns('orders', {
    is_pos_order: { type: 'boolean', default: false, notNull: true },
    customer_phone: { type: 'varchar(20)' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('orders', ['is_pos_order', 'customer_phone']);
};
