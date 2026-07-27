const db = require('../../config/db');
const { ok, created, notFound } = require('../../utils/response');

const list = async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM brands ORDER BY name');
  ok(res, { brands: rows });
};

const create = async (req, res) => {
  const { rows } = await db.query('INSERT INTO brands (name) VALUES ($1) RETURNING *', [req.body.name]);
  created(res, { brand: rows[0] });
};

const update = async (req, res) => {
  const { rows } = await db.query(
    'UPDATE brands SET name=$1 WHERE id=$2 RETURNING *',
    [req.body.name, req.params.id]
  );
  if (!rows.length) return notFound(res, 'Brand not found');
  ok(res, { brand: rows[0] });
};

const toggle = async (req, res) => {
  const { rows } = await db.query(
    'UPDATE brands SET is_active = NOT is_active WHERE id=$1 RETURNING *',
    [req.params.id]
  );
  if (!rows.length) return notFound(res, 'Brand not found');
  ok(res, { brand: rows[0] });
};

const remove = async (req, res) => {
  await db.query('DELETE FROM brands WHERE id=$1', [req.params.id]);
  ok(res, { message: 'Brand deleted' });
};

module.exports = { list, create, update, toggle, remove };
