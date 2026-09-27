const db = require('../../config/db');
const { notFound } = require('../../utils/response');

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
      await client.query('DELETE FROM combo_slot_products WHERE product_id=$1', [id]);
      await client.query('DELETE FROM product_images WHERE product_id=$1', [id]);
      await client.query('DELETE FROM product_variants WHERE product_id=$1', [id]);
      await client.query('DELETE FROM products WHERE id=$1', [id]);
    },
  },
  categories: {
    label: 'Category', table: 'categories', nameCol: 'name', hide: { is_active: false }, uniqueCol: 'slug',
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
    label: 'Coupon', table: 'coupons', nameCol: 'code', hide: { is_active: false }, uniqueCol: 'code',
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

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    // Free the unique key (coupon code / category slug) so a replacement can be created
    // while this one sits in Trash; the original value is kept for restore.
    let renameSql = '';
    if (cfg.uniqueCol) {
      const { rows: u } = await client.query(`SELECT ${cfg.uniqueCol} FROM ${cfg.table} WHERE id=$1`, [id]);
      meta[cfg.uniqueCol] = u[0][cfg.uniqueCol];
      renameSql = `, ${cfg.uniqueCol} = ${cfg.uniqueCol} || '~trash~' || left(id::text, 8)`;
    }
    // A trashed category takes its (currently visible) products off the store with it.
    if (type === 'categories') {
      const { rows: hidden } = await client.query(
        'UPDATE products SET is_hidden=true WHERE category_id=$1 AND deleted_at IS NULL AND is_hidden=false RETURNING id', [id]
      );
      meta.hidden_product_ids = hidden.map((r) => r.id);
    }
    const sets = hideCols.map((c, i) => `${c}=$${i + 4}`);
    const { rows } = await client.query(
      `UPDATE ${cfg.table} SET deleted_at=now(), deleted_by=$2, trash_meta=$3${sets.length ? ', ' + sets.join(', ') : ''}${renameSql}
       WHERE id=$1 RETURNING id`,
      [id, actorId || null, JSON.stringify(meta), ...hideCols.map((c) => cfg.hide[c])]
    );
    await client.query('COMMIT');
    return rows[0] || null;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

/** Put a trashed record back, restoring the state it had before deletion. */
const restore = async (type, id) => {
  const cfg = getType(type);
  if (!cfg) throw new Error(`Unknown trash type: ${type}`);
  const { rows: cur } = await db.query(`SELECT trash_meta FROM ${cfg.table} WHERE id=$1 AND deleted_at IS NOT NULL`, [id]);
  if (!cur.length) return null;
  const meta = cur[0].trash_meta || {};
  if (type === 'products') {
    const { rows: cat } = await db.query(
      'SELECT c.deleted_at FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id=$1', [id]
    );
    if (cat[0]?.deleted_at) return { blocked: 'Its category is in Trash. Restore the category first (or move the product to another category).' };
  }
  const hideCols = Object.keys(cfg.hide);
  const sets = hideCols.map((c, i) => `${c}=$${i + 2}`);
  const vals = hideCols.map((c) => (meta[c] !== undefined ? meta[c] : !cfg.hide[c]));
  let renameSql = '';
  if (cfg.uniqueCol && meta[cfg.uniqueCol]) {
    // Put the original code/slug back unless a newer record took it meanwhile.
    const { rows: clash } = await db.query(`SELECT 1 FROM ${cfg.table} WHERE ${cfg.uniqueCol}=$1 AND id<>$2`, [meta[cfg.uniqueCol], id]);
    vals.push(clash.length ? `${meta[cfg.uniqueCol]}-restored` : meta[cfg.uniqueCol]);
    renameSql = `, ${cfg.uniqueCol}=$${vals.length + 1}`;
  }
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE ${cfg.table} SET deleted_at=NULL, deleted_by=NULL, trash_meta=NULL${sets.length ? ', ' + sets.join(', ') : ''}${renameSql}
       WHERE id=$1 RETURNING id`,
      [id, ...vals]
    );
    if (type === 'categories' && Array.isArray(meta.hidden_product_ids) && meta.hidden_product_ids.length) {
      await client.query('UPDATE products SET is_hidden=false WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL', [meta.hidden_product_ids]);
      // Products trashed while the category was in Trash remembered "hidden" only because of
      // the cascade; fix their saved state so restoring them later makes them visible.
      await client.query(
        `UPDATE products SET trash_meta = COALESCE(trash_meta, '{}'::jsonb) || '{"is_hidden": false}'::jsonb
         WHERE id = ANY($1::uuid[]) AND deleted_at IS NOT NULL`, [meta.hidden_product_ids]
      );
    }
    await client.query('COMMIT');
    return rows[0] || null;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

/** Express middleware: refuse to edit/toggle/read a record that is currently in Trash. */
const notTrashed = (type, param = 'id') => async (req, res, next) => {
  const cfg = getType(type);
  if (!cfg) return next();
  const id = req.params[param];
  // Only real record ids are checked; static sub-paths such as /next-code or /bulk pass through.
  const looksLikeId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || /^\d+$/.test(id);
  if (!id || !looksLikeId) return next();
  try {
    const { rows } = await db.query(`SELECT deleted_at FROM ${cfg.table} WHERE id=$1`, [id]);
    if (rows.length && rows[0].deleted_at) return notFound(res, `This ${cfg.label.toLowerCase()} is in Trash. Restore it first.`);
    next();
  } catch (err) { next(err); }
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

module.exports = { TYPES, RETENTION_DAYS, trash, restore, purge, listType, counts, purgeExpired, notTrashed };
