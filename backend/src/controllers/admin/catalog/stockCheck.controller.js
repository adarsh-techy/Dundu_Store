const db = require('../../../config/db');
const { ok, notFound } = require('../../../utils/response');

// Stock Check: per-product purchase vs. sale ledger.
//   balance   = current products.stock
//   sold      = units on every order except cancelled/returned ones (their stock was put back)
//   purchased = balance + sold
// Buy price is order_items.cost_price when recorded, else products.cost_price. When neither
// is set the cost/profit figures are null — never guessed.
// Free replacement orders (payment_method='replacement') move stock but earn nothing, so
// their units count as sold with zero revenue.

const SOLD_ORDER = "o.status NOT IN ('cancelled','returned')";
const LINE_REVENUE = "CASE WHEN o.payment_method = 'replacement' THEN 0 ELSE oi.quantity * oi.unit_price END";
const LINE_COST = 'oi.quantity * COALESCE(oi.cost_price, p.cost_price)';

// Units/day over the last 30 days → a simple speed label.
const speedOf = (perDay, unitsSold) => {
  if (!unitsSold) return 'none';
  if (perDay >= 1) return 'fast';
  if (perDay >= 0.2) return 'medium';
  return 'slow';
};

const shape = (r) => {
  const costPrice = r.cost_price === null ? null : Number(r.cost_price);
  const sellPrice = Number(r.offer_price || r.price || 0);
  const stock = Number(r.stock) || 0;
  const sold = Number(r.units_sold) || 0;
  const purchased = stock + sold;
  const revenue = Number(r.revenue) || 0;
  // cost_of_sold is null if any sold line had no buy price available.
  const costOfSold = costPrice === null && sold ? null : (r.cost_of_sold === null ? 0 : Number(r.cost_of_sold));
  const profit = costOfSold === null ? null : revenue - costOfSold;
  const sold30 = Number(r.units_sold_30d) || 0;
  const perDay = sold30 / 30;

  let result = 'no_sales';
  if (sold && profit === null) result = 'cost_missing';
  else if (sold && profit > 0) result = 'profit';
  else if (sold && profit < 0) result = 'loss';
  else if (sold) result = 'break_even';

  return {
    id: r.id,
    name: r.name,
    sku: r.sku,
    image: r.image,
    category: r.category,
    is_hidden: r.is_hidden,
    cost_price: costPrice,
    sell_price: sellPrice,
    price: Number(r.price) || 0,
    offer_price: r.offer_price === null ? null : Number(r.offer_price),
    purchased_qty: purchased,
    purchase_total: costPrice === null ? null : purchased * costPrice,
    units_sold: sold,
    orders_count: Number(r.orders_count) || 0,
    buyers_count: Number(r.buyers_count) || 0,
    balance_qty: stock,
    balance_value: costPrice === null ? null : stock * costPrice,
    revenue,
    cost_of_sold: costOfSold,
    profit,
    margin_pct: profit === null || !revenue ? null : Math.round((profit / revenue) * 1000) / 10,
    result,
    units_sold_30d: sold30,
    per_day: Math.round(perDay * 100) / 100,
    speed: speedOf(perDay, sold),
    days_of_stock: perDay > 0 ? Math.round(stock / perDay) : null,
    sell_through_pct: purchased ? Math.round((sold / purchased) * 1000) / 10 : 0,
    first_sale_at: r.first_sale_at,
    last_sale_at: r.last_sale_at,
  };
};

const PRODUCT_SALES_SQL = (where) => `
  SELECT p.id, p.name, p.sku, p.stock, p.price, p.offer_price, p.cost_price, p.is_hidden,
         c.name AS category,
         (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) AS image,
         COALESCE(s.units_sold, 0) AS units_sold,
         COALESCE(s.orders_count, 0) AS orders_count,
         COALESCE(s.buyers_count, 0) AS buyers_count,
         COALESCE(s.revenue, 0) AS revenue,
         s.cost_of_sold,
         COALESCE(s.units_sold_30d, 0) AS units_sold_30d,
         s.first_sale_at, s.last_sale_at
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN LATERAL (
    SELECT SUM(oi.quantity)::int AS units_sold,
           COUNT(DISTINCT o.id)::int AS orders_count,
           COUNT(DISTINCT o.user_id)::int AS buyers_count,
           SUM(${LINE_REVENUE})::numeric AS revenue,
           SUM(${LINE_COST})::numeric AS cost_of_sold,
           SUM(oi.quantity) FILTER (WHERE o.created_at >= now() - INTERVAL '30 days')::int AS units_sold_30d,
           MIN(o.created_at) AS first_sale_at,
           MAX(o.created_at) AS last_sale_at
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id = p.id AND ${SOLD_ORDER}
  ) s ON true
  WHERE p.deleted_at IS NULL ${where}
`;

