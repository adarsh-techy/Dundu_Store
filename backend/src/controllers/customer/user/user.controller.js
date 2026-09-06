const db = require('../../../config/db');
const bcrypt = require('bcryptjs');
const { ok, created, notFound, badRequest, unauthorized } = require('../../../utils/response');

const getProfile = async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, name, email, phone, avatar_url, date_of_birth, created_at FROM users WHERE id=$1',
    [req.user.id]
  );
  ok(res, { user: rows[0] });
};

const updateProfile = async (req, res) => {
  const { name, phone, avatar_url, date_of_birth } = req.body;
  const { rows } = await db.query(
    `UPDATE users SET name=$1, phone=$2, avatar_url=$3, date_of_birth=$4, updated_at=now()
     WHERE id=$5 RETURNING id,name,email,phone,avatar_url,date_of_birth`,
    [name, phone || req.user.phone, avatar_url, date_of_birth || null, req.user.id]
  );
  ok(res, { user: rows[0] });
};

const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return badRequest(res, 'Both passwords are required');
  const { rows } = await db.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  const valid = await bcrypt.compare(current_password, rows[0]?.password_hash || '');
  if (!valid) return unauthorized(res, 'Current password is incorrect');
  const hash = await bcrypt.hash(new_password, 10);
  await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
  ok(res, {}, 'Password changed successfully');
};

const getAddresses = async (req, res) => {
  const { rows } = await db.query('SELECT * FROM addresses WHERE user_id=$1 ORDER BY is_default DESC', [req.user.id]);
  ok(res, { addresses: rows });
};

const addAddress = async (req, res) => {
  const { name, phone, address_line1, address_line2, city, state, pincode, is_default } = req.body;

  if (is_default) {
    await db.query('UPDATE addresses SET is_default=false WHERE user_id=$1', [req.user.id]);
  }

  const { rows } = await db.query(
    `INSERT INTO addresses (user_id, name, phone, address_line1, address_line2, city, state, pincode, is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.user.id, name, phone, address_line1, address_line2 || null, city, state, pincode, !!is_default]
  );
  created(res, { address: rows[0] });
};

const updateAddress = async (req, res) => {
  const { name, phone, address_line1, address_line2, city, state, pincode, is_default } = req.body;

  if (is_default) {
    await db.query('UPDATE addresses SET is_default=false WHERE user_id=$1', [req.user.id]);
  }

  const { rows } = await db.query(
    `UPDATE addresses SET name=$1, phone=$2, address_line1=$3, address_line2=$4,
     city=$5, state=$6, pincode=$7, is_default=$8
     WHERE id=$9 AND user_id=$10 RETURNING *`,
    [name, phone, address_line1, address_line2 || null, city, state, pincode, !!is_default, req.params.id, req.user.id]
  );
  if (!rows.length) return notFound(res, 'Address not found');
  ok(res, { address: rows[0] });
};

const deleteAddress = async (req, res) => {
  await db.query('DELETE FROM addresses WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  ok(res, {}, 'Address deleted');
};

const getNotifications = async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  ok(res, { notifications: rows });
};

const markNotificationsRead = async (req, res) => {
  await db.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user.id]);
  ok(res, {}, 'Notifications marked as read');
};

module.exports = {
  getProfile, updateProfile, changePassword,
  getAddresses, addAddress, updateAddress, deleteAddress,
  getNotifications, markNotificationsRead,
};
