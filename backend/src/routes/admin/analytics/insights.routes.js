const router = require('express').Router();
const ah = require('../../../utils/asyncHandler');
const db = require('../../../config/db');
const { ok } = require('../../../utils/response');

router.get('/products', ah(async (_req, res) => {
  const imageSubquery = `(SELECT url FROM product_images WHERE product_id=p.id AND is_primary=true LIMIT 1)`;

  const [cartedRes, wishlistedRes, searchedRes, cartSizesRes, cartColorsRes, orderedRes,
         orderCategoriesRes, orderSubCategoriesRes, orderTypesRes] = await Promise.all([
    db.query(`
      SELECT p.id AS product_id, p.name, p.price, p.offer_price,
             ${imageSubquery} AS image,
             COUNT(c.id)::int AS cart_count,
             (SELECT pv2.size FROM cart c2
              JOIN product_variants pv2 ON c2.variant_id = pv2.id
              WHERE c2.product_id = p.id AND pv2.size IS NOT NULL AND pv2.size <> ''
              GROUP BY pv2.size ORDER BY COUNT(*) DESC LIMIT 1) AS top_size,
             (SELECT pv2.color FROM cart c2
              JOIN product_variants pv2 ON c2.variant_id = pv2.id
              WHERE c2.product_id = p.id AND pv2.color IS NOT NULL AND pv2.color <> ''
              GROUP BY pv2.color ORDER BY COUNT(*) DESC LIMIT 1) AS top_color,
             (SELECT json_agg(u2.name ORDER BY c2.updated_at DESC)
              FROM (SELECT DISTINCT ON (c2.user_id) c2.user_id, c2.updated_at
                    FROM cart c2 WHERE c2.product_id = p.id
                    ORDER BY c2.user_id, c2.updated_at DESC) c2
              JOIN users u2 ON c2.user_id = u2.id
              LIMIT 5) AS user_names
      FROM cart c
      JOIN products p ON c.product_id = p.id
      GROUP BY p.id, p.name, p.price, p.offer_price
      ORDER BY cart_count DESC
      LIMIT 10
    `),

    db.query(`
      SELECT p.id AS product_id, p.name, p.price, p.offer_price,
             ${imageSubquery} AS image,
             COUNT(w.id)::int AS wishlist_count,
             (SELECT json_agg(u2.name ORDER BY w2.created_at DESC)
              FROM wishlists w2
              JOIN users u2 ON w2.user_id = u2.id
              WHERE w2.product_id = p.id
              LIMIT 5) AS user_names
      FROM wishlists w
      JOIN products p ON w.product_id = p.id
      GROUP BY p.id, p.name, p.price, p.offer_price
      ORDER BY wishlist_count DESC
      LIMIT 10
    `),

    db.query(`
      SELECT term, COUNT(*)::int AS count
      FROM search_logs
      GROUP BY term
      ORDER BY count DESC
      LIMIT 15
    `),

    db.query(`
      SELECT pv.size, COALESCE(SUM(oi.quantity), 0)::int AS count,
             MIN(COALESCE(p.offer_price, p.price))::numeric AS min_price,
             MAX(COALESCE(p.offer_price, p.price))::numeric AS max_price
      FROM order_items oi
      JOIN product_variants pv ON oi.variant_id = pv.id
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled')
      WHERE pv.size IS NOT NULL AND pv.size <> ''
      GROUP BY pv.size
      ORDER BY count DESC
      LIMIT 10
    `),

    db.query(`
      SELECT pv.color, COALESCE(SUM(oi.quantity), 0)::int AS count,
             MIN(COALESCE(p.offer_price, p.price))::numeric AS min_price,
             MAX(COALESCE(p.offer_price, p.price))::numeric AS max_price
      FROM order_items oi
      JOIN product_variants pv ON oi.variant_id = pv.id
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled')
      WHERE pv.color IS NOT NULL AND pv.color <> ''
      GROUP BY pv.color
      ORDER BY count DESC
      LIMIT 10
    `),

    db.query(`
      SELECT p.id AS product_id, p.name, p.price, p.offer_price,
             ${imageSubquery} AS image,
             cat.name AS category,
             COALESCE(SUM(oi.quantity), 0)::int AS order_count
      FROM products p
      LEFT JOIN categories cat ON cat.id = p.category_id
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled')
      GROUP BY p.id, p.name, p.price, p.offer_price, cat.name
      HAVING COALESCE(SUM(oi.quantity), 0) > 0
      ORDER BY order_count DESC
      LIMIT 10
    `),

    db.query(`
      SELECT cat.name AS label, COALESCE(SUM(oi.quantity), 0)::int AS count,
             MIN(COALESCE(p.offer_price, p.price))::numeric AS min_price,
             MAX(COALESCE(p.offer_price, p.price))::numeric AS max_price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories cat ON cat.id = p.category_id
      JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled')
      GROUP BY cat.name
      ORDER BY count DESC
      LIMIT 8
    `),

    db.query(`
      SELECT p.sub_category AS label, COALESCE(SUM(oi.quantity), 0)::int AS count,
             MIN(COALESCE(p.offer_price, p.price))::numeric AS min_price,
             MAX(COALESCE(p.offer_price, p.price))::numeric AS max_price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled')
      WHERE p.sub_category IS NOT NULL AND p.sub_category <> ''
      GROUP BY p.sub_category
      ORDER BY count DESC
      LIMIT 8
    `),

    db.query(`
      SELECT p.type AS label, COALESCE(SUM(oi.quantity), 0)::int AS count,
             MIN(COALESCE(p.offer_price, p.price))::numeric AS min_price,
             MAX(COALESCE(p.offer_price, p.price))::numeric AS max_price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled')
      WHERE p.type IS NOT NULL AND p.type <> ''
      GROUP BY p.type
      ORDER BY count DESC
      LIMIT 8
    `),
  ]);

  ok(res, {
    top_carted:            cartedRes.rows,
    top_wishlisted:        wishlistedRes.rows,
    top_searched:          searchedRes.rows,
    order_by_size:         cartSizesRes.rows,
    order_by_color:        cartColorsRes.rows,
    top_ordered:           orderedRes.rows,
    order_by_category:     orderCategoriesRes.rows,
    order_by_sub_category: orderSubCategoriesRes.rows,
    order_by_type:         orderTypesRes.rows,
  });
}));

