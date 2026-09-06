# Dundu E-Commerce Backend API

Welcome to the **Dundu E-Commerce Backend**. This service provides a RESTful API built with **Node.js**, **Express.js**, and **PostgreSQL** to power the Dundu Web Store, Mobile App (React Native), and Admin Management Portal.

---

## 📐 1. Architecture & Folder Structure

The project follows a clean **Controller-Service-Route-Validator-Middleware** feature-subfolder architecture designed for high scalability, maintainability, and clear separation of concerns:

```
backend/
├── index.js                     # Main application entry point & bootstrap loader
├── package.json                 # Node dependencies and npm scripts
├── Dockerfile                   # Production Docker container configuration
├── .env.example                 # Environment configuration template
├── README.md                    # Developer documentation & API guide
│
├── migrations/                  # Persistent schema migrations (node-pg-migrate)
├── scripts/                     # Operational utility scripts (clear db, renames, etc.)
│
└── src/
    ├── config/                  # App configuration modules
    │   ├── env.js               # Central environment variable parser & defaults
    │   ├── db.js                # PostgreSQL connection pool configuration
    │   ├── passport.js          # Passport OAuth setup (Google Login)
    │   └── cloudinary.js        # Cloudinary media SDK configuration
    │
    ├── constants/               # Global constants & permissions
    │   ├── index.js             # Application constants
    │   └── permissions.js       # Admin module permission definitions
    │
    ├── database/                # Database initialization & runtime safety
    │   └── initDb.js            # Idempotent DDL runtime migration bootstrapper
    │
    ├── middleware/              # Express request middlewares (subfolder structured)
    │   ├── auth/                # Authentication guards & optional auth
    │   │   └── auth.middleware.js
    │   ├── role/                # Role & permission authorization guards
    │   │   └── role.middleware.js
    │   └── error/               # Input validation error & global exception handlers
    │       └── error.middleware.js
    │
    ├── services/                # Business logic & 3rd party integrations (subfolder structured)
    │   ├── otp/                 # OTP generation & storage service
    │   │   └── otp.service.js
    │   ├── payment/             # Razorpay payment & signature verification service
    │   │   └── payment.service.js
    │   └── whatsapp/            # Twilio WhatsApp messaging service
    │       └── whatsapp.service.js
    │
    ├── validators/              # Input validation schemas (express-validator)
    │   ├── auth.validator.js    # Registration, login, OTP & password reset rules
    │   ├── product.validator.js # Product rating & review validation rules
    │   └── admin.validator.js   # Admin creation & status change validation rules
    │
    ├── utils/                   # Standard utility helpers
    │   ├── asyncHandler.js      # Try-catch wrapper for async route handlers
    │   ├── jwt.js               # Token generation & verification utilities
    │   ├── response.js          # Standardized HTTP API response formatters
    │   └── upload.js            # Multer file upload & Cloudinary integration
    │
    ├── controllers/             # HTTP request handlers & controllers (subfolder structured)
    │   ├── customer/            # Customer & public-facing domain controllers
    │   │   ├── auth/            # Authentication controllers
    │   │   ├── catalog/         # Product catalog & review controllers
    │   │   ├── cart/            # Cart controller
    │   │   ├── order/           # Order processing & payment controller
    │   │   ├── user/            # Profile & wishlist controllers
    │   │   └── delivery/        # Delivery agent portal controller
    │   │
    │   └── admin/               # Admin management portal domain controllers
    │       ├── analytics/       # Dashboard analytics & sales reporting
    │       ├── catalog/         # Catalog, categories, brands, materials & inventory
    │       ├── marketing/       # Banners, announcements, coupons, loyalty & referrals
    │       ├── orders/          # Orders, return processing & cart oversight
    │       ├── users/           # Customer accounts & delivery staff management
    │       └── settings/        # Global store settings & splash screen config
    │
    └── routes/                  # Express route definitions & mounting (subfolder structured)
        ├── index.js             # Top-level API router (/api/...)
        ├── customer/            # Public & customer-facing API routes
        │   ├── auth.routes.js
        │   ├── cart.routes.js
        │   ├── category.routes.js
        │   ├── coupon.routes.js
        │   ├── delivery.routes.js
        │   ├── loyalty.routes.js
        │   ├── order.routes.js
        │   ├── product.routes.js
        │   └── user.routes.js
        │
        └── admin/               # Admin management panel sub-routes (/api/admin/...)
            ├── index.js
            ├── analytics/       # Insights & sales reports
            ├── catalog/         # Products, categories, brands, materials, reviews
            ├── marketing/       # Announcements, banners, birthdays, coupons, loyalty, referral, whatsapp
            ├── orders/          # Carts, orders, returns, wishlists
            ├── settings/        # Store settings, splash screen
            └── users/           # Admin accounts, delivery staff, customers
```

