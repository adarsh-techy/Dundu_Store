const router = require('express').Router();
const db = require('../config/db');
const { ok } = require('../utils/response');
const ah = require('../utils/asyncHandler');

router.get('/', ah(async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM categories WHERE is_active=true ORDER BY sort_order');
  ok(res, { categories: rows });
}));

router.get('/:id/size-chart', ah(async (req, res) => {
  const { rows } = await db.query('SELECT id, name, size_chart_image, size_chart_data FROM categories WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
  const cat = rows[0];
  let tableData = null;
  try { tableData = typeof cat.size_chart_data === 'string' ? JSON.parse(cat.size_chart_data) : cat.size_chart_data; } catch {}
  ok(res, { size_chart_image: cat.size_chart_image || null, size_chart_data: tableData || null });
}));

router.get('/:slug', ah(async (req, res) => {
  const { rows } = await db.query('SELECT * FROM categories WHERE slug=$1 AND is_active=true', [req.params.slug]);
  rows.length ? ok(res, { category: rows[0] }) : res.status(404).json({ success: false, message: 'Not found' });
}));

module.exports = router;