router.get('/users', ah(async (_req, res) => {
  const [
    statsRes,
    topByOrdersRes,
    topBySpendRes,
    cartHoardersRes,
    wishlistHoardersRes,
    returnersRes,
    activityTiersRes,
    recentUsersRes,
  ] = await Promise.all([
    db.query(`
      SELECT
        COUNT(*)::int                                                                              AS total_users,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::int             AS new_this_month,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::int              AS new_this_week,
        COUNT(*) FILTER (WHERE date_of_birth IS NOT NULL)::int                                    AS with_birthday,
        COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone <> '')::int                            AS with_phone
      FROM users WHERE role = 'user'
    `),
    db.query(`
      SELECT u.id, u.name, u.email, u.phone,
             COUNT(o.id)::int                                 AS order_count,
             COALESCE(SUM(o.final_amount), 0)::numeric::int  AS total_spend,
             MAX(o.created_at)                                AS last_order_at
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id AND o.status NOT IN ('cancelled')
      WHERE u.role = 'user'
      GROUP BY u.id
      HAVING COUNT(o.id) > 0
      ORDER BY order_count DESC, total_spend DESC
      LIMIT 10
    `),
    db.query(`
      SELECT u.id, u.name, u.email, u.phone,
             COUNT(o.id)::int                                 AS order_count,
             COALESCE(SUM(o.final_amount), 0)::numeric::int  AS total_spend,
             MAX(o.created_at)                                AS last_order_at
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id AND o.status NOT IN ('cancelled')
      WHERE u.role = 'user'
      GROUP BY u.id
      HAVING COALESCE(SUM(o.final_amount), 0) > 0
      ORDER BY total_spend DESC
      LIMIT 10
    `),
    db.query(`
      SELECT u.id, u.name, u.phone,
             COUNT(c.id)::int                                                                      AS cart_items,
             COALESCE(SUM(c.quantity * COALESCE(p.offer_price, p.price)), 0)::numeric::int         AS cart_value
      FROM users u
      JOIN cart c ON c.user_id = u.id
      JOIN products p ON c.product_id = p.id
      WHERE u.role = 'user'
      GROUP BY u.id, u.name, u.phone
      ORDER BY cart_value DESC
      LIMIT 10
    `),
    db.query(`
      SELECT u.id, u.name, u.phone,
             COUNT(w.id)::int AS wishlist_items
      FROM users u
      JOIN wishlists w ON w.user_id = u.id
      WHERE u.role = 'user'
      GROUP BY u.id, u.name, u.phone
      ORDER BY wishlist_items DESC
      LIMIT 10
    `),
    db.query(`
      SELECT u.id, u.name, u.phone,
             COUNT(o.id)::int AS return_count
      FROM users u
      JOIN orders o ON o.user_id = u.id
      WHERE u.role = 'user'
        AND o.status IN ('return_requested','return_approved','returned')
      GROUP BY u.id, u.name, u.phone
      ORDER BY return_count DESC
      LIMIT 10
    `),
    db.query(`
      SELECT
        COUNT(*) FILTER (WHERE order_count = 0)::int             AS inactive,
        COUNT(*) FILTER (WHERE order_count BETWEEN 1 AND 2)::int AS low,
        COUNT(*) FILTER (WHERE order_count BETWEEN 3 AND 5)::int AS medium,
        COUNT(*) FILTER (WHERE order_count > 5)::int             AS high
      FROM (
        SELECT u.id, COUNT(o.id) AS order_count
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id AND o.status NOT IN ('cancelled')
        WHERE u.role = 'user'
        GROUP BY u.id
      ) t
    `),
    db.query(`
      SELECT u.id, u.name, u.email, u.phone, u.created_at,
             COUNT(o.id)::int AS order_count
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id AND o.status NOT IN ('cancelled')
      WHERE u.role = 'user'
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT 10
    `),
  ]);

  ok(res, {
    stats:             statsRes.rows[0],
    top_by_orders:     topByOrdersRes.rows,
    top_by_spend:      topBySpendRes.rows,
    cart_hoarders:     cartHoardersRes.rows,
    wishlist_hoarders: wishlistHoardersRes.rows,
    returners:         returnersRes.rows,
    activity_tiers:    activityTiersRes.rows[0],
    recent_users:      recentUsersRes.rows,
  });
}));

