const db = require('../../config/db');

const SECRET_KEYS = /pass|secret|token|otp|authorization|key$/i;
const MAX_JSON = 8000;

// Strip secrets and trim huge payloads before they land in the log.
const sanitize = (value, depth = 0) => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return depth > 3 ? `[array:${value.length}]` : value.slice(0, 50).map((v) => sanitize(v, depth + 1));
  if (typeof value === 'object') {
    if (depth > 3) return '[object]';
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEYS.test(k) ? '***' : sanitize(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 500) return value.slice(0, 500) + '…';
  return value;
};

/**
 * Write one audit entry. Never throws — an audit failure must not break the action.
 * @param {object} e { actor, action, entityType, entityId, summary, method, path, statusCode, details, ip, userAgent }
 */
const record = async (e) => {
  try {
    let details = e.details === undefined ? null : sanitize(e.details);
    let json = details === null ? null : JSON.stringify(details);
    if (json && json.length > MAX_JSON) json = JSON.stringify({ truncated: true, preview: json.slice(0, MAX_JSON) });
    await db.query(
      `INSERT INTO audit_logs (actor_id, actor_name, actor_email, actor_role, action, entity_type, entity_id, summary,
                               method, path, status_code, details, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        e.actor?.id || null, (e.actor?.name || '').slice(0, 120) || null, (e.actor?.email || '').slice(0, 255) || null, e.actor?.role || null,
        e.action || 'other', (e.entityType || 'unknown').slice(0, 60), e.entityId ? String(e.entityId).slice(0, 80) : null,
        (e.summary || 'Admin action').slice(0, 255), e.method || null, (e.path || '').slice(0, 255) || null, e.statusCode || null,
        json, (e.ip || '').slice(0, 64) || null, (e.userAgent || '').slice(0, 255) || null,
      ]
    );
  } catch (err) {
    console.error('audit log write failed:', err.message);
  }
};

const ACTION_BY_METHOD = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };
const ID_RE = /^[0-9a-f-]{8,}$|^\d+$/i;

// Turns "/products/123/toggle-hidden" into { entityType:'products', entityId:'123', verb:'toggle hidden' }.
const describe = (method, urlPath) => {
  const parts = urlPath.split('?')[0].split('/').filter(Boolean); // e.g. ['products','123','toggle-hidden']
  const entityType = parts[0] || 'admin';
  const idIdx = parts.findIndex((p, i) => i > 0 && ID_RE.test(p));
  const entityId = idIdx > 0 ? parts[idIdx] : null;
  const verbParts = parts.filter((p, i) => i > 0 && i !== idIdx).map((p) => p.replace(/[-_]/g, ' '));
  const base = { POST: 'Created', PUT: 'Updated', PATCH: 'Updated', DELETE: 'Deleted' }[method] || method;
  const noun = entityType.replace(/[-_]/g, ' ').replace(/s$/, '');
  const summary = verbParts.length
    ? `${base === 'Created' ? 'Ran' : base} ${verbParts.join(' ')} on ${noun}${entityId ? ` ${entityId}` : ''}`
    : `${base} ${noun}${entityId ? ` ${entityId}` : ''}`;
  return { entityType, entityId, summary };
};

/**
 * Express middleware for /api/admin: logs every successful mutating request.
 * Controllers may enrich or override via res.locals.audit = { action, entityType, entityId, summary, details }.
 */
const auditAdminActions = (req, res, next) => {
  const action = ACTION_BY_METHOD[req.method];
  if (!action) return next();
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const auto = describe(req.method, req.originalUrl.replace(/^\/api\/admin/, ''));
    const o = res.locals.audit || {};
    const body = req.is('multipart/form-data') ? { ...req.body, _files: (req.files || (req.file ? [req.file] : [])).map((f) => f.originalname) } : req.body;
    record({
      actor: req.user,
      action: o.action || action,
      entityType: o.entityType || auto.entityType,
      entityId: o.entityId || auto.entityId,
      summary: o.summary || auto.summary,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      details: o.details !== undefined ? o.details : (body && Object.keys(body).length ? body : null),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  next();
};

module.exports = { record, auditAdminActions, describe };
