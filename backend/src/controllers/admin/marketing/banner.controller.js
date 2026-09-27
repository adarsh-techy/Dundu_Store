const db = require('../../../config/db');
const trashService = require('../../../services/trash/trash.service');
const { ok, created, notFound } = require('../../../utils/response');
const { getFileUrl } = require('../../../utils/upload');

const list = async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM banners WHERE deleted_at IS NULL ORDER BY sort_order');
  ok(res, { banners: rows });
};

const create = async (req, res) => {
  const { title, subtitle, link, sort_order, badge_text, badge_active, badge_color } = req.body;
  const image_url = req.file ? getFileUrl(req.file) : req.body.image_url;
  let order = parseInt(sort_order, 10);
  if (!order || order <= 0) {
    const { rows: maxRows } = await db.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM banners');
    order = maxRows[0].next;
  }
  const { rows } = await db.query(
    'INSERT INTO banners (image_url, title, subtitle, link, sort_order, badge_text, badge_active, badge_color) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [image_url, title, subtitle, link, order, badge_text || null, badge_active === 'true' || badge_active === true, badge_color || '#e91e8c']
  );
  created(res, { banner: rows[0] });
};

const update = async (req, res) => {
  const { title, subtitle, link, sort_order, badge_text, badge_active, badge_color } = req.body;
  const existing = await db.query('SELECT * FROM banners WHERE id=$1', [req.params.id]);
  if (!existing.rows.length) return notFound(res, 'Banner not found');
  const image_url = req.file
    ? getFileUrl(req.file)
    : (req.body.image_url || existing.rows[0].image_url);
  // Partial updates (e.g. reorder sends only sort_order) must not wipe the other columns.
  const cur = existing.rows[0];
  const pick = (v, fallback) => (v === undefined ? fallback : v);
  const badgeActive = badge_active === undefined ? cur.badge_active : (badge_active === 'true' || badge_active === true);
  const { rows } = await db.query(
    'UPDATE banners SET image_url=$1, title=$2, subtitle=$3, link=$4, sort_order=$5, badge_text=$6, badge_active=$7, badge_color=$8 WHERE id=$9 RETURNING *',
    [image_url, pick(title, cur.title), pick(subtitle, cur.subtitle), pick(link, cur.link),
      sort_order === undefined || sort_order === '' ? cur.sort_order : parseInt(sort_order, 10) || 0,
      badge_text === undefined ? cur.badge_text : (badge_text || null), badgeActive, pick(badge_color, cur.badge_color) || '#e91e8c', req.params.id]
  );
  ok(res, { banner: rows[0] });
};

const toggle = async (req, res) => {
  const { rows } = await db.query(
    'UPDATE banners SET is_active = NOT is_active WHERE id=$1 RETURNING *',
    [req.params.id]
  );
  if (!rows.length) return notFound(res, 'Banner not found');
  ok(res, { banner: rows[0] });
};

const remove = async (req, res) => {
  const row = await trashService.trash('banners', req.params.id, req.user?.id);
  if (!row) return notFound(res, 'Banner not found');
  ok(res, { message: 'Banner deleted' });
};

module.exports = { list, create, update, toggle, remove };
