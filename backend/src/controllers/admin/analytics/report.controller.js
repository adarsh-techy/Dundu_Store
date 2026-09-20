const db = require('../../../config/db');
const { ok, badRequest, notFound } = require('../../../utils/response');

let isDbSchemaMigrated = false;
async function ensureFinanceColumns() {
  if (isDbSchemaMigrated) return;
  try {
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT NULL;`);
    await db.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT NULL;`);
    isDbSchemaMigrated = true;
  } catch (_) {}
}

const dailyReport = async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const [summary, topProducts, hourly, byPayment] = await Promise.all([
    db.query(
      `SELECT COUNT(*) AS order_count, COALESCE(SUM(total),0) AS revenue
       FROM orders o WHERE DATE(o.created_at)=$1 AND o.status!='cancelled'`,
      [date]
    ),
    db.query(
      `SELECT oi.product_name, SUM(oi.quantity) AS qty_sold, SUM(oi.quantity*oi.unit_price) AS revenue
       FROM order_items oi JOIN orders o ON oi.order_id=o.id
       WHERE DATE(o.created_at)=$1 AND o.status!='cancelled'
       GROUP BY oi.product_name ORDER BY revenue DESC LIMIT 10`,
      [date]
    ),
    db.query(
      `SELECT EXTRACT(HOUR FROM o.created_at) AS hour, COUNT(*) AS orders, COALESCE(SUM(o.total),0) AS revenue
       FROM orders o WHERE DATE(o.created_at)=$1 AND o.status!='cancelled'
       GROUP BY hour ORDER BY hour`,
      [date]
    ),
    db.query(
      `SELECT payment_method, COUNT(*) AS count, COALESCE(SUM(total),0) AS amount
       FROM orders o WHERE DATE(o.created_at)=$1 AND o.status!='cancelled'
       GROUP BY payment_method`,
      [date]
    ),
  ]);

  ok(res, {
    date,
    summary: summary.rows[0],
    top_products: topProducts.rows,
    hourly: hourly.rows,
    by_payment: byPayment.rows,
  });
};

