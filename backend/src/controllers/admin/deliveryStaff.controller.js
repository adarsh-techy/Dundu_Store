const bcrypt = require('bcryptjs');
const db = require('../../config/db');
const { ok, notFound, badRequest } = require('../../utils/response');

const list = async (_req, res) => {
  const { rows } = await db.query(
    `SELECT id, name, email, phone, is_blocked, created_at
     FROM users WHERE role='delivery_staff'
     ORDER BY created_at DESC`
  );
  ok(res, { staff: rows });
};

const create = async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name?.trim()) return badRequest(res, 'Name is required');
  if (!phone?.trim()) return badRequest(res, 'Phone is required');
  if (!password) return badRequest(res, 'Password is required');

  const { rows: existing } = await db.query(
    'SELECT id FROM users WHERE phone=$1 OR (email IS NOT NULL AND email=$2)',
    [phone, email || null]
  );
  if (existing.length) return badRequest(res, 'Phone or email already in use');

  const password_hash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    `INSERT INTO users (name, email, phone, password_hash, role)
     VALUES ($1,$2,$3,$4,'delivery_staff') RETURNING id, name, email, phone, is_blocked, created_at`,
    [name, email || null, phone, password_hash]
  );
  ok(res, { staff: rows[0] }, 'Delivery staff account created');
};

const toggleBlock = async (req, res) => {
  const { rows } = await db.query("SELECT is_blocked FROM users WHERE id=$1 AND role='delivery_staff'", [req.params.id]);
  if (!rows.length) return notFound(res, 'Delivery staff not found');

  const nextBlocked = !rows[0].is_blocked;
  await db.query('UPDATE users SET is_blocked=$1 WHERE id=$2', [nextBlocked, req.params.id]);
  ok(res, { is_blocked: nextBlocked }, nextBlocked ? 'Delivery staff blocked' : 'Delivery staff unblocked');
};

const remove = async (req, res) => {
  const { rows } = await db.query("SELECT id FROM users WHERE id=$1 AND role='delivery_staff'", [req.params.id]);
  if (!rows.length) return notFound(res, 'Delivery staff not found');

  await db.query('UPDATE orders SET picked_up_by=NULL WHERE picked_up_by=$1', [req.params.id]);
  await db.query('UPDATE orders SET delivered_by=NULL WHERE delivered_by=$1', [req.params.id]);
  await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  ok(res, {}, 'Delivery staff deleted');
};

module.exports = { list, create, toggleBlock, remove };
