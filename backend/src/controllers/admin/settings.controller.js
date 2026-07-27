const db = require('../../config/db');
const { ok, badRequest } = require('../../utils/response');

const getSettings = async (_req, res) => {
  const { rows } = await db.query('SELECT key, value FROM settings');
  ok(res, { settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
};

const updateSettings = async (req, res) => {
  const {
    popup_interval_minutes,
    referrer_discount_percent,
    referred_discount_percent,
    cod_enabled,
    delivery_charge,
    free_delivery_threshold,
    return_courier_charge,
    coupon_field_enabled,
    return_abuse_threshold,
    return_abuse_block_cod,
    return_abuse_block_return,
    offer_badge_color,
    offer_badge_text_color,
  } = req.body;

  if (popup_interval_minutes !== undefined) {
    const val = Math.max(1, parseInt(popup_interval_minutes) || 10);
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('popup_interval_minutes', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [String(val)]
    );
  }
  if (referrer_discount_percent !== undefined) {
    const val = Math.min(100, Math.max(1, parseInt(referrer_discount_percent) || 20));
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('referrer_discount_percent', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [String(val)]
    );
  }
  if (referred_discount_percent !== undefined) {
    const val = Math.min(100, Math.max(1, parseInt(referred_discount_percent) || 30));
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('referred_discount_percent', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [String(val)]
    );
  }
  if (cod_enabled !== undefined) {
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('cod_enabled', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [cod_enabled ? 'true' : 'false']
    );
  }
  if (delivery_charge !== undefined) {
    const val = Math.max(0, parseInt(delivery_charge) || 0);
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('delivery_charge', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [String(val)]
    );
  }
  if (free_delivery_threshold !== undefined) {
    const val = Math.max(0, parseInt(free_delivery_threshold) || 0);
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('free_delivery_threshold', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [String(val)]
    );
  }
  if (return_courier_charge !== undefined) {
    const val = Math.max(0, parseInt(return_courier_charge) || 0);
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('return_courier_charge', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [String(val)]
    );
  }
  if (coupon_field_enabled !== undefined) {
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('coupon_field_enabled', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [coupon_field_enabled ? 'true' : 'false']
    );
  }
  if (return_abuse_threshold !== undefined) {
    const val = Math.max(0, parseInt(return_abuse_threshold) || 0);
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('return_abuse_threshold', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [String(val)]
    );
  }
  if (return_abuse_block_cod !== undefined) {
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('return_abuse_block_cod', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [return_abuse_block_cod ? 'true' : 'false']
    );
  }
  if (return_abuse_block_return !== undefined) {
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('return_abuse_block_return', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [return_abuse_block_return ? 'true' : 'false']
    );
  }
  if (offer_badge_color !== undefined) {
    if (!/^#[0-9a-fA-F]{6}$/.test(offer_badge_color)) {
      return badRequest(res, 'offer_badge_color must be a hex color, e.g. #e91e8c');
    }
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('offer_badge_color', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [offer_badge_color]
    );
  }
  if (offer_badge_text_color !== undefined) {
    if (!/^#[0-9a-fA-F]{6}$/.test(offer_badge_text_color)) {
      return badRequest(res, 'offer_badge_text_color must be a hex color, e.g. #ffffff');
    }
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('offer_badge_text_color', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [offer_badge_text_color]
    );
  }
  if (req.body.update_available !== undefined) {
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('update_available', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [req.body.update_available ? 'true' : 'false']
    );
  }
  if (req.body.update_message !== undefined) {
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('update_message', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [req.body.update_message || 'A new version of Dundu is available. Please update the app for the best experience.']
    );
  }
  if (req.body.latest_version !== undefined) {
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('latest_version', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [req.body.latest_version || '1.0.0']
    );
  }

  const { rows } = await db.query('SELECT key, value FROM settings');
  ok(res, { settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
};

const getPaymentSettings = async (_req, res) => {
  const { rows } = await db.query("SELECT value FROM settings WHERE key='cod_enabled'");
  const cod_enabled = rows.length ? rows[0].value !== 'false' : true;
  ok(res, { cod_enabled });
};

const updatePaymentSettings = async (req, res) => {
  const { cod_enabled } = req.body;
  await db.query(
    `INSERT INTO settings (key, value) VALUES ('cod_enabled', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1`,
    [cod_enabled ? 'true' : 'false']
  );
  ok(res, { cod_enabled: !!cod_enabled });
};

module.exports = { getSettings, updateSettings, getPaymentSettings, updatePaymentSettings };
