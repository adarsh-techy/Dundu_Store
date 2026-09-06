const db = require('../../../config/db');
const { ok } = require('../../../utils/response');
const { getFileUrl } = require('../../../utils/upload');

const get = async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM splash_config LIMIT 1');
  ok(res, { splash: rows[0] || null });
};

const upsert = async (req, res) => {
  const {
    app_name, tagline, bg_color, text_color, duration_ms, is_active,
    remove_bg_image, existing_bg_image,
  } = req.body;

  const { rows: existing } = await db.query('SELECT id FROM splash_config LIMIT 1');

  const resolveImage = async (id) => {
    if (req.file) return getFileUrl(req.file);
    if (remove_bg_image === 'true') return null;
    if (existing_bg_image) return existing_bg_image;
    if (id) {
      const { rows } = await db.query('SELECT bg_image FROM splash_config WHERE id=$1', [id]);
      return rows[0]?.bg_image || null;
    }
    return null;
  };

  if (existing.length) {
    const id = existing[0].id;
    const finalImage = await resolveImage(id);

    const { rows } = await db.query(
      `UPDATE splash_config SET
        app_name=$1, tagline=$2, bg_color=$3, text_color=$4,
        duration_ms=$5, is_active=$6, bg_image=$7, updated_at=now()
       WHERE id=$8 RETURNING *`,
      [
        app_name || 'Dundu',
        tagline || '',
        bg_color || '#0F0F0F',
        text_color || '#FFFFFF',
        parseInt(duration_ms) || 2500,
        is_active === 'true' || is_active === true,
        finalImage,
        id,
      ]
    );
    ok(res, { splash: rows[0] });
  } else {
    const finalImage = await resolveImage(null);
    const { rows } = await db.query(
      `INSERT INTO splash_config (app_name, tagline, bg_color, text_color, duration_ms, is_active, bg_image)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        app_name || 'Dundu',
        tagline || '',
        bg_color || '#0F0F0F',
        text_color || '#FFFFFF',
        parseInt(duration_ms) || 2500,
        is_active === 'true' || is_active === true,
        finalImage,
      ]
    );
    ok(res, { splash: rows[0] });
  }
};

const removeBgImage = async (req, res) => {
  const { rows } = await db.query(
    'UPDATE splash_config SET bg_image=NULL WHERE id=$1 RETURNING *',
    [req.params.id]
  );
  ok(res, { splash: rows[0] });
};

module.exports = { get, upsert, removeBgImage };
