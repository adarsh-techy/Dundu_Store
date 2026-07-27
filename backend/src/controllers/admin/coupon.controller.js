const db = require('../../config/db');
const { ok, created, notFound } = require('../../utils/response');

const list = async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM coupons ORDER BY created_at DESC');
  ok(res, { coupons: rows });
};

const create = async (req, res) => {
  const { code, discount_type, discount_value, min_order_value, max_discount, usage_limit, expires_at, is_active } = req.body;
  const { rows } = await db.query(
    `INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_discount, usage_limit, expires_at, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [code, discount_type, discount_value, min_order_value || 0, max_discount || null, usage_limit || null, expires_at || null, is_active !== false]
  );
  created(res, { coupon: rows[0] });
};

const update = async (req, res) => {
  const { id } = req.params;
  const { code, discount_type, discount_value, min_order_value, max_discount, usage_limit, expires_at, is_active } = req.body;
  const { rows } = await db.query(
    `UPDATE coupons SET code=$1, discount_type=$2, discount_value=$3, min_order_value=$4,
     max_discount=$5, usage_limit=$6, expires_at=$7, is_active=$8 WHERE id=$9 RETURNING *`,
    [code, discount_type, discount_value, min_order_value || 0, max_discount || null, usage_limit || null, expires_at || null, is_active !== false, id]
  );
  if (!rows.length) return notFound(res);
  ok(res, { coupon: rows[0] });
};

const remove = async (req, res) => {
  const { id } = req.params;
  const { rows } = await db.query('DELETE FROM coupons WHERE id=$1 RETURNING id', [id]);
  if (!rows.length) return notFound(res);
  ok(res, {});
};

module.exports = { list, create, update, remove };