// GET /admin/stock-check
const getStockCheck = async (_req, res) => {
  const { rows } = await db.query(`${PRODUCT_SALES_SQL('')} ORDER BY p.name`);
  const products = rows.map(shape);

  const sum = (key) => products.reduce((t, p) => t + (p[key] || 0), 0);
  ok(res, {
    summary: {
      products: products.length,
      purchased_qty: sum('purchased_qty'),
      purchase_total: sum('purchase_total'),
      units_sold: sum('units_sold'),
      balance_qty: sum('balance_qty'),
      balance_value: sum('balance_value'),
      revenue: sum('revenue'),
      profit: sum('profit'),
      profit_products: products.filter((p) => p.result === 'profit').length,
      loss_products: products.filter((p) => p.result === 'loss').length,
      no_sales_products: products.filter((p) => p.result === 'no_sales').length,
      cost_missing_products: products.filter((p) => p.cost_price === null).length,
    },
    products,
  });
};

// GET /admin/stock-check/:id
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getStockCheckProduct = async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return notFound(res, 'Product not found');
  const { rows } = await db.query(PRODUCT_SALES_SQL('AND p.id = $1'), [req.params.id]);
  if (!rows.length) return notFound(res, 'Product not found');
  const product = shape(rows[0]);

  const [daily, sales, variants] = await Promise.all([
    // Last 90 days, one row per day (zero-filled) for the sales-speed chart.
    db.query(`
      SELECT TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
             COALESCE(SUM(oi.quantity), 0)::int AS units,
             COALESCE(SUM(${LINE_REVENUE}), 0)::numeric AS revenue
      FROM generate_series(CURRENT_DATE - INTERVAL '89 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
      LEFT JOIN orders o ON o.created_at::date = d.day::date AND ${SOLD_ORDER}
      LEFT JOIN order_items oi ON oi.order_id = o.id AND oi.product_id = $1
      LEFT JOIN products p ON p.id = oi.product_id
      GROUP BY d.day ORDER BY d.day
    `, [req.params.id]),
    // Every sale line with its date, newest first.
    db.query(`
      SELECT o.id AS order_id, o.order_number, o.created_at, o.status, o.payment_method,
             u.name AS customer_name, oi.variant_info, oi.quantity, oi.unit_price,
             (${LINE_REVENUE})::numeric AS revenue,
             (${LINE_COST})::numeric AS cost
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN users u ON u.id = o.user_id
      WHERE oi.product_id = $1 AND ${SOLD_ORDER}
      ORDER BY o.created_at DESC
      LIMIT 200
    `, [req.params.id]),
    db.query(`
      SELECT v.id, v.size, v.color, v.sku, v.stock,
             COALESCE(SUM(oi.quantity) FILTER (WHERE o.id IS NOT NULL), 0)::int AS units_sold
      FROM product_variants v
      LEFT JOIN order_items oi ON oi.variant_id = v.id
      LEFT JOIN orders o ON o.id = oi.order_id AND ${SOLD_ORDER}
      WHERE v.product_id = $1
      GROUP BY v.id ORDER BY v.size NULLS LAST, v.color NULLS LAST
    `, [req.params.id]),
  ]);

  ok(res, {
    product,
    daily_sales: daily.rows.map((r) => ({ date: r.date, units: r.units, revenue: Number(r.revenue) })),
    sales: sales.rows.map((r) => {
      const revenue = Number(r.revenue);
      const cost = r.cost === null ? null : Number(r.cost);
      return { ...r, unit_price: Number(r.unit_price), revenue, cost, profit: cost === null ? null : revenue - cost };
    }),
    variants: variants.rows.map((v) => ({ ...v, purchased_qty: (v.stock || 0) + v.units_sold })),
  });
};

module.exports = { getStockCheck, getStockCheckProduct };
