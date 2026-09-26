const router = require('express').Router();
const ah = require('../../../utils/asyncHandler');
const db = require('../../../config/db');
const { ok } = require('../../../utils/response');
const whatsapp = require('../../../services/whatsapp/whatsapp.service');

// Ensure table exists with UUID sent_by
db.query(`
  CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id SERIAL PRIMARY KEY,
    recipient VARCHAR(30) NOT NULL,
    user_count INT NOT NULL DEFAULT 1,
    template VARCHAR(60),
    message TEXT NOT NULL,
    sent_by UUID,
    status VARCHAR(20) DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT now()
  )
`).catch(() => {});

// Legacy installs may still have sent_by as TEXT; convert once, keeping values, and never rewrite a UUID column.
db.query(`
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_logs' AND column_name='sent_by' AND data_type <> 'uuid') THEN
      ALTER TABLE whatsapp_logs ALTER COLUMN sent_by TYPE UUID USING NULLIF(sent_by::text, '')::uuid;
    END IF;
  END $$;
`).catch(() => {});

/* ── Stats Summary ── */
router.get('/stats', ah(async (_req, res) => {
  const [logStats, reachableUsers, cartUsers] = await Promise.all([
    db.query(`
      SELECT 
        COUNT(*)::int AS total_campaigns,
        COALESCE(SUM(user_count), 0)::int AS total_recipients,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS successful_campaigns,
        COUNT(*) FILTER (WHERE template = 'cart')::int AS cart_recovery_campaigns
      FROM whatsapp_logs
    `),
    db.query(`
      SELECT COUNT(*)::int AS total_reachable
      FROM users
      WHERE role = 'user' AND phone IS NOT NULL AND phone <> ''
    `),
    db.query(`
      SELECT COUNT(DISTINCT u.id)::int AS cart_reachable
      FROM users u
      JOIN cart c ON c.user_id = u.id
      WHERE u.role = 'user' AND u.phone IS NOT NULL AND u.phone <> ''
    `),
  ]);

  const ls = logStats.rows[0] || {};
  const ru = reachableUsers.rows[0] || {};
  const cu = cartUsers.rows[0] || {};

  ok(res, {
    total_campaigns: ls.total_campaigns || 0,
    total_recipients: ls.total_recipients || 0,
    successful_campaigns: ls.successful_campaigns || 0,
    cart_recovery_campaigns: ls.cart_recovery_campaigns || 0,
    reachable_customers: ru.total_reachable || 0,
    cart_abandoners: cu.cart_reachable || 0,
  });
}));

/* ── Search Users ── */
router.get('/users', ah(async (req, res) => {
  const { search } = req.query;
  const { rows } = await db.query(
    `SELECT id, name, phone, email
     FROM users
     WHERE role = 'user'
       AND phone IS NOT NULL AND phone <> ''
       ${search ? 'AND (name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)' : ''}
     ORDER BY name
     LIMIT 100`,
    search ? [`%${search}%`] : []
  );
  ok(res, { users: rows });
}));

/* ── Broadcast Logs / History ── */
router.get('/logs', ah(async (req, res) => {
  const { status, recipient, search } = req.query;

  const conditions = [];
  const params = [];

  if (status && status !== 'all') {
    params.push(status);
    conditions.push(`l.status = $${params.length}`);
  }

  if (recipient && recipient !== 'all') {
    params.push(recipient);
    conditions.push(`l.recipient = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`LOWER(l.message) LIKE $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT l.*, u.name AS sent_by_name
     FROM whatsapp_logs l
     LEFT JOIN users u ON l.sent_by = u.id
     ${whereClause}
     ORDER BY l.created_at DESC
     LIMIT 100`,
    params
  );

  ok(res, { logs: rows });
}));

/* ── Send Broadcast ── */
router.post('/send', ah(async (req, res) => {
  const { recipient, user_id, message, template } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });

  const adminId = req.user?.id || null;

  if (recipient === 'all' || recipient === 'cart') {
    let users = [];

    if (recipient === 'cart') {
      const result = await db.query(
        `SELECT DISTINCT u.id, u.name, u.phone
         FROM users u
         JOIN cart c ON c.user_id = u.id
         WHERE u.role = 'user' AND u.phone IS NOT NULL AND u.phone <> ''`
      );
      users = result.rows;
    } else {
      const result = await db.query(
        "SELECT id, name, phone FROM users WHERE role='user' AND phone IS NOT NULL AND phone <> ''"
      );
      users = result.rows;
    }

    if (users.length === 0) {
      return res.status(400).json({ message: 'No reachable customers found for this audience segment' });
    }

    const logEntry = await db.query(
      `INSERT INTO whatsapp_logs (recipient, user_count, template, message, sent_by, status)
       VALUES ($1, $2, $3, $4, $5, 'sending') RETURNING id`,
      [recipient, users.length, template || 'custom', message.trim(), adminId]
    );
    const logId = logEntry.rows[0].id;
    ok(res, { queued: true, user_count: users.length, log_id: logId });

    // Background delivery dispatch
    (async () => {
      let failed = 0;
      for (const u of users) {
        try {
          const personalised = message.replace(/\{name\}/gi, u.name || 'Customer');
          await whatsapp.sendWhatsApp?.(u.phone, personalised);
        } catch {
          failed++;
        }
      }
      const finalStatus = failed === 0 ? 'sent' : failed === users.length ? 'failed' : 'partial';
      db.query('UPDATE whatsapp_logs SET status=$1 WHERE id=$2', [finalStatus, logId]).catch(() => {});
    })();

  } else {
    // Individual recipient
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