---

## 🚀 2. Getting Started

### Environment Variables
Copy `.env.example` to `.env` and fill in your local or server database details:

```bash
cp .env.example .env
```

Key environment parameters:
- `PORT`: API server port (Default: `5000`)
- `DATABASE_URL`: PostgreSQL connection string (`postgresql://user:pass@localhost:5432/dundu_db`)
- `JWT_SECRET`: Secret key for signing authentication tokens
- `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`: Razorpay payment keys
- `TWILIO_ACCOUNT_SID` & `TWILIO_AUTH_TOKEN`: WhatsApp SMS / OTP credentials
- `WEB_CLIENT_URL`, `ADMIN_CLIENT_URL`: Allowed CORS client origin URLs

### Running Local Server
```bash
# Install dependencies
npm install

# Start development server with auto-reload (nodemon)
npm run dev

# Run production server
npm start
```

### Running Database Migrations
```bash
# Run pending migrations
npm run migrate

# Revert last migration
npm run migrate:down

# Create a new migration file
npm run migrate:create name_of_migration
```

---

## 📡 3. Standard API Response Structure

All endpoints return JSON in a uniform response format:

#### Success Response
```json
{
  "success": true,
  "data": {
    "products": [...]
  },
  "message": "Operation successful"
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Error message explanation"
}
```

### Utility Response Helpers (`src/utils/response.js`)
- `ok(res, data, message)` - 200 Success
- `created(res, data, message)` - 201 Resource Created
- `badRequest(res, message)` - 400 Validation / User Error
- `unauthorized(res, message)` - 401 Authentication Required
- `forbidden(res, message)` - 403 Permission Denied
- `notFound(res, message)` - 404 Resource Not Found
- `error(res, message)` - 500 Internal Server Error

---

## 🌐 4. API Endpoints Catalog

### Public / Client Endpoints (`/api/...`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Server status health check | No |
| `GET` | `/api/home` | Feed data (banners, categories, trending, offers) | No |
| `GET` | `/api/settings/payment` | Delivery charge, COD status & checkout settings | No |
| `GET` | `/api/settings/splash` | App launch splash screen configuration | No |
| `GET` | `/api/announcements` | Active top announcement banners | No |
| `GET` | `/api/products` | Browse catalog (filter by category, price, material, etc.) | Optional |
| `GET` | `/api/products/:id` | Get single product details & variants | Optional |
| `GET` | `/api/products/filters` | List all available filter facets | No |

### Authentication Endpoints (`/api/auth/...`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register new user account | No |
| `POST` | `/api/auth/login` | Email & password login | No |
| `POST` | `/api/auth/otp/send` | Request WhatsApp/SMS OTP | No |
| `POST` | `/api/auth/otp/verify` | Verify OTP & obtain token | No |
| `POST` | `/api/auth/forgot-password` | Request password reset OTP | No |
| `POST` | `/api/auth/reset-password` | Reset password using OTP | No |
| `GET` | `/api/auth/google` | OAuth Google social login | No |
| `GET` | `/api/auth/me` | Get current logged in user details | Yes |

### Customer Portal Endpoints (`/api/...`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cart` | Get shopping cart items | Yes |
| `POST` | `/api/cart` | Add product/variant to cart | Yes |
| `PUT` | `/api/cart/:id` | Update item quantity | Yes |
| `DELETE` | `/api/cart/:id` | Remove item from cart | Yes |
| `POST` | `/api/orders` | Place new order (COD or Online) | Yes |
| `POST` | `/api/orders/verify-payment`| Verify Razorpay online payment signature | Yes |
| `GET` | `/api/orders` | List user order history | Yes |
| `GET` | `/api/orders/:id` | Order details & tracking info | Yes |
| `POST` | `/api/orders/:id/cancel` | Cancel pending order | Yes |
| `POST` | `/api/orders/:id/return` | Submit return request | Yes |
| `GET` | `/api/users/profile` | View user profile | Yes |
| `PUT` | `/api/users/profile` | Update profile information | Yes |
| `GET` | `/api/users/addresses` | Get saved delivery addresses | Yes |
| `POST` | `/api/users/addresses` | Add new address | Yes |

