const trashService = require('../../../services/trash/trash.service');
const { ok, badRequest, notFound } = require('../../../utils/response');

const overview = async (req, res) => {
  const type = req.query.type;
  const search = String(req.query.search || '').trim();
  const counts = await trashService.counts();
  const types = Object.keys(trashService.TYPES);
  const items = {};
  for (const t of (type && trashService.TYPES[type] ? [type] : types)) {
    items[t] = await trashService.listType(t, { search });
  }
  ok(res, { counts, items, retention_days: trashService.RETENTION_DAYS, types: types.map((t) => ({ key: t, label: trashService.TYPES[t].label })) });
};

const restore = async (req, res) => {
  const { type, id } = req.params;
  if (!trashService.TYPES[type]) return badRequest(res, 'Unknown item type');
  const row = await trashService.restore(type, id);
  if (!row) return notFound(res, 'Item not found in Trash');
  res.locals.audit = { action: 'update', entityType: type, entityId: id, summary: `Restored ${trashService.TYPES[type].label.toLowerCase()} ${id} from Trash` };
  ok(res, {}, `${trashService.TYPES[type].label} restored`);
};

const purge = async (req, res) => {
  const { type, id } = req.params;
  if (!trashService.TYPES[type]) return badRequest(res, 'Unknown item type');
  const result = await trashService.purge(type, id);
  if (!result.ok) return result.reason === 'not_found' ? notFound(res, 'Item not found in Trash') : badRequest(res, result.reason);
  res.locals.audit = { action: 'delete', entityType: type, entityId: id, summary: `Permanently deleted ${trashService.TYPES[type].label.toLowerCase()} ${id}` };
  ok(res, {}, 'Deleted permanently');
};

const empty = async (req, res) => {
  const type = req.params.type;
  const types = type ? [type] : Object.keys(trashService.TYPES);
  if (type && !trashService.TYPES[type]) return badRequest(res, 'Unknown item type');
  let deleted = 0; const kept = [];
  for (const t of types) {
    const rows = await trashService.listType(t, { limit: 1000 });
    for (const r of rows) {
      const result = await trashService.purge(t, r.id);
      if (result.ok) deleted += 1; else kept.push(`${trashService.TYPES[t].label}: ${r.name}`);
    }
  }
  res.locals.audit = { action: 'delete', entityType: 'trash', entityId: type || 'all', summary: `Emptied Trash (${type || 'all'}): ${deleted} deleted, ${kept.length} kept`, details: { kept } };
  ok(res, { deleted, kept }, kept.length ? `${deleted} deleted, ${kept.length} kept because they are still referenced` : `${deleted} item(s) deleted permanently`);
};

module.exports = { overview, restore, purge, empty };
