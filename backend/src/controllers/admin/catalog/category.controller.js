const db = require('../../../config/db');
const trashService = require('../../../services/trash/trash.service');
const { ok, created, notFound, badRequest } = require('../../../utils/response');
const { getFileUrl } = require('../../../utils/upload');

const list = async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY sort_order');
  ok(res, { categories: rows });
};

const create = async (req, res) => {
  const { name, slug, sort_order, theme_enabled, theme_color, theme_bg_color } = req.body;
  const image_url = req.file ? getFileUrl(req.file) : (req.body.image_url || null);
  const isThemeEnabled = theme_enabled === 'true' || theme_enabled === true;
  const { rows } = await db.query(
    'INSERT INTO categories (name, slug, image_url, sort_order, theme_enabled, theme_color, theme_bg_color) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [name, slug, image_url, sort_order || 0, isThemeEnabled, theme_color || null, theme_bg_color || null]
  );
  created(res, { category: rows[0] });
};

const update = async (req, res) => {
  const { name, slug, sort_order, sub_categories, types, theme_enabled, theme_color, theme_bg_color } = req.body;
  const existing = await db.query('SELECT * FROM categories WHERE id=$1', [req.params.id]);
  if (!existing.rows.length) return notFound(res, 'Category not found');
  const existingRow = existing.rows[0];
  const image_url = req.file
    ? getFileUrl(req.file)
    : (req.body.image_url || existingRow.image_url);
  const subCatsJson = sub_categories !== undefined
    ? (typeof sub_categories === 'string' ? sub_categories : JSON.stringify(sub_categories))
    : JSON.stringify(existingRow.sub_categories || []);
  const typesJson = types !== undefined
    ? (typeof types === 'string' ? types : JSON.stringify(types))
    : JSON.stringify(existingRow.types || []);
  const isThemeEnabled = theme_enabled !== undefined
    ? (theme_enabled === 'true' || theme_enabled === true)
    : Boolean(existingRow.theme_enabled);
  const finalThemeColor = theme_color !== undefined ? (theme_color || null) : existingRow.theme_color;
  const finalThemeBgColor = theme_bg_color !== undefined ? (theme_bg_color || null) : existingRow.theme_bg_color;

  const { rows } = await db.query(
    'UPDATE categories SET name=$1, slug=$2, image_url=$3, sort_order=$4, sub_categories=$5, types=$6, theme_enabled=$7, theme_color=$8, theme_bg_color=$9 WHERE id=$10 RETURNING *',
    [name, slug, image_url, sort_order || 0, subCatsJson, typesJson, isThemeEnabled, finalThemeColor, finalThemeBgColor, req.params.id]
  );
  ok(res, { category: rows[0] });
};

const updateMeta = async (req, res) => {
  const { sub_categories, types, materials, patterns } = req.body;
  const existing = await db.query('SELECT * FROM categories WHERE id=$1', [req.params.id]);
  if (!existing.rows.length) return notFound(res, 'Category not found');
  const row = existing.rows[0];
  const subCatsJson   = sub_categories !== undefined ? JSON.stringify(sub_categories) : JSON.stringify(row.sub_categories || []);
  const typesJson     = types           !== undefined ? JSON.stringify(types)          : JSON.stringify(row.types          || []);
  const materialsJson = materials       !== undefined ? JSON.stringify(materials)      : JSON.stringify(row.materials      || []);
  const patternsJson  = patterns        !== undefined ? JSON.stringify(patterns)       : JSON.stringify(row.patterns       || []);
  const { rows } = await db.query(
    'UPDATE categories SET sub_categories=$1, types=$2, materials=$3, patterns=$4 WHERE id=$5 RETURNING *',
    [subCatsJson, typesJson, materialsJson, patternsJson, req.params.id]
  );
  ok(res, { category: rows[0] });
};

const toggle = async (req, res) => {
  const { rows } = await db.query(
    'UPDATE categories SET is_active = NOT is_active WHERE id=$1 RETURNING *',
    [req.params.id]
  );
  if (!rows.length) return notFound(res, 'Category not found');
  ok(res, { category: rows[0] });
};

