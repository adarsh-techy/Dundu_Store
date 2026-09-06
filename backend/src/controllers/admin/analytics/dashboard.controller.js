const db = require('../../../config/db');
const { ok } = require('../../../utils/response');

const getDashboard = async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const [
    sales, orders, users, recentOrders, revenue,
    todaySales, todayOrders, pendingOrders, lowStock, topProducts,
    categorySales,
    topCategories, topSubCategories, topTypes, topPatterns,
    totalReturns, todayReturns, todayLogins, cartUsers, returnUsers,
    orderStatusBreakdown,
  ] = await Promise.all([
    db.query(`SELECT COALESCE(SUM(total),0) AS total_sales FROM orders WHERE payment_status='paid'`),
    db.query(`SELECT COUNT(*) AS total_orders FROM orders`),
    db.query(`SELECT COUNT(*) AS total_users FROM users WHERE role='user'`),
    db.query(
      `SELECT o.id, o.order_number, o.total, o.status, o.created_at,
              COALESCE(u.name, 'Guest') AS user_name, u.phone AS user_phone
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.created_at::date = $1::date
       ORDER BY o.created_at DESC LIMIT 10`, [date]
    ),
    db.query(
      `SELECT DATE_TRUNC('day', created_at) AS date, SUM(total) AS revenue
       FROM orders WHERE payment_status='paid' AND created_at > now() - interval '30 days'
       GROUP BY 1 ORDER BY 1`
    ),
    db.query(
      `SELECT COALESCE(SUM(total),0) AS today_sales
       FROM orders WHERE payment_status='paid' AND created_at::date = $1::date`, [date]
    ),
    db.query(`SELECT COUNT(*) AS today_orders FROM orders WHERE created_at::date = $1::date`, [date]),
    db.query(`SELECT COUNT(*) AS pending_orders FROM orders WHERE status='pending'`),
    db.query(`SELECT COUNT(*) AS low_stock FROM products WHERE stock < 10 AND is_hidden=false`),
    db.query(
      `SELECT p.name, p.stock,
              (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS image,
              SUM(oi.quantity) AS units_sold,
              cat.name AS category
       FROM products p
       LEFT JOIN categories cat ON cat.id = p.category_id
       JOIN order_items oi ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE p.is_hidden = false
       GROUP BY p.id, cat.name
       ORDER BY units_sold DESC LIMIT 5`
    ),
    db.query(
      `SELECT c.name AS category,
              COALESCE(SUM(o.total) FILTER (WHERE o.payment_status = 'paid'),0)::numeric AS revenue,
              COUNT(DISTINCT o.id) FILTER (WHERE o.payment_status = 'paid')::int AS orders,
              COALESCE(SUM(oi.quantity) FILTER (WHERE o.payment_status = 'paid'),0)::int AS units_sold
       FROM categories c
       LEFT JOIN products p   ON p.category_id = c.id
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o    ON oi.order_id = o.id
       GROUP BY c.id, c.name
       ORDER BY revenue DESC`
    ),
    db.query(
      `SELECT c.name, SUM(oi.quantity)::int AS units_sold
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       GROUP BY c.id, c.name ORDER BY units_sold DESC LIMIT 5`
    ),
    db.query(
      `SELECT p.sub_category AS name, SUM(oi.quantity)::int AS units_sold
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       WHERE p.sub_category IS NOT NULL AND p.sub_category <> ''
       GROUP BY p.sub_category ORDER BY units_sold DESC LIMIT 5`
    ),
    db.query(
      `SELECT p.type AS name, SUM(oi.quantity)::int AS units_sold
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       WHERE p.type IS NOT NULL AND p.type <> ''
       GROUP BY p.type ORDER BY units_sold DESC LIMIT 5`
    ),
    db.query(
      `SELECT p.pattern AS name, SUM(oi.quantity)::int AS units_sold
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       WHERE p.pattern IS NOT NULL AND p.pattern <> ''
       GROUP BY p.pattern ORDER BY units_sold DESC LIMIT 5`
    ),
    db.query(`SELECT COUNT(*) AS v FROM return_requests rr JOIN orders o ON rr.order_id=o.id`),
    db.query(`SELECT COUNT(*) AS v FROM return_requests rr JOIN orders o ON rr.order_id=o.id WHERE rr.created_at::date=$1::date`, [date]),
    db.query(`SELECT COUNT(*) AS v FROM users WHERE role='user' AND last_login_at::date=$1::date`, [date]),
    db.query(`SELECT COUNT(DISTINCT user_id) AS v FROM cart`),
    db.query(`SELECT COUNT(DISTINCT o.user_id) AS v FROM return_requests rr JOIN orders o ON rr.order_id=o.id WHERE o.user_id IS NOT NULL`),
    db.query(
      `SELECT status, COUNT(*) AS count
       FROM orders
       GROUP BY status ORDER BY count DESC`
    ),
  ]);

  ok(res, {
    total_sales:    sales.rows[0].total_sales,
    total_orders:   orders.rows[0].total_orders,
    total_users:    users.rows[0].total_users,
    today_sales:    todaySales.rows[0].today_sales,
    today_orders:   parseInt(todayOrders.rows[0].today_orders),
    pending_orders: parseInt(pendingOrders.rows[0].pending_orders),
    low_stock:      parseInt(lowStock.rows[0].low_stock),
    recent_orders:  recentOrders.rows,
    revenue_chart:  revenue.rows,
    top_products:   topProducts.rows,
    category_sales:     categorySales.rows,
    top_categories:     topCategories.rows,
    top_sub_categories: topSubCategories.rows,
    top_types:          topTypes.rows,
    top_patterns:       topPatterns.rows,
    total_returns:          parseInt(totalReturns.rows[0].v),
    today_returns:          parseInt(todayReturns.rows[0].v),
    today_logins:           parseInt(todayLogins.rows[0].v),
    cart_users:             parseInt(cartUsers.rows[0].v),
    return_users:           parseInt(returnUsers.rows[0].v),
    order_status_breakdown: orderStatusBreakdown.rows,
  });
};

module.exports = { getDashboard };
