const router = require('express').Router();
const ah = require('../../../utils/asyncHandler');
const db = require('../../../config/db');
const { ok } = require('../../../utils/response');
const whatsapp = require('../../../services/whatsapp/whatsapp.service');

db.query(`
  CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id          SERIAL PRIMARY KEY,
    recipient   VARCHAR(20) NOT NULL,
    user_count  INT NOT NULL DEFAULT 1,
    template    VARCHAR(60),
    message     TEXT NOT NULL,
    sent_by     INT,
    status      VARCHAR(20) DEFAULT 'sent',
    created_at  TIMESTAMPTZ DEFAULT now()
  )
`).catch(() => {});

router.get('/users', ah(async (req, res) => {
  const { search } = req.query;
  const { rows } = await db.query(
    `SELECT id, name, phone, email
     FROM users
     WHERE role = 'user'
       AND phone IS NOT NULL AND phone <> ''
       ${search ? "AND (name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)" : ''}
     ORDER BY name
     LIMIT 100`,
    search ? [`%${search}%`] : []
  );
  ok(res, { users: rows });
}));

router.get('/logs', ah(async (_req, res) => {
  const { rows } = await db.query(`
    SELECT l.*, u.name AS sent_by_name
    FROM whatsapp_logs l
    LEFT JOIN users u ON l.sent_by = u.id
    ORDER BY l.created_at DESC
    LIMIT 50
  `);
  ok(res, { logs: rows });
}));

router.post('/send', ah(async (req, res) => {
  const { recipient, user_id, message, template } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });

  const adminId = req.user?.id || null;

  if (recipient === 'all') {
    const { rows: users } = await db.query(
      "SELECT id, name, phone FROM users WHERE role='user' AND phone IS NOT NULL AND phone <> ''"
    );

    const logEntry = await db.query(
      `INSERT INTO whatsapp_logs (recipient, user_count, template, message, sent_by, status)
       VALUES ('all', $1, $2, $3, $4, 'sending') RETURNING id`,
      [users.length, template || 'custom', message.trim(), adminId]
    );
    const logId = logEntry.rows[0].id;
    ok(res, { queued: true, user_count: users.length, log_id: logId });

    (async () => {
      let failed = 0;
      for (const u of users) {
        try {
          const personalised = message.replace(/\{name\}/gi, u.name || 'Customer');
          await whatsapp.sendWhatsApp?.(u.phone, personalised);
        } catch { failed++; }
      }
      const status = failed === 0 ? 'sent' : failed === users.length ? 'failed' : 'partial';
      db.query('UPDATE whatsapp_logs SET status=$1 WHERE id=$2', [status, logId]).catch(() => {});
    })();

  } else {
    if (!user_id) return res.status(400).json({ message: 'user_id required for individual send' });
    const { rows } = await db.query('SELECT id, name, phone FROM users WHERE id=$1', [user_id]);
    if (!rows.length || !rows[0].phone) return res.status(404).json({ message: 'User not found or has no phone' });
    const u = rows[0];
    const personalised = message.replace(/\{name\}/gi, u.name || 'Customer');
    try {
      await whatsapp.sendWhatsApp?.(u.phone, personalised);
      await db.query(
        `INSERT INTO whatsapp_logs (recipient, user_count, template, message, sent_by, status)
         VALUES ('individual', 1, $1, $2, $3, 'sent')`,
        [template || 'custom', message.trim(), adminId]
      );
      ok(res, { sent: true, to: u.name });
    } catch (err) {
      await db.query(
        `INSERT INTO whatsapp_logs (recipient, user_count, template, message, sent_by, status)
         VALUES ('individual', 1, $1, $2, $3, 'failed')`,
        [template || 'custom', message.trim(), adminId]
      ).catch(() => {});
      res.status(500).json({ message: 'Failed to send message', error: err.message });
    }
  }
}));

module.exports = router;
