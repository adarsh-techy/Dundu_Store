exports.up = (pgm) => {
  pgm.createType('user_role', ['super_admin', 'admin', 'user']);
  pgm.createType('order_status', ['pending', 'packed', 'shipped', 'delivered', 'cancelled', 'returned']);
  pgm.createType('payment_status', ['pending', 'paid', 'failed', 'refunded']);
  pgm.createType('discount_type', ['percentage', 'fixed']);
  pgm.createType('return_status', ['pending', 'approved', 'rejected']);

  pgm.createTable('branches', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', notNull: true },
    address: { type: 'text' },
    phone: { type: 'varchar(20)' },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  });

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', notNull: true },
    email: { type: 'varchar(255)', unique: true },
    phone: { type: 'varchar(20)', unique: true },
    password_hash: { type: 'text' },
    google_id: { type: 'varchar(255)', unique: true },
    role: { type: 'user_role', default: pgm.func("'user'") },
    branch_id: { type: 'uuid', references: 'branches', onDelete: 'SET NULL' },
    is_blocked: { type: 'boolean', default: false },
    avatar_url: { type: 'text' },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', default: pgm.func('now()') },
  });

  pgm.createTable('otps', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    identifier: { type: 'varchar(255)', notNull: true },
    otp: { type: 'varchar(10)', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    is_used: { type: 'boolean', default: false },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  });
  pgm.createIndex('otps', 'identifier');

  pgm.createTable('categories', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', notNull: true },
    slug: { type: 'varchar(100)', notNull: true, unique: true },
    image_url: { type: 'text' },
    is_active: { type: 'boolean', default: true },
    sort_order: { type: 'integer', default: 0 },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  });

  pgm.createTable('brands', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(100)', notNull: true, unique: true },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  });

  pgm.createTable('products', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    category_id: { type: 'uuid', notNull: true, references: 'categories', onDelete: 'RESTRICT' },
    brand_id: { type: 'uuid', references: 'brands', onDelete: 'SET NULL' },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    material: { type: 'varchar(100)' },
    type: { type: 'varchar(100)' },
    gender: { type: 'varchar(50)' },
    age_group: { type: 'varchar(50)' },
    price: { type: 'numeric(10,2)', notNull: true },
    offer_price: { type: 'numeric(10,2)' },
    stock: { type: 'integer', default: 0 },
    sku: { type: 'varchar(100)', unique: true },
    is_hidden: { type: 'boolean', default: false },
    is_featured: { type: 'boolean', default: false },
    is_offer_product: { type: 'boolean', default: false },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', default: pgm.func('now()') },
  });
  pgm.createIndex('products', 'category_id');
  pgm.createIndex('products', ['is_hidden', 'is_featured']);

  pgm.createTable('product_variants', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    size: { type: 'varchar(20)' },
    color: { type: 'varchar(50)' },
    stock: { type: 'integer', default: 0 },
    sku: { type: 'varchar(100)', unique: true },
  });
  pgm.createIndex('product_variants', 'product_id');

  pgm.createTable('product_images', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    url: { type: 'text', notNull: true },
    is_primary: { type: 'boolean', default: false },
    sort_order: { type: 'integer', default: 0 },
  });
  pgm.createIndex('product_images', 'product_id');

  pgm.createTable('banners', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    image_url: { type: 'text', notNull: true },
    title: { type: 'varchar(200)' },
    subtitle: { type: 'varchar(200)' },
    link: { type: 'text' },
    sort_order: { type: 'integer', default: 0 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  });

  pgm.createTable('addresses', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    name: { type: 'varchar(100)', notNull: true },
    phone: { type: 'varchar(20)', notNull: true },
    address_line1: { type: 'text', notNull: true },
    address_line2: { type: 'text' },
    city: { type: 'varchar(100)', notNull: true },
    state: { type: 'varchar(100)', notNull: true },
    pincode: { type: 'varchar(10)', notNull: true },
    is_default: { type: 'boolean', default: false },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  });
  pgm.createIndex('addresses', 'user_id');

  pgm.createTable('coupons', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'varchar(50)', notNull: true, unique: true },
    discount_type: { type: 'discount_type', notNull: true },
    discount_value: { type: 'numeric(10,2)', notNull: true },
    min_order_value: { type: 'numeric(10,2)', default: 0 },
    max_discount: { type: 'numeric(10,2)' },
    usage_limit: { type: 'integer' },
    used_count: { type: 'integer', default: 0 },
    expires_at: { type: 'timestamptz' },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  });

  pgm.createTable('cart', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    variant_id: { type: 'uuid', references: 'product_variants', onDelete: 'SET NULL' },
    quantity: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', default: pgm.func('now()') },
  });
  pgm.createIndex('cart', 'user_id');

  pgm.createTable('orders', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    order_number: { type: 'varchar(20)', notNull: true, unique: true },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    address_id: { type: 'uuid', references: 'addresses', onDelete: 'SET NULL' },
    coupon_id: { type: 'uuid', references: 'coupons', onDelete: 'SET NULL' },
    subtotal: { type: 'numeric(10,2)', notNull: true },
    discount: { type: 'numeric(10,2)', default: 0 },
    total: { type: 'numeric(10,2)', notNull: true },
    status: { type: 'order_status', default: pgm.func("'pending'") },
    payment_method: { type: 'varchar(50)' },
    payment_status: { type: 'payment_status', default: pgm.func("'pending'") },
    razorpay_order_id: { type: 'varchar(255)' },
    razorpay_payment_id: { type: 'varchar(255)' },
    notes: { type: 'text' },
    branch_id: { type: 'uuid', references: 'branches', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', default: pgm.func('now()') },
  });
  pgm.createIndex('orders', 'user_id');
  pgm.createIndex('orders', 'status');

  pgm.createTable('order_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    order_id: { type: 'uuid', notNull: true, references: 'orders', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'RESTRICT' },
    variant_id: { type: 'uuid', references: 'product_variants', onDelete: 'SET NULL' },
    product_name: { type: 'varchar(255)', notNull: true },
    variant_info: { type: 'jsonb' },
    quantity: { type: 'integer', notNull: true },
    unit_price: { type: 'numeric(10,2)', notNull: true },
  });
  pgm.createIndex('order_items', 'order_id');

  pgm.createTable('return_requests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    order_id: { type: 'uuid', notNull: true, references: 'orders', onDelete: 'CASCADE' },
    reason: { type: 'text', notNull: true },
    status: { type: 'return_status', default: pgm.func("'pending'") },
    admin_note: { type: 'text' },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', default: pgm.func('now()') },
  });

  pgm.createTable('wishlists', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  });
  pgm.addConstraint('wishlists', 'wishlists_user_product_unique', 'UNIQUE(user_id, product_id)');

  pgm.createTable('reviews', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    order_id: { type: 'uuid', references: 'orders', onDelete: 'SET NULL' },
    rating: { type: 'smallint', notNull: true },
    review: { type: 'text' },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  });
  pgm.addConstraint('reviews', 'reviews_rating_check', 'CHECK(rating >= 1 AND rating <= 5)');
  pgm.addConstraint('reviews', 'reviews_user_product_unique', 'UNIQUE(user_id, product_id)');

  pgm.createTable('notifications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    title: { type: 'varchar(200)', notNull: true },
    message: { type: 'text', notNull: true },
    type: { type: 'varchar(50)' },
    is_read: { type: 'boolean', default: false },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  });
  pgm.createIndex('notifications', ['user_id', 'is_read']);
};

exports.down = (pgm) => {
  pgm.dropTable('notifications');
  pgm.dropTable('reviews');
  pgm.dropTable('wishlists');
  pgm.dropTable('return_requests');
  pgm.dropTable('order_items');
  pgm.dropTable('orders');
  pgm.dropTable('cart');
  pgm.dropTable('coupons');
  pgm.dropTable('addresses');
  pgm.dropTable('banners');
  pgm.dropTable('product_images');
  pgm.dropTable('product_variants');
  pgm.dropTable('products');
  pgm.dropTable('brands');
  pgm.dropTable('categories');
  pgm.dropTable('otps');
  pgm.dropTable('users');
  pgm.dropTable('branches');
  pgm.dropType('return_status');
  pgm.dropType('discount_type');
  pgm.dropType('payment_status');
  pgm.dropType('order_status');
  pgm.dropType('user_role');
};