/* ── Financial Analytics & Profit/Loss Report ───────────────────────────── */
const financeReport = async (req, res) => {
  await ensureFinanceColumns();

  const {
    period = 'all_time', // this_month, last_month, this_year, all_time, custom
    start_date,
    end_date,
    search = '',
  } = req.query;

  const conditions = ["o.status != 'cancelled'"];
  const params = [];

  if (period === 'this_month') {
    conditions.push("o.created_at >= DATE_TRUNC('month', CURRENT_DATE)");
  } else if (period === 'last_month') {
    conditions.push("o.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')");
    conditions.push("o.created_at < DATE_TRUNC('month', CURRENT_DATE)");
  } else if (period === 'this_year') {
    conditions.push("o.created_at >= DATE_TRUNC('year', CURRENT_DATE)");
  } else if (period === 'custom' && start_date && end_date) {
    params.push(start_date);
    conditions.push(`o.created_at::date >= $${params.length}::date`);
    params.push(end_date);
    conditions.push(`o.created_at::date <= $${params.length}::date`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // 1. Overall Summary Metrics
  const summaryQuery = `
    SELECT
      COUNT(DISTINCT o.id)::int AS total_orders,
      COALESCE(SUM(oi.quantity), 0)::int AS total_units_sold,
      COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric AS total_revenue,
      COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, oi.unit_price * 0.6)), 0)::numeric AS total_cost,
      COALESCE(SUM(oi.quantity * (oi.unit_price - COALESCE(p.cost_price, oi.unit_price * 0.6))), 0)::numeric AS gross_profit,
      CASE
        WHEN COALESCE(SUM(oi.quantity * oi.unit_price), 0) > 0
        THEN ROUND(
          (SUM(oi.quantity * (oi.unit_price - COALESCE(p.cost_price, oi.unit_price * 0.6))) / SUM(oi.quantity * oi.unit_price) * 100)::numeric,
          2
        )
        ELSE 0
      END AS profit_margin_pct
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    ${whereClause}
  `;

  // 2. Returns & Refund Impact
  const refundQuery = `
    SELECT
      COUNT(rr.id)::int AS return_count,
      COALESCE(SUM(o.total), 0)::numeric AS total_refunded
    FROM return_requests rr
    JOIN orders o ON rr.order_id = o.id
    WHERE rr.status = 'approved'
  `;

  // 3. Monthly Financial Breakdown (Past 12 Months)
  const monthlyQuery = `
    SELECT
      TO_CHAR(o.created_at, 'YYYY-MM') AS month_key,
      TO_CHAR(o.created_at, 'Mon YYYY') AS month_label,
      DATE_TRUNC('month', o.created_at) AS month_start,
      COUNT(DISTINCT o.id)::int AS orders_count,
      COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
      COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric AS revenue,
      COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, oi.unit_price * 0.6)), 0)::numeric AS cost,
      COALESCE(SUM(oi.quantity * (oi.unit_price - COALESCE(p.cost_price, oi.unit_price * 0.6))), 0)::numeric AS profit,
      CASE
        WHEN COALESCE(SUM(oi.quantity * oi.unit_price), 0) > 0
        THEN ROUND(
          (SUM(oi.quantity * (oi.unit_price - COALESCE(p.cost_price, oi.unit_price * 0.6))) / SUM(oi.quantity * oi.unit_price) * 100)::numeric,
          1
        )
        ELSE 0
      END AS margin_pct
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.status != 'cancelled' AND o.created_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY month_key, month_label, month_start
    ORDER BY month_start ASC
  `;

  // 4. Category-Wise Financial Breakdown
  const categoryQuery = `
    SELECT
      COALESCE(c.name, 'Uncategorized') AS category_name,
      COUNT(DISTINCT o.id)::int AS orders_count,
      COALESCE(SUM(oi.quantity), 0)::int AS units_sold,
      COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric AS revenue,
      COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, oi.unit_price * 0.6)), 0)::numeric AS cost,
      COALESCE(SUM(oi.quantity * (oi.unit_price - COALESCE(p.cost_price, oi.unit_price * 0.6))), 0)::numeric AS profit,
      CASE
        WHEN COALESCE(SUM(oi.quantity * oi.unit_price), 0) > 0
        THEN ROUND(
          (SUM(oi.quantity * (oi.unit_price - COALESCE(p.cost_price, oi.unit_price * 0.6))) / SUM(oi.quantity * oi.unit_price) * 100)::numeric,
          1
        )
        ELSE 0
      END AS margin_pct
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereClause}
    GROUP BY c.name
    ORDER BY revenue DESC
  `;

  // 5. Product-Level Financial Profitability
  const prodParams = [...params];
  let searchCondition = '';
  if (search) {
    prodParams.push(`%${search}%`);
    searchCondition = `AND (oi.product_name ILIKE $${prodParams.length} OR p.name ILIKE $${prodParams.length})`;
  }

  const productsQuery = `
    SELECT
      p.id AS product_id,
      oi.product_name,
      COALESCE(c.name, 'General') AS category_name,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) AS image_url,
      COALESCE(p.cost_price, AVG(oi.unit_price) * 0.6)::numeric AS avg_cost_price,
      AVG(oi.unit_price)::numeric AS avg_sale_price,
      SUM(oi.quantity)::int AS units_sold,
      SUM(oi.quantity * oi.unit_price)::numeric AS total_revenue,
      SUM(oi.quantity * COALESCE(p.cost_price, oi.unit_price * 0.6))::numeric AS total_cost,
      SUM(oi.quantity * (oi.unit_price - COALESCE(p.cost_price, oi.unit_price * 0.6)))::numeric AS net_profit,
      CASE
        WHEN SUM(oi.quantity * oi.unit_price) > 0
        THEN ROUND(
          (SUM(oi.quantity * (oi.unit_price - COALESCE(p.cost_price, oi.unit_price * 0.6))) / SUM(oi.quantity * oi.unit_price) * 100)::numeric,
          1
        )
        ELSE 0
      END AS margin_pct
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereClause} ${searchCondition}
    GROUP BY p.id, oi.product_name, c.name
    ORDER BY net_profit DESC
    LIMIT 50
  `;

  const [summaryRes, refundRes, monthlyRes, categoryRes, productsRes] = await Promise.all([
    db.query(summaryQuery, params),
    db.query(refundQuery),
    db.query(monthlyQuery),
    db.query(categoryQuery, params),
    db.query(productsQuery, prodParams),
  ]);

  const summary = summaryRes.rows[0] || {};
  const refunds = refundRes.rows[0] || {};

  const revenue = parseFloat(summary.total_revenue || 0);
  const cost = parseFloat(summary.total_cost || 0);
  const grossProfit = parseFloat(summary.gross_profit || 0);
  const totalRefunded = parseFloat(refunds.total_refunded || 0);
  const netProfit = Math.max(0, grossProfit - totalRefunded);

  ok(res, {
    period,
    summary: {
      total_revenue: revenue,
      total_cost: cost,
      gross_profit: grossProfit,
      net_profit: netProfit,
      profit_margin_pct: parseFloat(summary.profit_margin_pct || 0),
      total_units_sold: summary.total_units_sold || 0,
      total_orders: summary.total_orders || 0,
      avg_order_value: summary.total_orders > 0 ? Math.round(revenue / summary.total_orders) : 0,
      total_refunded: totalRefunded,
      return_count: refunds.return_count || 0,
    },
    monthly_breakdown: monthlyRes.rows,
    category_profitability: categoryRes.rows,
    product_profitability: productsRes.rows,
  });
};

/* ── Quick Update Product Cost / Buying Price ───────────────────────────── */
const updateProductCostPrice = async (req, res) => {
  await ensureFinanceColumns();
  const { id } = req.params;
  const { cost_price } = req.body;

  if (cost_price === undefined || isNaN(parseFloat(cost_price))) {
    return badRequest(res, 'Valid cost price is required');
  }

  const { rows } = await db.query(
    'UPDATE products SET cost_price = $1, updated_at = now() WHERE id = $2 RETURNING id, name, price, cost_price',
    [parseFloat(cost_price), id]
  );

  if (!rows.length) return notFound(res, 'Product not found');

  ok(res, { product: rows[0] }, 'Buy price updated successfully');
};

module.exports = {
  dailyReport,
  financeReport,
  updateProductCostPrice,
};
