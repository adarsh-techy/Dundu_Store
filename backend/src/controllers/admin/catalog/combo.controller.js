const db = require('../../../config/db');
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
  const { rows: combos } = await db.query('SELECT * FROM combos ORDER BY sort_order, created_at DESC');

  for (const combo of combos) {
    const { rows: slots } = await db.query(
      'SELECT cs.*, (SELECT COUNT(*) FROM combo_slot_products WHERE slot_id=cs.id) AS product_count FROM combo_slots cs WHERE cs.combo_id=$1 ORDER BY cs.sort_order',
      [combo.id]
    );
    combo.slots = slots;
  }

  ok(res, { combos });
};

const getOne = async (req, res) => {
  const combo = await fetchComboDetail(req.params.id);
  if (!combo) return notFound(res, 'Combo not found');
  ok(res, { combo });
};

const create = async (req, res) => {
  const { name, description, price, offer_price, stock, sort_order, slots } = req.body;
  if (!name?.trim()) return badRequest(res, 'name is required');
  if (!price) return badRequest(res, 'price is required');

  const image_url = req.file ? getFileUrl(req.file) : null;

  const slotsData = typeof slots === 'string' ? JSON.parse(slots) : (slots || []);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO combos (name, description, price, offer_price, image_url, stock, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name.trim(), description || null, price, offer_price || null, image_url, stock ?? 100, sort_order ?? 0]
    );
    const combo = rows[0];

    for (let si = 0; si < slotsData.length; si++) {
      const slot = slotsData[si];
      const { rows: slotRows } = await client.query(
        `INSERT INTO combo_slots (combo_id, slot_label, requires_selection, sort_order)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [combo.id, slot.slot_label, slot.requires_selection !== false, si]
      );
      const slotRow = slotRows[0];

      const products = slot.products || [];
      for (let pi = 0; pi < products.length; pi++) {
        await client.query(
          `INSERT INTO combo_slot_products (slot_id, product_id, sort_order) VALUES ($1,$2,$3)`,
          [slotRow.id, products[pi].id || products[pi], pi]
        );
      }
    }

    await client.query('COMMIT');
    const full = await fetchComboDetail(combo.id);
    created(res, { combo: full });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const update = async (req, res) => {
  const { name, description, price, offer_price, stock, sort_order, slots } = req.body;
  const existing = await db.query('SELECT * FROM combos WHERE id=$1', [req.params.id]);
  if (!existing.rows.length) return notFound(res, 'Combo not found');

  const image_url = req.file
    ? getFileUrl(req.file)
    : (req.body.image_url || existing.rows[0].image_url);

  const slotsData = typeof slots === 'string' ? JSON.parse(slots) : (slots || null);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE combos SET name=$1, description=$2, price=$3, offer_price=$4, image_url=$5, stock=$6, sort_order=$7, updated_at=now()
       WHERE id=$8`,
      [
        name || existing.rows[0].name,
        description !== undefined ? description : existing.rows[0].description,
        price || existing.rows[0].price,
        offer_price !== undefined ? (offer_price || null) : existing.rows[0].offer_price,
        image_url,
        stock !== undefined ? stock : existing.rows[0].stock,
        sort_order !== undefined ? sort_order : existing.rows[0].sort_order,
        req.params.id,
      ]
    );

    // Rebuild slots only if provided
    if (slotsData !== null) {
      // Delete all existing slots (cascades to slot_products)
      await client.query('DELETE FROM combo_slots WHERE combo_id=$1', [req.params.id]);

      for (let si = 0; si < slotsData.length; si++) {
        const slot = slotsData[si];
        const { rows: slotRows } = await client.query(
          `INSERT INTO combo_slots (combo_id, slot_label, requires_selection, sort_order)
           VALUES ($1,$2,$3,$4) RETURNING *`,
          [req.params.id, slot.slot_label, slot.requires_selection !== false, si]
        );
        const slotRow = slotRows[0];

        const products = slot.products || [];
        for (let pi = 0; pi < products.length; pi++) {
          await client.query(
            `INSERT INTO combo_slot_products (slot_id, product_id, sort_order) VALUES ($1,$2,$3)`,
            [slotRow.id, products[pi].id || products[pi], pi]
          );
        }
      }
    }

    await client.query('COMMIT');
    const full = await fetchComboDetail(req.params.id);
    ok(res, { combo: full });
  } catch (err) {
    await client.query('ROLLBACK');
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

const remove = async (req, res) => {
  const { rows } = await db.query('DELETE FROM combos WHERE id=$1 RETURNING id', [req.params.id]);
  if (!rows.length) return notFound(res, 'Combo not found');
  ok(res, { message: 'Combo deleted' });
};

module.exports = { list, getOne, create, update, toggle, remove };
