const db = require('../../config/db');

// One entry per trashable record type.
//  hide:     columns flipped when trashed (and remembered in trash_meta for restore)
//  blockers: reasons a permanent delete must be refused
//  purge:    hard delete inside a transaction
const TYPES = {
  products: {
    label: 'Product', table: 'products', nameCol: 'name', hide: { is_hidden: true },
    extra: "COALESCE((SELECT url FROM product_images WHERE product_id = t.id AND is_primary = true LIMIT 1), '') AS image, t.price, t.stock",
    blockers: async (id) => {
      const { rows } = await db.query('SELECT 1 FROM order_items WHERE product_id=$1 LIMIT 1', [id]);
      return rows.length ? 'This product appears in past orders, so it must stay for the order history. Keep it in Trash or restore it.' : null;
    },
    purge: async (client, id) => {
      await client.query('DELETE FROM cart WHERE product_id=$1', [id]);
      await client.query('DELETE FROM wishlists WHERE product_id=$1', [id]).catch(() => {});
      await client.query('DELETE FROM combo_slot_products WHERE product_id=$1', [id]);
      await client.query('DELETE FROM product_images WHERE product_id=$1', [id]);
      await client.query('DELETE FROM product_variants WHERE product_id=$1', [id]);
      await client.query('DELETE FROM products WHERE id=$1', [id]);
    },
  },
  categories: {
    label: 'Category', table: 'categories', nameCol: 'name', hide: { is_active: false },
    extra: "COALESCE(t.image_url, '') AS image, (SELECT COUNT(*)::int FROM products WHERE category_id = t.id) AS product_count",
    blockers: async (id) => {
      const { rows } = await db.query('SELECT COUNT(*)::int AS c FROM products WHERE category_id=$1', [id]);
      return rows[0].c > 0 ? `${rows[0].c} product(s) still belong to this category. Restore it, move the products, then delete.` : null;
    },
    purge: async (client, id) => { await client.query('DELETE FROM categories WHERE id=$1', [id]); },
  },
  combos: {
    label: 'Combo', table: 'combos', nameCol: 'name', hide: { is_active: false },
    extra: "COALESCE(t.image_url, '') AS image, t.price, t.offer_price",
    blockers: async () => null,
    purge: async (client, id) => { await client.query('DELETE FROM combos WHERE id=$1', [id]); },
  },
  coupons: {
    label: 'Coupon', table: 'coupons', nameCol: 'code', hide: { is_active: false },
    extra: "'' AS image, t.discount_type, t.discount_value, t.used_count",
    blockers: async () => null,
    purge: async (client, id) => { await client.query('DELETE FROM coupons WHERE id=$1', [id]); },
  },
  banners: {
    label: 'Banner', table: 'banners', nameCol: 'title', hide: { is_active: false },
    extra: "COALESCE(t.image_url, '') AS image, t.link",
    blockers: async () => null,
    purge: async (client, id) => { await client.query('DELETE FROM banners WHERE id=$1', [id]); },
  },
  announcements: {
    label: 'Announcement', table: 'announcements', nameCol: 'text', hide: { is_active: false },
    extra: "'' AS image, t.bg_color, t.text_color",
    blockers: async () => null,
    purge: async (client, id) => { await client.query('DELETE FROM announcements WHERE id=$1', [id]); },
  },
};

const RETENTION_DAYS = 30;

const getType = (type) => TYPES[type] || null;

/** Move a record to Trash. Returns the row or null when not found / already trashed. */
const trash = async (type, id, actorId) => {
  const cfg = getType(type);
  if (!cfg) throw new Error(`Unknown trash type: ${type}`);
  const hideCols = Object.keys(cfg.hide);
  const { rows: cur } = await db.query(`SELECT ${hideCols.join(', ')} FROM ${cfg.table} WHERE id=$1 AND deleted_at IS NULL`, [id]);
  if (!cur.length) return null;
  const meta = {};
  hideCols.forEach((c) => { meta[c] = cur[0][c]; });
  const sets = hideCols.map((c, i) => `${c}=$${i + 4}`);
  const { rows } = await db.query(
    `UPDATE ${cfg.table} SET deleted_at=now(), deleted_by=$2, trash_meta=$3${sets.length ? ', ' + sets.join(', ') : ''}
     WHERE id=$1 RETURNING id`,
    [id, actorId || null, JSON.stringify(meta), ...hideCols.map((c) => cfg.hide[c])]
  );
  return rows[0] || null;
};

