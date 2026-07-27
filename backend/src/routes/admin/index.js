const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { requireRole, requirePermission } = require('../../middleware/role');
const db = require('../../config/db');

// ── Runtime safety migrations (idempotent — safe to run on every boot) ─────
db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE").catch(() => {});
db.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100)").catch(() => {});
db.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_tracking_number VARCHAR(200)").catch(() => {});
db.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_phone VARCHAR(20)").catch(() => {});
db.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS show_popup BOOLEAN NOT NULL DEFAULT false").catch(() => {});
db.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scheduled_time VARCHAR(5)").catch(() => {});
db.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100)").catch(() => {});
db.query("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_name VARCHAR(100)").catch(() => {});
db.query("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_admin_created BOOLEAN NOT NULL DEFAULT false").catch(() => {});
db.query("ALTER TABLE reviews ALTER COLUMN user_id DROP NOT NULL").catch(() => {});
db.query("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS image_url VARCHAR(300)").catch(() => {});
db.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS pattern VARCHAR(100)").catch(() => {});
db.query("ALTER TABLE categories ADD COLUMN IF NOT EXISTS size_chart_image VARCHAR(300)").catch(() => {});
db.query("ALTER TABLE categories ADD COLUMN IF NOT EXISTS size_chart_data JSONB").catch(() => {});
db.query("ALTER TABLE categories ADD COLUMN IF NOT EXISTS sub_categories JSONB DEFAULT '[]'").catch(() => {});
db.query("ALTER TABLE categories ADD COLUMN IF NOT EXISTS types JSONB DEFAULT '[]'").catch(() => {});
db.query("ALTER TABLE categories ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]'").catch(() => {});
db.query("ALTER TABLE categories ADD COLUMN IF NOT EXISTS patterns JSONB DEFAULT '[]'").catch(() => {});
db.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS default_rating NUMERIC(3,1) DEFAULT 4.5").catch(() => {});
db.query("UPDATE products SET default_rating=4.5 WHERE default_rating IS NULL").catch(() => {});
db.query("ALTER TABLE banners ADD COLUMN IF NOT EXISTS badge_text VARCHAR(100)").catch(() => {});
db.query("ALTER TABLE banners ADD COLUMN IF NOT EXISTS badge_active BOOLEAN NOT NULL DEFAULT false").catch(() => {});
db.query("ALTER TABLE banners ADD COLUMN IF NOT EXISTS badge_color VARCHAR(20) DEFAULT '#e91e8c'").catch(() => {});
db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ").catch(() => {});
db.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'delivery_staff'").catch(() => {});
db.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_qr_token VARCHAR(64) UNIQUE").catch(() => {});
db.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_by UUID REFERENCES users(id) ON DELETE SET NULL").catch(() => {});
db.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ").catch(() => {});
db.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_by UUID REFERENCES users(id) ON DELETE SET NULL").catch(() => {});
db.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_completed_at TIMESTAMPTZ").catch(() => {});
db.query(`CREATE TABLE IF NOT EXISTS splash_config (
  id          SERIAL PRIMARY KEY,
  app_name    VARCHAR(100)  NOT NULL DEFAULT 'Dundu',
  tagline     VARCHAR(200)  NOT NULL DEFAULT '',
  bg_color    VARCHAR(20)   NOT NULL DEFAULT '#0F0F0F',
  text_color  VARCHAR(20)   NOT NULL DEFAULT '#FFFFFF',
  duration_ms INT           NOT NULL DEFAULT 2500,
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  bg_image    VARCHAR(300),
  updated_at  TIMESTAMPTZ            DEFAULT now()
)`).catch(() => {});
db.query("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'return_requested'").catch(() => {});
db.query(`CREATE TABLE IF NOT EXISTS product_materials (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) UNIQUE NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
)`).catch(() => {});
db.query(`INSERT INTO product_materials (name, sort_order) VALUES
  ('Cotton',1),('Pure Cotton',2),('Organic Cotton',3),
  ('Rayon',4),('Viscose',5),('Modal',6),
  ('Polyester',7),('Nylon',8),('Spandex / Lycra',9),
  ('Silk',10),('Satin',11),('Chiffon',12),('Georgette',13),('Crepe',14),
  ('Linen',15),('Khadi',16),('Denim',17),
  ('Wool',18),('Fleece',19),('Velvet',20),
  ('Net / Mesh',21),('Lace',22),('Jacquard',23),('Brocade',24),
  ('Blended',25),('Cotton-Polyester Blend',26)
  ON CONFLICT (name) DO NOTHING`).catch(() => {});

// All admin routes require a valid JWT + admin/super_admin role
router.use(authenticate, requireRole(['admin', 'super_admin']));

// ── Route registrations (each file owns one domain) ───────────────────────
router.get('/dashboard',        require('../../controllers/admin/dashboard.controller').getDashboard);
router.get('/inventory',        require('../../controllers/admin/inventory.controller').getInventory);

router.use('/products',          require('./products'));
router.use('/categories',        require('./categories'));
router.use('/product-materials', require('./product-materials'));
router.use('/brands',            require('./brands'));
router.use('/banners',           require('./banners'));
router.use('/orders',            requirePermission('orders'),  require('./orders'));
router.use('/returns',           requirePermission('returns'), require('./returns'));
router.use('/wishlists',         require('./wishlists'));
router.use('/carts',             require('./carts'));
router.use('/coupons',           require('./coupons'));
router.use('/reports',           requirePermission('reports'), require('./reports'));
router.use('/loyalty',           requirePermission('loyalty'), require('./loyalty'));
router.use('/reviews',           require('./reviews'));
router.use('/announcements',     require('./announcements'));
router.use('/settings',          require('./settings'));
router.use('/insights',          require('./insights'));
router.use('/birthdays',         require('./birthdays'));
router.use('/whatsapp',          require('./whatsapp'));
router.use('/referral',          require('./referral'));
router.use('/users',             require('./users'));
router.use('/admins',            require('./admins'));
router.use('/delivery-staff',    require('./delivery-staff'));
router.use('/splash',            require('./splash'));

module.exports = router;