### Admin Management Portal (`/api/admin/...`)
Require Admin (`admin` or `super_admin`) token with valid permissions.

| Method | Endpoint | Description | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/dashboard` | Analytics overview dashboard | Admin |
| `GET` | `/api/admin/inventory` | Low-stock & inventory tracking | Admin |
| `GET` | `/api/admin/products` | Manage product catalog | Admin |
| `POST` | `/api/admin/products` | Create product with images | Admin |
| `GET` | `/api/admin/orders` | Manage customer orders | `orders` |
| `PATCH`| `/api/admin/orders/:id/status`| Update order status | `orders` |
| `GET` | `/api/admin/returns` | Process return requests | `returns` |
| `GET` | `/api/admin/reports/daily` | Financial & sales reports | `reports` |
| `GET` | `/api/admin/users` | Manage registered users | Admin |
| `GET` | `/api/admin/admins` | Manage sub-admin accounts & permissions | Super Admin |

---

## 💡 5. Developer Guide: How to Add New Features

When extending the backend with new functionality, follow these steps to keep the architecture clean and maintainable:

### Step 1: Create Validation Rules (`src/validators/`)
Define request input validation using `express-validator`:

```javascript
// src/validators/blog.validator.js
const { body } = require('express-validator');

const createBlogRules = [
  body('title').notEmpty().withMessage('Blog title is required'),
  body('content').notEmpty().withMessage('Blog content is required'),
];

module.exports = { createBlogRules };
```

### Step 2: Implement the Controller in Feature Subfolder (`src/controllers/customer/[domain]/` or `src/controllers/admin/[domain]/`)
Implement request handling logic using `asyncHandler` and standard response helpers:

```javascript
// src/controllers/customer/blog/blog.controller.js
const db = require('../../../config/db');
const { ok, created } = require('../../../utils/response');

const getBlogs = async (req, res) => {
  const { rows } = await db.query('SELECT * FROM blogs ORDER BY created_at DESC');
  ok(res, { blogs: rows });
};

const createBlog = async (req, res) => {
  const { title, content } = req.body;
  const { rows } = await db.query(
    'INSERT INTO blogs (title, content, author_id) VALUES ($1,$2,$3) RETURNING *',
    [title, content, req.user.id]
  );
  created(res, { blog: rows[0] });
};

module.exports = { getBlogs, createBlog };
```

### Step 3: Define Routes in Feature Subfolder (`src/routes/customer/` or `src/routes/admin/[domain]/`)
Map HTTP routes to your controller functions using middleware guards & validators:

```javascript
// src/routes/customer/blog.routes.js
const router = require('express').Router();
const ctrl = require('../../controllers/customer/blog/blog.controller');
const { authenticate } = require('../../middleware/auth/auth.middleware');
const { handleValidation } = require('../../middleware/error/error.middleware');
const { createBlogRules } = require('../../validators/blog.validator');
const ah = require('../../utils/asyncHandler');

router.get('/', ah(ctrl.getBlogs));
router.post('/', authenticate, createBlogRules, handleValidation, ah(ctrl.createBlog));

module.exports = router;
```

### Step 4: Mount Route in Main Router (`src/routes/index.js`)
Register your new route in the main router:

```javascript
router.use('/blogs', require('./customer/blog.routes'));
```

---

## 🔒 Security Best Practices
- **Helmet**: Default HTTP header protections enabled.
- **CORS**: Restricted to whitelist configured in environment settings (`WEB_CLIENT_URL`, etc.).
- **Password Security**: Hashed with `bcryptjs` using salt rounds = 10.
- **SQL Injection Prevention**: All queries use parameterized SQL inputs (`$1`, `$2`, etc.).
