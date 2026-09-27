const db = require('../../../config/db');
const trashService = require('../../../services/trash/trash.service');
const { ok, created, notFound } = require('../../../utils/response');

const list = async (_req, res) => {
  const { rows } = await db.query(`
    SELECT c.*,
           (SELECT COUNT(*)::int FROM orders WHERE coupon_id = c.id AND status NOT IN ('cancelled')) AS order_count,
           (SELECT COALESCE(SUM(discount), 0)::float FROM orders WHERE coupon_id = c.id AND status NOT IN ('cancelled')) AS total_discount_given,
           (SELECT COALESCE(SUM(total), 0)::float FROM orders WHERE coupon_id = c.id AND status NOT IN ('cancelled')) AS total_order_revenue
    FROM coupons c
    WHERE c.deleted_at IS NULL
    ORDER BY c.created_at DESC
  `);
  ok(res, { coupons: rows });
};

const create = async (req, res) => {
  const { code, discount_type, discount_value, min_order_value, max_discount, usage_limit, expires_at, is_active, per_user_limit } = req.body;
  const { rows } = await db.query(
    `INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_discount, usage_limit, expires_at, is_active, per_user_limit)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [code, discount_type, discount_value, min_order_value || 0, max_discount || null, usage_limit || null, expires_at || null, is_active !== false, per_user_limit || null]
  );
  created(res, { coupon: rows[0] });
};

const update = async (req, res) => {
  const { id } = req.params;
  const { code, discount_type, discount_value, min_order_value, max_discount, usage_limit, expires_at, is_active, per_user_limit } = req.body;
  const { rows } = await db.query(
    `UPDATE coupons SET code=$1, discount_type=$2, discount_value=$3, min_order_value=$4,
     max_discount=$5, usage_limit=$6, expires_at=$7, is_active=$8, per_user_limit=$10 WHERE id=$9 RETURNING *`,
    [code, discount_type, discount_value, min_order_value || 0, max_discount || null, usage_limit || null, expires_at || null, is_active !== false, id, per_user_limit || null]
  );
  if (!rows.length) return notFound(res);
  ok(res, { coupon: rows[0] });
};

const remove = async (req, res) => {
  const { id } = req.params;
  const row = await trashService.trash('coupons', id, req.user?.id);
  if (!row) return notFound(res);
  ok(res, {}, 'Coupon moved to Trash');
};

module.exports = { list, create, update, remove };
