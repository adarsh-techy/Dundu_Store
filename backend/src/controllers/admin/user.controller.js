const db = require('../../config/db');
const { ok, notFound, badRequest } = require('../../utils/response');
const { ADMIN_PERMISSIONS } = require('../../constants/permissions');

const list = async (req, res) => {
  const { page = 1, limit = 20, search, date } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const conditions = ["u.role='user'"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.phone ILIKE $${params.length})`);
  }
  if (date) {
    params.push(date);
    conditions.push(`u.created_at::date = $${params.length}::date`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const countParams = params.slice();

  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.is_blocked, u.avatar_url, u.created_at,
              u.referral_code, u.referred_by,
              ru.name AS referred_by_name,
              (SELECT COUNT(*)::integer FROM users r WHERE r.referred_by=u.referral_code) AS referred_count,
              EXISTS(
                SELECT 1 FROM loyalty_cards lc
                WHERE u.phone IS NOT NULL
                  AND lc.phone = REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g')
              ) AS is_offline
       FROM users u
       LEFT JOIN users ru ON ru.referral_code=u.referred_by
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    ),
    db.query(
      `SELECT COUNT(*)::integer FROM users u ${where}`,
      countParams
    ),
  ]);
  ok(res, { users: rows, total: countRes.rows[0].count });
};

const getOne = async (req, res) => {
  const [user, orders, addresses, referrals] = await Promise.all([
    db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.is_blocked, u.created_at,
              u.referral_code, u.referred_by,
              ru.name AS referred_by_name,
              EXISTS(
                SELECT 1 FROM loyalty_cards lc
                WHERE u.phone IS NOT NULL
                  AND lc.phone = REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g')
              ) AS is_offline
       FROM users u
       LEFT JOIN users ru ON ru.referral_code=u.referred_by
       WHERE u.id=$1`,
      [req.params.id]
    ),
    db.query('SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC', [req.params.id]),
    db.query('SELECT * FROM addresses WHERE user_id=$1', [req.params.id]),
    db.query(
      `SELECT id, name, email, phone, created_at FROM users WHERE referred_by=(
         SELECT referral_code FROM users WHERE id=$1
       ) ORDER BY created_at DESC`,
      [req.params.id]
    ),
  ]);
  if (!user.rows.length) return notFound(res, 'User not found');
  ok(res, { user: user.rows[0], orders: orders.rows, addresses: addresses.rows, referred_users: referrals.rows });
};

const toggleBlock = async (req, res) => {
  const { rows } = await db.query('SELECT is_blocked FROM users WHERE id=$1', [req.params.id]);
  if (!rows.length) return notFound(res);
  await db.query('UPDATE users SET is_blocked=$1 WHERE id=$2', [!rows[0].is_blocked, req.params.id]);
  ok(res, { is_blocked: !rows[0].is_blocked });
};

// Super admin only. Creates an online-store admin account — pass
// role='super_admin' for full access, otherwise a permission-scoped 'admin'
// account. Never branch-tied: branch logins are owned entirely by the
// Branches page in the offline (super-admin) app instead.
const createAdmin = async (req, res) => {
  const bcrypt = require('bcryptjs');
  const { name, email, phone, password, role } = req.body;
  const targetRole = role === 'super_admin' ? 'super_admin' : 'admin';

  if (!email?.trim()) return badRequest(res, 'Email is required');
  const { rows: existing } = await db.query('SELECT id FROM users WHERE email=$1', [email]);
  if (existing.length) return badRequest(res, 'Email already in use');

  let permissions = [];
  if (targetRole === 'admin') {
    permissions = Array.isArray(req.body.permissions)
      ? req.body.permissions.filter((p) => ADMIN_PERMISSIONS.includes(p))
      : [];
    if (!permissions.length) return badRequest(res, 'Grant at least one permission');
  }

  const password_hash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    `INSERT INTO users (name, email, phone, password_hash, role, permissions)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, phone, role, permissions`,
    [name, email, phone, password_hash, targetRole, JSON.stringify(permissions)]
  );
  ok(res, { admin: rows[0] }, targetRole === 'super_admin' ? 'Super admin created' : 'Admin created');
};

