/* eslint-disable camelcase */
// Combo bundles are expanded into their selected products at checkout; this records
// which bundle each line came from.
exports.shorthands = undefined;
exports.up = (pgm) => {
  pgm.sql('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS combo_id UUID REFERENCES combos(id) ON DELETE SET NULL');
};
exports.down = (pgm) => {
  pgm.sql('ALTER TABLE order_items DROP COLUMN IF EXISTS combo_id');
};
