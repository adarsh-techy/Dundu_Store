const db = require('../../../config/db');
const { ok, badRequest } = require('../../../utils/response');

// Festival settings keys stored in the `settings` table
const FESTIVAL_KEYS = [
  'festival_enabled',
  'festival_name',
  'festival_emoji',
  'festival_bg_color',
  'festival_navbar_color',
  'festival_navbar_text_color',
  'festival_logo_url',
  'festival_popup_enabled',
  'festival_popup_heading',
  'festival_popup_subtext',
  'festival_popup_coupon',
  'festival_popup_badge_text',
  'festival_popup_btn_text',
  'festival_popup_btn_color',
  'festival_popup_expires_at',
  'festival_banner_text',
];

const getFestival = async (_req, res) => {
  const { rows } = await db.query(
    `SELECT key, value FROM settings WHERE key = ANY($1)`,
    [FESTIVAL_KEYS]
  );
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  ok(res, { festival: cfg });
};

const updateFestival = async (req, res) => {
  const allowed = new Set(FESTIVAL_KEYS);
  const updates = Object.entries(req.body).filter(([k]) => allowed.has(k));

  if (!updates.length) return badRequest(res, 'No valid festival fields provided');

  for (const [key, value] of updates) {
    // Validate hex colors
    if (key.endsWith('_color') && value && !/^#[0-9a-fA-F]{6}$/.test(value)) {
      return badRequest(res, `${key} must be a valid hex color like #e91e8c`);
    }
    await db.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, String(value)]
    );
  }

  const { rows } = await db.query(
    `SELECT key, value FROM settings WHERE key = ANY($1)`,
    [FESTIVAL_KEYS]
  );
  ok(res, { festival: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
};

module.exports = { getFestival, updateFestival };
