/* eslint-disable camelcase */
// `is_cod_blocked` was referenced by the order and admin-user code but never created by
// any migration, so every checkout failed with "column is_cod_blocked does not exist".
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_cod_blocked BOOLEAN NOT NULL DEFAULT false');
};

exports.down = (pgm) => {
  pgm.sql('ALTER TABLE users DROP COLUMN IF EXISTS is_cod_blocked');
};