const updateAdminPermissions = async (req, res) => {
  const { rows: existing } = await db.query('SELECT role FROM users WHERE id=$1', [req.params.id]);
  if (!existing.length) return notFound(res, 'Admin not found');
  if (existing[0].role !== 'admin') return badRequest(res, 'Only admin accounts have editable permissions');

  const permissions = Array.isArray(req.body.permissions)
    ? req.body.permissions.filter((p) => ADMIN_PERMISSIONS.includes(p))
    : [];
  const { rows } = await db.query(
    `UPDATE users SET permissions=$1 WHERE id=$2 RETURNING id, name, email, phone, role, permissions`,
    [JSON.stringify(permissions), req.params.id]
  );
  ok(res, { admin: rows[0] }, 'Permissions updated');
};

const listAdmins = async (_req, res) => {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.permissions, u.is_blocked
     FROM users u
     WHERE u.role IN ('admin','super_admin')
     ORDER BY u.created_at DESC`
  );
  ok(res, { admins: rows });
};

// Super admin only. Blocks/unblocks another admin account (a blocked
// account is refused at login — see auth.controller#login). A super admin
// can never block themself, and the last active super admin can't be
// blocked either, so the panel can never be locked out entirely.
const toggleBlockAdmin = async (req, res) => {
  if (req.params.id === req.user.id) return badRequest(res, 'You cannot block your own account');

  const { rows } = await db.query('SELECT role, is_blocked FROM users WHERE id=$1', [req.params.id]);
  if (!rows.length) return notFound(res, 'Admin not found');
  if (!['admin', 'super_admin'].includes(rows[0].role)) return badRequest(res, 'Not an admin account');

  const nextBlocked = !rows[0].is_blocked;
  if (nextBlocked && rows[0].role === 'super_admin') {
    const { rows: activeSupers } = await db.query(
      "SELECT id FROM users WHERE role='super_admin' AND is_blocked=false"
    );
    if (activeSupers.length <= 1) return badRequest(res, 'Cannot block the last active super admin');
  }

  await db.query('UPDATE users SET is_blocked=$1 WHERE id=$2', [nextBlocked, req.params.id]);
  ok(res, { is_blocked: nextBlocked }, nextBlocked ? 'Admin blocked' : 'Admin unblocked');
};

// Super admin only. A super admin can't delete themself, and the last
// super admin account can't be deleted, for the same lockout-avoidance
// reason as above.
const deleteAdmin = async (req, res) => {
  if (req.params.id === req.user.id) return badRequest(res, 'You cannot delete your own account');

  const { rows } = await db.query('SELECT role FROM users WHERE id=$1', [req.params.id]);
  if (!rows.length) return notFound(res, 'Admin not found');
  if (!['admin', 'super_admin'].includes(rows[0].role)) return badRequest(res, 'Not an admin account');

  if (rows[0].role === 'super_admin') {
    const { rows: allSupers } = await db.query("SELECT id FROM users WHERE role='super_admin'");
    if (allSupers.length <= 1) return badRequest(res, 'Cannot delete the last super admin');
  }

  // orders has onDelete: RESTRICT — must clear any orders placed under this
  // account before the user row itself can be deleted.
  await db.query('DELETE FROM orders WHERE user_id=$1', [req.params.id]);
  await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  ok(res, {}, 'Admin deleted');
};

const deleteUser = async (req, res) => {
  const { rows } = await db.query('SELECT id, role, phone FROM users WHERE id=$1', [req.params.id]);
  if (!rows.length) return notFound(res, 'User not found');
  if (rows[0].role !== 'user') return res.status(403).json({ message: 'Cannot delete admin accounts from this endpoint' });

  const phone = (rows[0].phone || '').replace(/\D/g, '');
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // orders has onDelete: RESTRICT — must delete before the user row.
    // Deleting orders cascades → order_items, return_requests automatically.
    await client.query('DELETE FROM orders WHERE user_id=$1', [req.params.id]);

    // loyalty_cards links by phone (no FK to users) — delete manually.
    if (phone) await client.query('DELETE FROM loyalty_cards WHERE phone=$1', [phone]);

    // Finally delete the user — DB cascades: cart, wishlists, addresses,
    // reviews, notifications, referral_rewards.
    await client.query('DELETE FROM users WHERE id=$1', [req.params.id]);

    await client.query('COMMIT');
    ok(res, {}, 'User and all related data deleted');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { list, getOne, toggleBlock, createAdmin, updateAdminPermissions, toggleBlockAdmin, deleteAdmin, listAdmins, deleteUser };