router.get('/user-activity', ah(async (req, res) => {
  const { search, date, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const buildUserWhere = (params) => {
    const conditions = ["u.role='user'"];
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.phone ILIKE $${params.length})`);
    }
    return `WHERE ${conditions.join(' AND ')}`;
  };

  const mainParams = [];
  let loginStatsWhere = '';
  if (date) {
    mainParams.push(date);
    loginStatsWhere = `WHERE created_at::date = $${mainParams.length}::date`;
  }
  const mainWhere = buildUserWhere(mainParams);
  mainParams.push(limit, offset);

  const countParams = [];
  const countWhere = buildUserWhere(countParams);

  const [{ rows }, countRes] = await Promise.all([
    db.query(
      `WITH login_stats AS (
         SELECT user_id, COUNT(*)::int AS login_count, MAX(created_at) AS last_login_at,
                MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM created_at)) AS most_active_hour
         FROM login_logs
         ${loginStatsWhere}
         GROUP BY user_id
       ), view_stats AS (
         SELECT user_id, COUNT(*)::int AS views_count FROM product_views GROUP BY user_id
       )
       SELECT u.id, u.name, u.email, u.phone,
              COALESCE(ls.login_count,0) AS login_count, ls.last_login_at, ls.most_active_hour,
              COALESCE(vs.views_count,0) AS views_count
       FROM users u
       LEFT JOIN login_stats ls ON ls.user_id=u.id
       LEFT JOIN view_stats vs ON vs.user_id=u.id
       ${mainWhere}
       ORDER BY login_count DESC NULLS LAST, u.created_at DESC
       LIMIT $${mainParams.length - 1} OFFSET $${mainParams.length}`,
      mainParams
    ),
    db.query(`SELECT COUNT(*)::int FROM users u ${countWhere}`, countParams),
  ]);

  ok(res, { users: rows, total: countRes.rows[0].count });
}));

module.exports = router;
