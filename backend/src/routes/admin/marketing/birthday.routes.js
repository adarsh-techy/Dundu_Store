const router = require('express').Router();
const ah = require('../../../utils/asyncHandler');
const db = require('../../../config/db');
const { ok } = require('../../../utils/response');
const whatsapp = require('../../../services/whatsapp/whatsapp.service');

const DEFAULT_DISCOUNT = 15;
const DEFAULT_TEMPLATE =
  `Happy Birthday, *{name}*!\n\n` +
  `Dundu Online wishes you a wonderful celebration! As our special gift, enjoy *{discount}% OFF* your order today!\n\n` +
  `Your birthday discount is automatically applied during cart checkout — no coupon code required.\n\n` +
  `Shop your favorites: {store_url}\n\n` +
  `Dundu Online — Premium Fashion for Every Moment.`;

async function getBirthdaySettings() {
  const { rows } = await db.query(
    `SELECT key, value FROM settings WHERE key IN ('birthday_discount','birthday_message_template','birthday_popup_enabled')`
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    discount: parseInt(map.birthday_discount ?? DEFAULT_DISCOUNT, 10),
    template: map.birthday_message_template ?? DEFAULT_TEMPLATE,
    popup_enabled: map.birthday_popup_enabled !== 'false',
  };
}

function applyTemplate(template, name, discount) {
  const storeUrl = 'dundu.com';
  return (template || DEFAULT_TEMPLATE)
    .replace(/\{name\}/gi, name || 'Customer')
    .replace(/\{discount\}/gi, String(discount))
    .replace(/\{store_url\}/gi, storeUrl);
}

/* ── Get Birthday Lists & Stats ── */
router.get('/', ah(async (_req, res) => {
  const [{ rows }, settings, countStats] = await Promise.all([
    db.query(`
      SELECT id, name, phone, email, date_of_birth,
        TO_CHAR(date_of_birth, 'DD Mon') AS display_date,
        EXTRACT(YEAR FROM AGE(date_of_birth))::int AS age,
        (
          DATE_PART('month', date_of_birth) = DATE_PART('month', CURRENT_DATE) AND
          DATE_PART('day',   date_of_birth) = DATE_PART('day',   CURRENT_DATE)
        ) AS is_today,
        (
          DATE_PART('month', date_of_birth) = DATE_PART('month', CURRENT_DATE)
        ) AS is_this_month,
        (
          (DATE_TRUNC('year', CURRENT_DATE) + (date_of_birth - DATE_TRUNC('year', date_of_birth)))
          - CURRENT_DATE
        ) AS days_until
      FROM users
      WHERE role = 'user'
        AND date_of_birth IS NOT NULL
        AND (
          (DATE_TRUNC('year', CURRENT_DATE) + (date_of_birth - DATE_TRUNC('year', date_of_birth)))
          BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        )
      ORDER BY days_until ASC, name ASC
    `),
    getBirthdaySettings(),
    db.query(`
      SELECT 
        COUNT(*)::int AS total_with_dob,
        COUNT(*) FILTER (
          WHERE DATE_PART('month', date_of_birth) = DATE_PART('month', CURRENT_DATE)
            AND DATE_PART('day',   date_of_birth) = DATE_PART('day',   CURRENT_DATE)
        )::int AS today_count,
        COUNT(*) FILTER (
          WHERE DATE_PART('month', date_of_birth) = DATE_PART('month', CURRENT_DATE)
        )::int AS month_count
      FROM users
      WHERE role = 'user' AND date_of_birth IS NOT NULL
    `),
  ]);

  const today = rows.filter((r) => r.is_today);
  // Next 7 days upcoming (excluding today)
  const upcoming = rows.filter((r) => !r.is_today && r.days_until <= 7);
  // Rest of the 30-day window
  const upcomingMonth = rows.filter((r) => !r.is_today && r.days_until > 7 && r.days_until <= 30);

  const cs = countStats.rows[0] || {};

  ok(res, {
    today,
    upcoming,
    upcoming_month: upcomingMonth,
    stats: {
      total_with_dob: cs.total_with_dob || 0,
      today_count: today.length,
      upcoming_7_days: upcoming.length,
      this_month_count: cs.month_count || 0,
    },
    birthday_discount: settings.discount,
    birthday_template: settings.template,
    birthday_popup_enabled: settings.popup_enabled,
  });
}));

/* ── Save Settings ── */
router.put('/settings', ah(async (req, res) => {
  const { birthday_discount, birthday_template, birthday_popup_enabled } = req.body;
  await db.query(
    `INSERT INTO settings (key,value) VALUES ('birthday_discount',$1)
     ON CONFLICT (key) DO UPDATE SET value=$1`,
    [String(birthday_discount ?? DEFAULT_DISCOUNT)]
  );
  await db.query(
    `INSERT INTO settings (key,value) VALUES ('birthday_message_template',$1)
     ON CONFLICT (key) DO UPDATE SET value=$1`,
    [birthday_template ?? DEFAULT_TEMPLATE]
  );
  await db.query(
    `INSERT INTO settings (key,value) VALUES ('birthday_popup_enabled',$1)
     ON CONFLICT (key) DO UPDATE SET value=$1`,
    [birthday_popup_enabled === false ? 'false' : 'true']
  );
  ok(res, { message: 'Birthday settings updated successfully' });
}));

/* ── Send Wish to Single Customer ── */
router.post('/send/:userId', ah(async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, name, phone FROM users WHERE id=$1',
    [req.params.userId]
  );
  if (!rows.length || !rows[0].phone) {
    return res.status(404).json({ message: 'User not found or has no phone number on record' });
  }
  const u = rows[0];
  const settings = await getBirthdaySettings();
  const message = applyTemplate(settings.template, u.name, settings.discount);

  await whatsapp.sendWhatsApp?.(u.phone, message);

  await db.query(
    `INSERT INTO whatsapp_logs (recipient, user_count, template, message, sent_by, status)
     VALUES ('individual', 1, 'birthday', $1, $2, 'sent')`,
    [message, req.user?.id || null]
  ).catch(() => {});

  ok(res, { sent: true, to: u.name });
}));

/* ── Send to All Celebrants Today ── */
router.post('/send-all-today', ah(async (req, res) => {
  const { rows } = await db.query(`
    SELECT id, name, phone FROM users
    WHERE role='user' AND date_of_birth IS NOT NULL AND phone IS NOT NULL AND phone <> ''
      AND DATE_PART('month', date_of_birth) = DATE_PART('month', CURRENT_DATE)
      AND DATE_PART('day',   date_of_birth) = DATE_PART('day',   CURRENT_DATE)
  `);

  if (rows.length === 0) {
    return res.status(400).json({ message: 'No celebrants with phone numbers found for today' });
  }

  ok(res, { queued: true, count: rows.length });

  (async () => {
    const settings = await getBirthdaySettings();
    for (const u of rows) {
      try {
        const message = applyTemplate(settings.template, u.name, settings.discount);
        await whatsapp.sendWhatsApp?.(u.phone, message);
      } catch (_) {}
    }
    await db.query(
      `INSERT INTO whatsapp_logs (recipient, user_count, template, message, sent_by, status)
       VALUES ('all', $1, 'birthday', $2, $3, 'sent')`,
      [rows.length, `Birthday greeting campaign sent to ${rows.length} customers celebrating today`, req.user?.id || null]
    ).catch(() => {});
  })();
}));

module.exports = router;