/** Put a trashed record back, restoring the state it had before deletion. */
const restore = async (type, id) => {
  const cfg = getType(type);
  if (!cfg) throw new Error(`Unknown trash type: ${type}`);
  const { rows: cur } = await db.query(`SELECT trash_meta FROM ${cfg.table} WHERE id=$1 AND deleted_at IS NOT NULL`, [id]);
  if (!cur.length) return null;
  const meta = cur[0].trash_meta || {};
  const hideCols = Object.keys(cfg.hide);
  const sets = hideCols.map((c, i) => `${c}=$${i + 2}`);
  const vals = hideCols.map((c) => (meta[c] !== undefined ? meta[c] : !cfg.hide[c]));
  const { rows } = await db.query(
    `UPDATE ${cfg.table} SET deleted_at=NULL, deleted_by=NULL, trash_meta=NULL${sets.length ? ', ' + sets.join(', ') : ''}
     WHERE id=$1 RETURNING id`,
    [id, ...vals]
  );
  return rows[0] || null;
};

/** Permanently delete a trashed record. Returns { ok, reason }. */
const purge = async (type, id) => {
  const cfg = getType(type);
  if (!cfg) throw new Error(`Unknown trash type: ${type}`);
  const { rows } = await db.query(`SELECT id FROM ${cfg.table} WHERE id=$1 AND deleted_at IS NOT NULL`, [id]);
  if (!rows.length) return { ok: false, reason: 'not_found' };
  const reason = await cfg.blockers(id);
  if (reason) return { ok: false, reason };
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await cfg.purge(client, id);
    await client.query('COMMIT');
    return { ok: true };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

const listType = async (type, { search = '', limit = 100 } = {}) => {
  const cfg = getType(type);
  const params = [];
  let where = 't.deleted_at IS NOT NULL';
  if (search) { params.push(`%${search}%`); where += ` AND t.${cfg.nameCol}::text ILIKE $${params.length}`; }
  params.push(limit);
  const { rows } = await db.query(
    `SELECT t.id, t.${cfg.nameCol}::text AS name, t.deleted_at, t.deleted_by, u.name AS deleted_by_name, ${cfg.extra},
            (t.deleted_at + interval '${RETENTION_DAYS} days') AS purge_at
     FROM ${cfg.table} t LEFT JOIN users u ON u.id = t.deleted_by
     WHERE ${where}
     ORDER BY t.deleted_at DESC LIMIT $${params.length}`,
    params
  );
  return rows;
};

const counts = async () => {
  const out = {};
  for (const [type, cfg] of Object.entries(TYPES)) {
    const { rows } = await db.query(`SELECT COUNT(*)::int AS c FROM ${cfg.table} WHERE deleted_at IS NOT NULL`);
    out[type] = rows[0].c;
  }
  return out;
};

/** Hard-delete everything trashed longer than RETENTION_DAYS (items with blockers are kept). */
const purgeExpired = async () => {
  let removed = 0;
  for (const [type, cfg] of Object.entries(TYPES)) {
    const { rows } = await db.query(
      `SELECT id FROM ${cfg.table} WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '${RETENTION_DAYS} days'`
    );
    for (const r of rows) {
      const res = await purge(type, r.id).catch(() => ({ ok: false }));
      if (res.ok) removed += 1;
    }
  }
  return removed;
};

module.exports = { TYPES, RETENTION_DAYS, trash, restore, purge, listType, counts, purgeExpired };
