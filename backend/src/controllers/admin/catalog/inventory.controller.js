const db = require('../../../config/db');
const { ok } = require('../../../utils/response');

const getInventory = async (req, res) => {
  const stockFilter = ['out', 'low', 'healthy', 'restock'].includes(req.query.stock) ? req.query.stock : 'all';
  const productsWhere = stockFilter === 'out' ? 'AND p.stock = 0'
    : stockFilter === 'low' ? 'AND p.stock > 0 AND p.stock < 10'
    : stockFilter === 'restock' ? 'AND p.stock < 10'
    : stockFilter === 'healthy' ? 'AND p.stock >= 10'
    : '';
  const productsLimit = stockFilter === 'all' ? 'LIMIT 100' : '';

  const [total, lowStock, outOfStock, stockValue, categoryBreakdown, products] = await Promise.all([
    db.query(`SELECT COUNT(*) AS v FROM products WHERE is_hidden=false AND deleted_at IS NULL`),
    db.query(`SELECT COUNT(*) AS v FROM products WHERE stock < 10 AND stock > 0 AND is_hidden=false`),
    db.query(`SELECT COUNT(*) AS v FROM products WHERE stock = 0 AND is_hidden=false`),
    db.query(`SELECT COALESCE(SUM(stock * COALESCE(offer_price, price)), 0) AS v FROM products WHERE is_hidden=false AND deleted_at IS NULL`),
    db.query(`
      SELECT c.name AS category, COUNT(p.id)::int AS product_count, COALESCE(SUM(p.stock),0)::int AS total_stock
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_hidden = false AND p.deleted_at IS NULL
      GROUP BY c.id, c.name
      ORDER BY total_stock DESC
    `),
    db.query(`
      SELECT p.id, p.name, p.sku, p.stock, p.price, p.offer_price,
             c.name AS category,
             (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1) AS image
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_hidden = false AND p.deleted_at IS NULL ${productsWhere}
      ORDER BY p.stock ASC
      ${productsLimit}
    `),
  ]);
  ok(res, {
    total_products:     parseInt(total.rows[0].v),
    low_stock:          parseInt(lowStock.rows[0].v),
    out_of_stock:       parseInt(outOfStock.rows[0].v),
    stock_value:        stockValue.rows[0].v,
    category_breakdown: categoryBreakdown.rows,
    products:           products.rows,
  });
};

module.exports = { getInventory };
