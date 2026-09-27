const db = require('../../../config/db');
const trashService = require('../../../services/trash/trash.service');
const { ok, created, notFound, badRequest } = require('../../../utils/response');
const { getFileUrl } = require('../../../utils/upload');

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Fetch full combo detail: combo row + slots + slot products with images
 */
async function fetchComboDetail(id) {
  const { rows: combos } = await db.query('SELECT * FROM combos WHERE id=$1', [id]);
  if (!combos.length) return null;
  const combo = combos[0];

  const { rows: slots } = await db.query(
    'SELECT * FROM combo_slots WHERE combo_id=$1 ORDER BY sort_order',
    [id]
  );

  for (const slot of slots) {
    const { rows: slotProducts } = await db.query(
      `SELECT csp.id AS slot_product_id, csp.sort_order,
              p.id, p.name, p.price, p.offer_price, p.sku,
              (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS image,
              (SELECT json_agg(json_build_object('id',pv.id,'size',pv.size,'color',pv.color,'stock',pv.stock,'sku',pv.sku) ORDER BY pv.size)
               FROM product_variants pv WHERE pv.product_id=p.id) AS variants
       FROM combo_slot_products csp
       JOIN products p ON p.id = csp.product_id
       WHERE csp.slot_id=$1
       ORDER BY csp.sort_order`,
      [slot.id]
    );
    slot.products = slotProducts;
  }

  combo.slots = slots;
  return combo;
}

// ── Controllers ────────────────────────────────────────────────────────────────

const list = async (_req, res) => {
  const { rows: combos } = await db.query(
    `SELECT c.*,
            (SELECT COUNT(DISTINCT order_id)::int FROM order_items WHERE combo_id = c.id) AS orders_count
     FROM combos c WHERE c.deleted_at IS NULL ORDER BY c.sort_order, c.created_at DESC`
  );
  for (const combo of combos) {
    const { rows: slots } = await db.query(
      `SELECT cs.id, cs.slot_label, cs.requires_selection, cs.sort_order,
              COALESCE(json_agg(json_build_object('id', p.id, 'name', p.name, 'price', p.price, 'offer_price', p.offer_price,
                'image', (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1)) ORDER BY csp.sort_order)
                FILTER (WHERE p.id IS NOT NULL), '[]') AS products
       FROM combo_slots cs
       LEFT JOIN combo_slot_products csp ON csp.slot_id = cs.id
       LEFT JOIN products p ON p.id = csp.product_id
       WHERE cs.combo_id=$1
       GROUP BY cs.id ORDER BY cs.sort_order`,
      [combo.id]
    );
    combo.slots = slots.map((s) => ({ ...s, product_count: s.products.length }));
    // What the customer would pay buying the first option of every slot separately.
    combo.regular_total = slots.reduce((sum, s) => sum + (Number(s.products[0]?.offer_price) > 0 ? Number(s.products[0].offer_price) : Number(s.products[0]?.price) || 0), 0);
  }
  ok(res, { combos });
};

const getOne = async (req, res) => {
  const combo = await fetchComboDetail(req.params.id);
  if (!combo) return notFound(res, 'Combo not found');
  ok(res, { combo });
};

// ── Validation shared by create/update ──────────────────────────────────────────
const parseNumber = (v, fallback = null) => {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const validateComboInput = async (client, body, { partial = false } = {}) => {
  const errors = [];
  const out = {};

  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) errors.push('Name is required');
    else if (name.length > 255) errors.push('Name is too long');
    out.name = name;
  }
  if (!partial || body.price !== undefined) {
    const price = parseNumber(body.price);
    if (!(price > 0)) errors.push('Price must be greater than 0');
    out.price = price;
  }
  if (body.offer_price !== undefined) {
    const offer = parseNumber(body.offer_price, null);
    if (offer !== null && Number.isNaN(offer)) errors.push('Offer price must be a number');
    else if (offer !== null && offer > 0 && out.price !== undefined && offer >= out.price) errors.push('Offer price must be lower than the price');
    out.offer_price = offer && offer > 0 ? offer : null;
  }
  if (body.stock !== undefined) {
    const stock = parseNumber(body.stock, 100);
    if (Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock)) errors.push('Stock must be a whole number ≥ 0');
    out.stock = stock;
  }
  if (body.sort_order !== undefined) {
    const so = parseNumber(body.sort_order, 0);
    out.sort_order = Number.isNaN(so) ? 0 : Math.trunc(so);
  }
  if (body.description !== undefined) out.description = body.description ? String(body.description).slice(0, 2000) : null;

  let slots = null;
  if (body.slots !== undefined) {
    try { slots = typeof body.slots === 'string' ? JSON.parse(body.slots) : body.slots; } catch { errors.push('Slots payload is not valid JSON'); }
    if (slots !== null && !Array.isArray(slots)) errors.push('Slots must be a list');
    if (Array.isArray(slots)) {
      if (!partial && slots.length === 0) errors.push('Add at least one slot');
      const ids = new Set();
      slots.forEach((slot, i) => {
        const label = String(slot?.slot_label || '').trim();
        if (!label) errors.push(`Slot ${i + 1} needs a label`);
        const products = Array.isArray(slot?.products) ? slot.products.map((p) => (typeof p === 'string' ? p : p?.id)).filter(Boolean) : [];
        if (!products.length) errors.push(`Slot "${label || i + 1}" needs at least one product`);
        products.forEach((id) => ids.add(id));
        slot._label = label; slot._products = [...new Set(products)];
      });
      if (ids.size) {
        const { rows } = await client.query('SELECT id FROM products WHERE id = ANY($1::uuid[]) AND is_hidden = false', [[...ids]]);
        const found = new Set(rows.map((r) => r.id));
        const missing = [...ids].filter((id) => !found.has(id));
        if (missing.length) errors.push(`${missing.length} selected product(s) no longer exist or are hidden`);
      }
    }
  }
  return { errors, values: out, slots };
};

