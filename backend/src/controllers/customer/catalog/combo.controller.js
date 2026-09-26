const db = require('../../../config/db');
const { ok, notFound } = require('../../../utils/response');

/**
 * List all active combos with slots and product previews (for the list screen)
 */
const list = async (_req, res) => {
  const { rows: combos } = await db.query(
    'SELECT * FROM combos WHERE is_active=true ORDER BY sort_order, created_at DESC'
  );

  for (const combo of combos) {
    const { rows: slots } = await db.query(
      `SELECT cs.*,
              json_agg(
                json_build_object(
                  'slot_product_id', csp.id,
                  'id', p.id,
                  'name', p.name,
                  'price', p.price,
                  'offer_price', p.offer_price,
                  'image', (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1)
                ) ORDER BY csp.sort_order
              ) AS products
       FROM combo_slots cs
       LEFT JOIN combo_slot_products csp ON csp.slot_id = cs.id
       LEFT JOIN products p ON p.id = csp.product_id
       WHERE cs.combo_id=$1
       GROUP BY cs.id
       ORDER BY cs.sort_order`,
      [combo.id]
    );
    combo.slots = slots;
  }

  ok(res, { combos });
};

/**
 * Get one combo with full slot + variant detail (for the detail/buy screen)
 */
const getOne = async (req, res) => {
  const { rows: combos } = await db.query(
    'SELECT * FROM combos WHERE id=$1 AND is_active=true',
    [req.params.id]
  );
  if (!combos.length) return notFound(res, 'Combo not found');
  const combo = combos[0];

  const { rows: slots } = await db.query(
    'SELECT * FROM combo_slots WHERE combo_id=$1 ORDER BY sort_order',
    [combo.id]
  );

  for (const slot of slots) {
    const { rows: slotProducts } = await db.query(
      `SELECT csp.id AS slot_product_id, csp.sort_order,
              p.id, p.name, p.price, p.offer_price, p.sku, p.description,
              (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS image,
              (SELECT json_agg(img.url ORDER BY img.sort_order) FROM product_images img WHERE img.product_id=p.id) AS images,
              COALESCE(
                (SELECT json_agg(
                    json_build_object('id',pv.id,'size',pv.size,'color',pv.color,'stock',pv.stock,'sku',pv.sku)
                    ORDER BY pv.size
                  ) FROM product_variants pv WHERE pv.product_id=p.id),
                '[]'::json
              ) AS variants
       FROM combo_slot_products csp
       JOIN products p ON p.id = csp.product_id
       WHERE csp.slot_id=$1
       ORDER BY csp.sort_order`,
      [slot.id]
    );
    slot.products = slotProducts;
  }

  combo.slots = slots;
  ok(res, { combo });
};

module.exports = { list, getOne };
