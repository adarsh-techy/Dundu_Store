# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project brain: CEREBRUM.md

`CEREBRUM.md` at the repo root is the living knowledge file: architecture map, key flows, conventions, test recipes, known gaps and a dated changelog. **Read it first when starting any task, and update it (changelog + affected sections) after every change you make.**

## Project Overview

Velora is an e-commerce platform for a clothing brand (women, kids, newborn, maternity categories). The full specification is in `spec.md`.

## Planned Architecture

The system is split into two independent projects — online and offline — each with its own backend and database.

**Online** (customer-facing store):

| App | Technology | Audience |
|---|---|---|
| `web/` | React.js | Customers (browser) |
| `admin/` | React.js + Tailwind CSS | Online store admins |
| `mobile/` | React Native | Customers (mobile) |
| `backend/` | Node.js + Express.js | Shared API for `web/`, `admin/`, `mobile/` (port 5000, `velora_db`) |

**Offline** (in-store/branch operation), all under `dundu-offline/`:

| App | Technology | Audience |
|---|---|---|
| `dundu-offline/super-admin/` | React.js + Tailwind CSS | Super admin (manages all branches) |
| `dundu-offline/branch-admin/` | React.js + Tailwind CSS | Branch-level admins |
| `dundu-offline/backend-offline/` | Node.js + Express.js | API for both offline frontends (port 5001, `dundu_offline`) |

The two backends do not call each other and share no database — branches, offline admin logins, and branch products/orders live entirely in `dundu_offline`.

## Backend Architecture

- **Auth**: JWT for session tokens + Google OAuth; WhatsApp/SMS OTP for phone-based login.
- **Database**: PostgreSQL. All schema migrations should be versioned (e.g., with `db-migrate` or `node-pg-migrate`).
- **Payments**: Razorpay, Cashfree, or PhonePe — payment gateway code should be abstracted behind a common interface so the provider can be swapped.
- **Notifications**: WhatsApp Business Platform (Meta) or Twilio WhatsApp API. Notification logic should be similarly abstracted.
- **Role hierarchy**: Super Admin > Admin (branch) > User. Route middleware must enforce role-based access control.

## Role & Access Model

```
Super Admin — full system control (all panels, all data, admin management)
Admin       — billing, orders, store-level operations only
User        — shopping, cart, orders, profile
```

Admin panel adds branch-level billing features: barcode/QR scan, invoice generation, daily sales report, and in-store payment methods (UPI, Cash, Card, Online).

## Key Domain Concepts

- **Products** have: category, brand, material, type, gender, age group, size, color, price, offer price, stock, SKU, multiple images. Products can be hidden, featured, or marked as offer products.
- **Orders** flow through statuses: Pending → Packed → Shipped → Delivered, with side states Cancelled and Returned (return requires approve/reject).
- **Coupons** are applied at checkout; the cart also supports abandoned-cart tracking.
- **Addresses** are managed per user and selected at checkout.

## Development Setup

### Backend (`backend/`)
```bash
cd backend
cp .env.example .env      # fill in values
npm install
npm run migrate           # runs node-pg-migrate up against DATABASE_URL
npm run dev               # nodemon, port 5000
```

New migration: `npm run migrate:create -- <migration-name>`

All API routes are prefixed `/api/`. Health check: `GET /health`.

### Web Frontend (`web/`)
```bash
cd web
cp .env.example .env      # set VITE_RAZORPAY_KEY_ID
npm install
npm run dev               # Vite dev server on port 3000 (proxies /api to :5000)
npm run build             # production build
```

Vite proxies `/api` and `/uploads` to `http://localhost:5000` in dev — backend must be running.

**Key web architecture:**
- `src/api/` — all API calls; `client.js` is the axios instance with JWT interceptor
- `src/store/auth.store.js` — Zustand auth state (token in `localStorage` under `velora_token`)
- `src/store/cart.store.js` — Zustand cart state; syncs with backend on login
- `src/utils/razorpay.js` — lazy-loads Razorpay SDK and opens checkout modal
- Protected routes use `<ProtectedRoute>` which redirects to `/login` if unauthenticated

### Admin Panel (`admin/`)
```bash
cd admin
npm install
npm run dev    # Vite dev server on port 3001 (proxies /api to :5000)
npm run build
```

Seed the first super admin: `node backend/scripts/seed-admin.js`
Default credentials: `admin@velora.com` / `admin123`

**Key admin architecture:**
- Token stored in `localStorage` under `velora_admin_token` (separate from web)
- `auth.store.js` validates that logged-in user has `admin` or `super_admin` role
- Sidebar hides super-admin-only nav items for branch admins (`superOnly` flag per nav item)
- All admin API calls go through `/api/admin/*` which enforces `requireRole(['admin','super_admin'])`

## Docker Deployment

`backend/`, `admin/`, and `web/` can be run as containers via the root `docker-compose.yml` (Postgres + backend API + both frontends, with nginx in front of each frontend proxying `/api` and `/uploads` to the backend container so no CORS setup is needed). `mobile/` and `dundu-offline/` are not part of this compose stack — mobile ships via Expo/EAS, and the offline system is a fully separate deployment.

```bash
cp .env.example .env                    # compose-level config (DB creds, ports, CORS origins)
cp backend/.env.example backend/.env    # backend secrets (JWT, Razorpay, Twilio, Cloudinary, Google) — fill in real values
docker compose build
docker compose up -d
docker compose exec backend npm run migrate   # first run only (and after new migrations)
```

Default ports: backend `:5000`, web `:3000`, admin `:3001`, Postgres `:5432` — override via `.env`. Uploaded files persist in a named volume (`backend_uploads`), Postgres data in `postgres_data`.

For a real deployment behind actual domains, set `WEB_CLIENT_URL`/`ADMIN_CLIENT_URL` in `.env` to the public origins and rebuild.

⚠️ `docker compose config` prints the fully-resolved environment, including everything in `backend/.env` — avoid running it (or redirect/redact) where secrets shouldn't be exposed.

## Environment Variables

See `backend/.env.example` for the full list. Key vars:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- `ALLOW_DEV_OTP=true` — accept the fixed OTP `123456` for phone login / delivery PINs in local dev only. Ignored when `NODE_ENV=production`.
- `TRUST_PROXY` — number of reverse-proxy hops in front of the API (default 1); needed for correct client IPs in rate limiting.

In production the backend refuses to start if `JWT_SECRET` is missing or still a `your_...` placeholder.

## Security Rules (enforced server-side)

- Auth middleware re-reads role, permissions and `is_blocked` from the DB on every request; blocking an account takes effect immediately.
- `/api/admin/*`: only `orders`, `returns`, `loyalty`, `reports`, `wallets` and `delivery-staff` are reachable by branch admins (via `permissions`). Everything else is `super_admin` only.
- Order placement validates quantity (1–99 integer), payment method (`cod|online|upi|card`), address ownership and variant/product match; shipping, discounts, loyalty points and wallet are all settled inside the order transaction and reversed by `reverseOrderSideEffects` on cancel.
- Spin wheel / scratch card endpoints require a JWT and take identity from it, never from the body. Prize coupons are single-use per customer (`coupons.per_user_limit`, `coupons.user_id`).
- Uploads: extension derived from MIME type, magic bytes verified, `/uploads` served with `nosniff` + sandbox CSP.
- Rate limits on auth, OTP and prize endpoints (`src/middleware/rateLimit.middleware.js`).
