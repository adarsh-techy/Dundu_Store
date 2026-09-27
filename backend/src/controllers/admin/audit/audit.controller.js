const db = require('../../../config/db');
const { ok, notFound } = require('../../../utils/response');

const list = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const offset = (page - 1) * limit;
  const { actor, action, entity, search, from, to } = req.query;

  const conditions = [];
  const params = [];
  if (actor)  { params.push(actor);  conditions.push(`a.actor_id::text = $${params.length}`); }
  if (action) { params.push(action); conditions.push(`a.action = $${params.length}`); }
  if (entity) { params.push(entity); conditions.push(`a.entity_type = $${params.length}`); }
  if (from)   { params.push(from);   conditions.push(`a.created_at >= $${params.length}::timestamptz`); }
  if (to)     { params.push(to);     conditions.push(`a.created_at < ($${params.length}::date + interval '1 day')`); }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(a.summary ILIKE $${params.length} OR a.actor_name ILIKE $${params.length} OR a.actor_email ILIKE $${params.length}
                      OR a.entity_id ILIKE $${params.length} OR a.path ILIKE $${params.length} OR a.details::text ILIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rowsRes, countRes] = await Promise.all([
    db.query(
      `SELECT a.id, a.actor_id, a.actor_name, a.actor_email, a.actor_role, a.action, a.entity_type, a.entity_id,
              a.summary, a.method, a.path, a.status_code, a.ip, a.created_at
       FROM audit_logs a ${where}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    db.query(`SELECT COUNT(*)::int AS total FROM audit_logs a ${where}`, params),
  ]);
  ok(res, { logs: rowsRes.rows, total: countRes.rows[0].total, page, limit });
};

const getOne = async (req, res) => {
  const { rows } = await db.query('SELECT * FROM audit_logs WHERE id=$1', [req.params.id]);
  if (!rows.length) return notFound(res, 'Log entry not found');
  ok(res, { log: rows[0] });
};

const filters = async (_req, res) => {
  const [actors, entities, actions, stats] = await Promise.all([
    db.query(`SELECT actor_id AS id, MAX(actor_name) AS name, MAX(actor_email) AS email, COUNT(*)::int AS count
              FROM audit_logs WHERE actor_id IS NOT NULL GROUP BY actor_id ORDER BY count DESC LIMIT 50`),
    db.query(`SELECT entity_type AS value, COUNT(*)::int AS count FROM audit_logs GROUP BY entity_type ORDER BY count DESC`),
    db.query(`SELECT action AS value, COUNT(*)::int AS count FROM audit_logs GROUP BY action ORDER BY count DESC`),
    db.query(`SELECT COUNT(*)::int AS total,
                     COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int AS last_24h,
                     COUNT(*) FILTER (WHERE action = 'delete' AND created_at >= now() - interval '7 days')::int AS deletes_7d,
                     COUNT(DISTINCT actor_id) FILTER (WHERE created_at >= now() - interval '7 days')::int AS active_admins_7d
              FROM audit_logs`),
  ]);
  ok(res, { actors: actors.rows, entities: entities.rows, actions: actions.rows, stats: stats.rows[0] });
};

module.exports = { list, getOne, filters };
