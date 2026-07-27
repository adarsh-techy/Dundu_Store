const db = require('../../config/db');
const { ok } = require('../../utils/response');

const dailyReport = async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const [summary, topProducts, hourly, byPayment] = await Promise.all([
    db.query(
      `SELECT COUNT(*) AS order_count,
         COALESCE(SUM(total),0) AS revenue,
         COALESCE(SUM(CASE WHEN payment_method='cash' THEN total ELSE 0 END),0) AS cash_revenue,
         COALESCE(SUM(CASE WHEN payment_method='upi' THEN total ELSE 0 END),0) AS upi_revenue,
         COALESCE(SUM(CASE WHEN payment_method='card' THEN total ELSE 0 END),0) AS card_revenue,
         COALESCE(SUM(CASE WHEN payment_method='online' THEN total ELSE 0 END),0) AS online_revenue
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

module.exports = { dailyReport };
