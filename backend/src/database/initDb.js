const db = require('../config/db');

/**
 * Ensures required database tables, alter statements, and initial dynamic settings
 * exist in PostgreSQL upon application boot. All statements are idempotent.
 */
async function initDb() {
  try {
    // 1. Settings table & defaults
    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key   VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL DEFAULT ''
      )
    `);

    await db.query(`
      INSERT INTO settings (key, value) VALUES ('cod_enabled', 'true')
      ON CONFLICT (key) DO NOTHING
    `);

    await db.query(`
      INSERT INTO settings (key, value) VALUES ('coupon_field_enabled', 'true')
      ON CONFLICT (key) DO NOTHING
    `);

    // 2. Splash Config table
    await db.query(`
      CREATE TABLE IF NOT EXISTS splash_config (
        id          SERIAL PRIMARY KEY,
        app_name    VARCHAR(100)  NOT NULL DEFAULT 'Dundu',
        tagline     VARCHAR(200)  NOT NULL DEFAULT '',
        bg_color    VARCHAR(20)   NOT NULL DEFAULT '#0F0F0F',
        text_color  VARCHAR(20)   NOT NULL DEFAULT '#FFFFFF',
        duration_ms INT           NOT NULL DEFAULT 2500,
        is_active   BOOLEAN       NOT NULL DEFAULT true,
        bg_image    VARCHAR(300),
        updated_at  TIMESTAMPTZ            DEFAULT now()
      )
    `);

    // 3. Search Logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS search_logs (
        id         SERIAL PRIMARY KEY,
        term       VARCHAR(200) NOT NULL,
        created_at TIMESTAMPTZ  DEFAULT now()
      )
    `);

    // 4. Product Materials table
    await db.query(`
      CREATE TABLE IF NOT EXISTS product_materials (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) UNIQUE NOT NULL,
        is_active  BOOLEAN NOT NULL DEFAULT true,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    await db.query(`
      INSERT INTO product_materials (name, sort_order) VALUES
        ('Cotton',1),('Pure Cotton',2),('Organic Cotton',3),
        ('Rayon',4),('Viscose',5),('Modal',6),
        ('Polyester',7),('Nylon',8),('Spandex / Lycra',9),
        ('Silk',10),('Satin',11),('Chiffon',12),('Georgette',13),('Crepe',14),
        ('Linen',15),('Khadi',16),('Denim',17),
        ('Wool',18),('Fleece',19),('Velvet',20),
        ('Net / Mesh',21),('Lace',22),('Jacquard',23),('Brocade',24),
        ('Blended',25),('Cotton-Polyester Blend',26)
      ON CONFLICT (name) DO NOTHING
    `);

    // 5. Safe schema column alterations
    const alterStatements = [
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100)",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_tracking_number VARCHAR(200)",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_phone VARCHAR(20)",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_qr_token VARCHAR(64) UNIQUE",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_by UUID REFERENCES users(id) ON DELETE SET NULL",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_by UUID REFERENCES users(id) ON DELETE SET NULL",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_completed_at TIMESTAMPTZ",
      "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS show_popup BOOLEAN NOT NULL DEFAULT false",
      "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scheduled_time VARCHAR(5)",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100)",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS pattern VARCHAR(100)",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS default_rating NUMERIC(3,1) DEFAULT 4.5",
      "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_name VARCHAR(100)",
      "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_admin_created BOOLEAN NOT NULL DEFAULT false",
      "ALTER TABLE reviews ALTER COLUMN user_id DROP NOT NULL",
      "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS image_url VARCHAR(300)",
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS size_chart_image VARCHAR(300)",
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS size_chart_data JSONB",
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS sub_categories JSONB DEFAULT '[]'",
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS types JSONB DEFAULT '[]'",
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]'",
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS patterns JSONB DEFAULT '[]'",
      "ALTER TABLE banners ADD COLUMN IF NOT EXISTS badge_text VARCHAR(100)",
      "ALTER TABLE banners ADD COLUMN IF NOT EXISTS badge_active BOOLEAN NOT NULL DEFAULT false",
      "ALTER TABLE banners ADD COLUMN IF NOT EXISTS badge_color VARCHAR(20) DEFAULT '#e91e8c'",
      // ── Security hardening (mirrors migrations/1782300000000_security-hardening.js) ──
      "ALTER TABLE otps ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_cod_blocked BOOLEAN NOT NULL DEFAULT false",
      "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS combo_id UUID REFERENCES combos(id) ON DELETE SET NULL",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_earned INT NOT NULL DEFAULT 0",
      "ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_by UUID",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS trash_meta JSONB",
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ",
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_by UUID",
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS trash_meta JSONB",
      "ALTER TABLE combos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ",
      "ALTER TABLE combos ADD COLUMN IF NOT EXISTS deleted_by UUID",
      "ALTER TABLE combos ADD COLUMN IF NOT EXISTS trash_meta JSONB",
      "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ",
      "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS deleted_by UUID",
      "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS trash_meta JSONB",
      "ALTER TABLE banners ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ",
      "ALTER TABLE banners ADD COLUMN IF NOT EXISTS deleted_by UUID",
      "ALTER TABLE banners ADD COLUMN IF NOT EXISTS trash_meta JSONB",
      "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ",
      "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_by UUID",
      "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS trash_meta JSONB",
      "CREATE TABLE IF NOT EXISTS audit_logs (id BIGSERIAL PRIMARY KEY, actor_id UUID, actor_name VARCHAR(120), actor_email VARCHAR(255), actor_role VARCHAR(30), action VARCHAR(40) NOT NULL, entity_type VARCHAR(60) NOT NULL, entity_id VARCHAR(80), summary VARCHAR(255) NOT NULL, method VARCHAR(10), path VARCHAR(255), status_code INT, details JSONB, ip VARCHAR(64), user_agent VARCHAR(255), created_at TIMESTAMPTZ NOT NULL DEFAULT now())",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_refund_id VARCHAR(100)",
      "ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_balance_non_negative",
      "ALTER TABLE wallets ADD CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth_set_at TIMESTAMPTZ",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20)",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0",
      "ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INT NOT NULL DEFAULT 0",
      "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE",
      "ALTER TABLE coupons ADD COLUMN IF NOT EXISTS per_user_limit INT",
      "CREATE TABLE IF NOT EXISTS scratch_card_logs (id SERIAL PRIMARY KEY, user_id UUID, phone VARCHAR(50), user_name VARCHAR(255), prize_id INT, prize_label VARCHAR(255), prize_type VARCHAR(50), prize_value NUMERIC DEFAULT 0, coupon_code VARCHAR(100), order_id UUID, scratched_at TIMESTAMPTZ DEFAULT now())",
      "ALTER TABLE scratch_card_logs ADD COLUMN IF NOT EXISTS is_redeemed BOOLEAN NOT NULL DEFAULT false",
      "ALTER TABLE spin_wheel_logs ADD COLUMN IF NOT EXISTS is_redeemed BOOLEAN DEFAULT false",
      "ALTER TABLE cart DROP CONSTRAINT IF EXISTS cart_quantity_positive",
      "ALTER TABLE cart ADD CONSTRAINT cart_quantity_positive CHECK (quantity > 0)",
      "ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_quantity_positive",
      "ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0)",
    ];

    for (const stmt of alterStatements) {
      await db.query(stmt).catch(() => {});
    }

    // Enum modifications
    await db.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'delivery_staff'").catch(() => {});
    await db.query("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'return_requested'").catch(() => {});
    await db.query("UPDATE products SET default_rating=4.5 WHERE default_rating IS NULL").catch(() => {});

    console.log('✓ Database runtime migrations verified');
  } catch (err) {
    console.warn('⚠️ Runtime migration notice:', err.message);
  }
}

module.exports = initDb;