// Upsert slots by id so carts that already reference a slot keep working after an edit.
const syncSlots = async (client, comboId, slots) => {
  const { rows: existing } = await client.query('SELECT id FROM combo_slots WHERE combo_id=$1', [comboId]);
  const existingIds = new Set(existing.map((r) => r.id));
  const keep = new Set();
  for (let si = 0; si < slots.length; si++) {
    const slot = slots[si];
    let slotId = slot.id && existingIds.has(slot.id) ? slot.id : null;
    if (slotId) {
      await client.query(
        'UPDATE combo_slots SET slot_label=$1, requires_selection=$2, sort_order=$3 WHERE id=$4',
        [slot._label, slot.requires_selection !== false, si, slotId]
      );
      await client.query('DELETE FROM combo_slot_products WHERE slot_id=$1', [slotId]);
    } else {
      const { rows } = await client.query(
        'INSERT INTO combo_slots (combo_id, slot_label, requires_selection, sort_order) VALUES ($1,$2,$3,$4) RETURNING id',
        [comboId, slot._label, slot.requires_selection !== false, si]
      );
      slotId = rows[0].id;
    }
    keep.add(slotId);
    for (let pi = 0; pi < slot._products.length; pi++) {
      await client.query('INSERT INTO combo_slot_products (slot_id, product_id, sort_order) VALUES ($1,$2,$3)', [slotId, slot._products[pi], pi]);
    }
  }
  const toDelete = [...existingIds].filter((id) => !keep.has(id));
  if (toDelete.length) await client.query('DELETE FROM combo_slots WHERE id = ANY($1::uuid[])', [toDelete]);
};

const create = async (req, res) => {
  const client = await db.getClient();
  try {
    const { errors, values, slots } = await validateComboInput(client, req.body);
    if (errors.length) return badRequest(res, errors[0]); // finally releases the client
    const image_url = req.file ? getFileUrl(req.file) : null;

    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO combos (name, description, price, offer_price, image_url, stock, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [values.name, values.description ?? null, values.price, values.offer_price ?? null, image_url, values.stock ?? 100, values.sort_order ?? 0]
    );
    const combo = rows[0];
    await syncSlots(client, combo.id, slots || []);
    await client.query('COMMIT');
    const full = await fetchComboDetail(combo.id);
    created(res, { combo: full });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

const update = async (req, res) => {
  const existing = await db.query('SELECT * FROM combos WHERE id=$1', [req.params.id]);
  if (!existing.rows.length) return notFound(res, 'Combo not found');
  const cur = existing.rows[0];

  const client = await db.getClient();
  try {
    const { errors, values, slots } = await validateComboInput(client, { ...req.body, price: req.body.price ?? cur.price }, { partial: true });
    if (errors.length) return badRequest(res, errors[0]); // finally releases the client
    const image_url = req.file ? getFileUrl(req.file) : (req.body.image_url === '' ? null : (req.body.image_url || cur.image_url));

    await client.query('BEGIN');
    await client.query(
      `UPDATE combos SET name=$1, description=$2, price=$3, offer_price=$4, image_url=$5, stock=$6, sort_order=$7, updated_at=now()
       WHERE id=$8`,
      [
        values.name ?? cur.name,
        values.description !== undefined ? values.description : cur.description,
        values.price ?? cur.price,
        req.body.offer_price !== undefined ? values.offer_price : cur.offer_price,
        image_url,
        values.stock !== undefined ? values.stock : cur.stock,
        values.sort_order !== undefined ? values.sort_order : cur.sort_order,
        req.params.id,
      ]
    );
    if (Array.isArray(slots)) await syncSlots(client, req.params.id, slots);
    await client.query('COMMIT');
    const full = await fetchComboDetail(req.params.id);
    ok(res, { combo: full });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

const toggle = async (req, res) => {
  const { rows } = await db.query(
    'UPDATE combos SET is_active = NOT is_active WHERE id=$1 RETURNING *',
    [req.params.id]
  );
  if (!rows.length) return notFound(res, 'Combo not found');
  ok(res, { combo: rows[0] });
};

// Deleting moves the combo to Trash (restorable for 30 days).
const remove = async (req, res) => {
  const row = await trashService.trash('combos', req.params.id, req.user?.id);
  if (!row) return notFound(res, 'Combo not found');
  await db.query('DELETE FROM cart WHERE combo_id=$1', [req.params.id]);
  ok(res, { message: 'Combo moved to Trash' });
};

module.exports = { list, getOne, create, update, toggle, remove };