const bulkCreate = async (req, res) => {
  const { categories } = req.body;
  if (!Array.isArray(categories) || !categories.length) return ok(res, { added: 0 });
  let added = 0;
  for (const cat of categories) {
    try {
      await db.query(
        'INSERT INTO categories (name, slug, sort_order) VALUES ($1,$2,$3) ON CONFLICT (slug) DO NOTHING',
        [cat.name, cat.slug, cat.sort_order || 0]
      );
      added++;
    } catch (_) {}
  }
  ok(res, { added });
};

const uploadSizeChart = async (req, res) => {
  if (!req.file) return badRequest(res, 'No image uploaded');
  const image_url = getFileUrl(req.file);
  const { rows } = await db.query(
    'UPDATE categories SET size_chart_image=$1 WHERE id=$2 RETURNING *',
    [image_url, req.params.id]
  );
  if (!rows.length) return notFound(res, 'Category not found');
  ok(res, { category: rows[0] });
};

const deleteSizeChart = async (req, res) => {
  const { rows } = await db.query(
    'UPDATE categories SET size_chart_image=NULL WHERE id=$1 RETURNING *',
    [req.params.id]
  );
  ok(res, { category: rows[0] });
};

const saveSizeChartTable = async (req, res) => {
  const { headers, rows: tableRows } = req.body;
  if (!Array.isArray(headers) || !Array.isArray(tableRows)) {
    return badRequest(res, 'headers and rows arrays required');
  }
  const { rows } = await db.query(
    'UPDATE categories SET size_chart_data=$1 WHERE id=$2 RETURNING *',
    [JSON.stringify({ headers, rows: tableRows }), req.params.id]
  );
  if (!rows.length) return notFound(res, 'Category not found');
  ok(res, { category: rows[0] });
};

// Deleting moves the category to Trash. Products may optionally be moved to another
// category first (reassign_to); otherwise they stay attached and come back on restore.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const remove = async (req, res) => {
  const { reassign_to } = req.query;
  const { rows: src } = await db.query('SELECT id FROM categories WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
  if (!src.length) return notFound(res, 'Category not found');
  if (reassign_to) {
    if (!UUID_RE.test(reassign_to) || reassign_to === req.params.id) return badRequest(res, 'Choose a different, valid category to move products to');
    const { rows: target } = await db.query('SELECT id FROM categories WHERE id=$1 AND deleted_at IS NULL', [reassign_to]);
    if (!target.length) return badRequest(res, 'The target category does not exist or is in Trash');
    await db.query('UPDATE products SET category_id=$1 WHERE category_id=$2', [reassign_to, req.params.id]);
  }
  const row = await trashService.trash('categories', req.params.id, req.user?.id);
  if (!row) return notFound(res, 'Category not found');
  ok(res, { message: reassign_to ? 'Products moved and category sent to Trash' : 'Category moved to Trash (its products are hidden until restored)' });
};

const listMaterials = async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM product_materials ORDER BY sort_order, name');
  ok(res, { materials: rows });
};

const createMaterial = async (req, res) => {
  const { name, sort_order } = req.body;
  if (!name?.trim()) return badRequest(res, 'name is required');
  const { rows } = await db.query(
    'INSERT INTO product_materials (name, sort_order) VALUES ($1,$2) RETURNING *',
    [name.trim(), sort_order || 0]
  );
  created(res, { material: rows[0] });
};

const toggleMaterial = async (req, res) => {
  const { rows } = await db.query(
    'UPDATE product_materials SET is_active = NOT is_active WHERE id=$1 RETURNING *',
    [req.params.id]
  );
  if (!rows.length) return notFound(res);
  ok(res, { material: rows[0] });
};

const updateMaterial = async (req, res) => {
  const { name, sort_order } = req.body;
  if (!name?.trim()) return badRequest(res, 'name is required');
  const { rows } = await db.query(
    'UPDATE product_materials SET name=$1, sort_order=$2 WHERE id=$3 RETURNING *',
    [name.trim(), sort_order ?? 0, req.params.id]
  );
  if (!rows.length) return notFound(res);
  ok(res, { material: rows[0] });
};

const deleteMaterial = async (req, res) => {
  await db.query('DELETE FROM product_materials WHERE id=$1', [req.params.id]);
  ok(res, { message: 'Material deleted' });
};

module.exports = {
  list, create, update, updateMeta, toggle, bulkCreate,
  uploadSizeChart, deleteSizeChart, saveSizeChartTable, remove,
  listMaterials, createMaterial, toggleMaterial, updateMaterial, deleteMaterial,
};
