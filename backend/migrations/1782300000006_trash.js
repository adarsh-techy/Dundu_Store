/* eslint-disable camelcase */
// Soft delete ("Trash") for catalogue and marketing records: deleted_at marks the row as
// trashed, deleted_by records the admin, trash_meta remembers the pre-delete state so
// Restore can put it back exactly. Customer-facing queries already filter on is_active /
// is_hidden, which the soft delete also flips.
exports.shorthands = undefined;
const TABLES = ['products', 'categories', 'combos', 'coupons', 'banners', 'announcements'];
exports.up = (pgm) => {
  for (const t of TABLES) {
    pgm.sql(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    pgm.sql(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS deleted_by UUID`);
    pgm.sql(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS trash_meta JSONB`);
    pgm.sql(`CREATE INDEX IF NOT EXISTS ${t}_deleted_at_idx ON ${t} (deleted_at) WHERE deleted_at IS NOT NULL`);
  }
};
exports.down = (pgm) => {
  for (const t of TABLES) {
    pgm.sql(`ALTER TABLE ${t} DROP COLUMN IF EXISTS trash_meta`);
    pgm.sql(`ALTER TABLE ${t} DROP COLUMN IF EXISTS deleted_by`);
    pgm.sql(`ALTER TABLE ${t} DROP COLUMN IF EXISTS deleted_at`);
  }
};
