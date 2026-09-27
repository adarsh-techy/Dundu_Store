const db = require('../../../config/db');
const trashService = require('../../../services/trash/trash.service');
const { ok, created, badRequest , notFound } = require('../../../utils/response');

const list = async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM announcements WHERE deleted_at IS NULL ORDER BY sort_order, id');
  ok(res, { announcements: rows });
};

const create = async (req, res) => {
  const { text, bg_color = '#e91e8c', text_color = '#ffffff', sort_order = 0, scheduled_time } = req.body;
  if (!text) return badRequest(res, 'text is required');
  const { rows } = await db.query(
    'INSERT INTO announcements (text, bg_color, text_color, sort_order, scheduled_time) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [text, bg_color, text_color, parseInt(sort_order, 10) || 0, scheduled_time || null]
  );
  created(res, { announcement: rows[0] });
};

const update = async (req, res) => {
  const { text, bg_color, text_color, sort_order, scheduled_time } = req.body;
  const { rows } = await db.query(
    'UPDATE announcements SET text=$1, bg_color=$2, text_color=$3, sort_order=$4, scheduled_time=$5 WHERE id=$6 RETURNING *',
    [text, bg_color, text_color, parseInt(sort_order, 10) || 0, scheduled_time || null, req.params.id]
  );
  ok(res, { announcement: rows[0] });
};

const toggle = async (req, res) => {
  const cur = await db.query('SELECT is_active FROM announcements WHERE id=$1', [req.params.id]);
  if (!cur.rows.length) return badRequest(res, 'Announcement not found');
  const willBeActive = !cur.rows[0].is_active;

  if (willBeActive) {
    // Only 1 announcement active at a time: deactivate all others first
    await db.query('UPDATE announcements SET is_active = false');
  }

  const { rows } = await db.query(
    'UPDATE announcements SET is_active = $1 WHERE id=$2 RETURNING *',
    [willBeActive, req.params.id]
  );
  ok(res, { announcement: rows[0] });
};

const togglePopup = async (req, res) => {
  const cur = await db.query('SELECT show_popup FROM announcements WHERE id=$1', [req.params.id]);
  if (!cur.rows.length) return badRequest(res, 'Announcement not found');
  const willBePopup = !cur.rows[0].show_popup;

  if (willBePopup) {
    // Only 1 popup announcement active at a time: deactivate all others first
    await db.query('UPDATE announcements SET show_popup = false');
  }

  const { rows } = await db.query(
    'UPDATE announcements SET show_popup = $1 WHERE id=$2 RETURNING *',
    [willBePopup, req.params.id]
  );
  ok(res, { announcement: rows[0] });
};

const remove = async (req, res) => {
  const row = await trashService.trash('announcements', req.params.id, req.user?.id);
  if (!row) return notFound(res, 'Announcement not found');
  ok(res, { message: 'Deleted' });
};

module.exports = { list, create, update, toggle, togglePopup, remove };
