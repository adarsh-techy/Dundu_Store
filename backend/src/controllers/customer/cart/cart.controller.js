const db = require('../../../config/db');
const { ok, badRequest, notFound } = require('../../../utils/response');

// ── Cart query ────────────────────────────────────────────────────────────────
// Handles both regular product items and combo items
const CART_QUERY = `
  SELECT
    c.id, c.quantity, c.variant_id, c.combo_id, c.combo_selections,
    -- Regular product fields (null for combo-only items)
    p.id    AS product_id,
    p.name,
    p.price,
    p.offer_price,
    p.stock,
    (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS image,
    pv.size, pv.color, pv.stock AS variant_stock,
    -- Combo fields (null for regular items)
    cb.name        AS combo_name,
    cb.price       AS combo_price,
    cb.offer_price AS combo_offer_price,
    cb.image_url   AS combo_image
  FROM cart c
  LEFT JOIN products p          ON c.product_id  = p.id
  LEFT JOIN product_variants pv ON c.variant_id  = pv.id
  LEFT JOIN combos cb           ON c.combo_id    = cb.id
  WHERE c.user_id=$1
`;

const getCart = async (req, res) => {
  const { rows } = await db.query(CART_QUERY, [req.user.id]);
  ok(res, { cart: rows });
};

const addToCart = async (req, res) => {
  const { product_id, variant_id, quantity = 1, combo_id, combo_selections } = req.body;

  // ── Combo item ──────────────────────────────────────────────────────────────
  if (combo_id) {
    const { rows: combo } = await db.query(
      'SELECT id, stock FROM combos WHERE id=$1 AND is_active=true',
      [combo_id]
    );
    if (!combo.length) return notFound(res, 'Combo not found');

    // Combos are stored as separate rows each time (one per add)
    await db.query(
      'INSERT INTO cart (user_id, combo_id, combo_selections, quantity) VALUES ($1,$2,$3,$4)',
      [
        req.user.id,
        combo_id,
        typeof combo_selections === 'string' ? combo_selections : JSON.stringify(combo_selections || []),
        quantity,
      ]
    );

    const { rows } = await db.query(CART_QUERY, [req.user.id]);
    return ok(res, { cart: rows });
  }

  // ── Regular product item ────────────────────────────────────────────────────
  if (!product_id) return badRequest(res, 'product_id or combo_id is required');

  const { rows: prod } = await db.query(
    'SELECT id, stock FROM products WHERE id=$1 AND is_hidden=false',
    [product_id]
  );
  if (!prod.length) return notFound(res, 'Product not found');

  if (variant_id) {
    const { rows: variant } = await db.query(
      'SELECT id FROM product_variants WHERE id=$1 AND product_id=$2',
      [variant_id, product_id]
    );
    if (!variant.length) return badRequest(res, 'Invalid variant for this product');
  }

  const { rows: existing } = await db.query(
    'SELECT id, quantity FROM cart WHERE user_id=$1 AND product_id=$2 AND combo_id IS NULL AND (variant_id=$3 OR (variant_id IS NULL AND $3::uuid IS NULL))',
    [req.user.id, product_id, variant_id || null]
  );

  if (existing.length) {
    await db.query(
      'UPDATE cart SET quantity=$1, updated_at=now() WHERE id=$2',
      [existing[0].quantity + quantity, existing[0].id]
    );
  } else {
    await db.query(
      'INSERT INTO cart (user_id, product_id, variant_id, quantity) VALUES ($1,$2,$3,$4)',
      [req.user.id, product_id, variant_id || null, quantity]
    );
  }

  const { rows } = await db.query(CART_QUERY, [req.user.id]);
  ok(res, { cart: rows });
};

const updateCart = async (req, res) => {
  const { quantity } = req.body;
  if (quantity < 1) return badRequest(res, 'Quantity must be at least 1');

  const { rows } = await db.query(
    'UPDATE cart SET quantity=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING id',
    [quantity, req.params.id, req.user.id]
  );
  if (!rows.length) return notFound(res, 'Cart item not found');

  const { rows: cart } = await db.query(CART_QUERY, [req.user.id]);
  ok(res, { cart });
};

const removeFromCart = async (req, res) => {
  await db.query('DELETE FROM cart WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  const { rows } = await db.query(CART_QUERY, [req.user.id]);
  ok(res, { cart: rows });
};

const clearCart = async (req, res) => {
  await db.query('DELETE FROM cart WHERE user_id=$1', [req.user.id]);
  ok(res, { cart: [] });
};

module.exports = { getCart, addToCart, updateCart, removeFromCart, clearCart };
