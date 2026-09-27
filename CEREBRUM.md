# CEREBRUM — Dundu Store project brain

> One file that explains how the whole project fits together, where things live, what has been fixed, what is still open, and how to test.
> **Rule: every time anything in this repo changes, update this file** (section 9 changelog at minimum, plus any section the change affects).
> Last updated: 2026-09-27 (second hardening pass)

---

## 1. What this project is

Dundu (formerly "Velora") is a clothing e-commerce platform for women, kids, newborn and maternity wear.

| Part | Folder | Stack | Port | Who uses it |
|---|---|---|---|---|
| Customer website | `web/` | React 19 + Vite 8 + Tailwind v4 + React Query + Zustand | 3000 | Shoppers |
| Admin panel | `admin/` | React 19 + Vite + Tailwind + Recharts | 3001 | Store staff (super admin / branch admin) |
| Mobile app | `mobile/` | Expo 57 + React Native 0.86 + React Navigation 7 | Expo | Shoppers |
| API | `backend/` | Node 20/24 + Express 4 + PostgreSQL (`pg`) | 5000 | All three fronts |
| Offline / branch system | `dundu-offline/` | Planned separately (not present in this checkout) | 5001 | In-store |

The web and admin dev servers proxy `/api` and `/uploads` to `http://localhost:5000`. Mobile calls the API directly (`mobile/src/config.js` → `EXPO_PUBLIC_API_URL`).

There is **no git repository** in this folder. Back up before large edits (copy the folder or `git init`).

---

## 2. Backend map (`backend/`)

```
index.js                      Express app: helmet, CORS, rate limit, /uploads static, /api routes, /health
src/config/env.js             ALL env parsing. Refuses to start in production with placeholder JWT_SECRET
src/config/db.js              pg Pool: db.query() and db.getClient() (for transactions)
src/config/passport.js        Google OAuth strategy (only links by email if Google says verified)
src/database/initDb.js        Idempotent runtime ALTERs run at every boot (mirror of migrations)
migrations/                   node-pg-migrate files; `npm run migrate` applies them (versioned, never edit applied ones)
src/middleware/auth/          authenticate / authenticateOptional — re-reads role, permissions, is_blocked from DB on EVERY request
src/middleware/role/          requireRole([...]) and requirePermission('orders'|'returns'|'loyalty'|'reports'|'wallet'|'billing')
src/middleware/rateLimit.middleware.js  express-rate-limit presets (api, otp send/verify, login, signup, reset, rewards)
src/middleware/error/         handleValidation (express-validator) + globalError (hides messages in production)
src/routes/index.js           Mounts customer routers + public endpoints: /home, /announcements, /settings/payment,
                              /settings/splash, /festival/config, /first-purchase/config, /scratch-card/*
src/routes/customer/*.js      auth, products, categories, combos, cart, orders, users, coupons, loyalty, delivery, spin-wheel, wallet
src/routes/admin/index.js     Gate: authenticate + admin|super_admin, audit middleware, then per-area permission or super-only
src/controllers/customer/     auth, catalog(product/combo/review), cart, order, user(profile/address/wishlist/notifications), delivery, spinWheel
src/controllers/admin/        analytics, catalog, marketing, orders, settings, users
src/services/                 otp (DB-backed, attempt-limited), payment (Razorpay create/verify/refund), wallet (ledger), whatsapp (Twilio or mock), audit (admin action trail)
src/utils/                    upload.js (multer + magic-byte check), jwt.js, response.js (ok/created/badRequest…), asyncHandler.js, delivery.js
src/validators/               express-validator rule sets (auth, product review, admin)
scripts/clear-db.js           Wipes data and seeds admin@dundu.com / admin123 (check the file before running)
```

### 2.1 Roles and access
- `super_admin` → everything.
- `admin` (branch admin) → only areas listed in `users.permissions` (JSON array). Enforced server-side in `src/routes/admin/index.js`; the admin sidebar merely hides the rest.
- `delivery_staff` → `/api/delivery/*` only.
- `user` → shopping.
- Blocking a user or changing permissions takes effect immediately (auth middleware reloads from DB).

### 2.2 Order placement — the single most important flow
`backend/src/controllers/customer/order/order.controller.js` → `placeOrder`

1. Validates payment method (`cod|online|upi|card`), address ownership, quantity (integer 1–99), product not hidden, variant belongs to product.
2. Cart rows + combo rows (`expandComboCartRows` splits a bundle into per-product lines with prorated prices).
3. Stock is locked with `SELECT … FOR UPDATE` before decrement.
4. Picks the **single best** discount among coupon / referral / birthday / loyalty (`orders.discount_type` records which).
5. Coupons: locked row, `usage_limit`, `per_user_limit`, optional `user_id` binding (prize coupons).
6. Loyalty points and wallet are debited **inside the transaction** for every method; reversed on cancel.
7. Shipping computed server-side from settings `delivery_charge` / `free_delivery_threshold`; an unredeemed free-shipping spin/scratch prize waives it once.
8. Online methods create a Razorpay order; `verifyPayment` checks the HMAC (timing-safe) and only then marks paid + earns points.
9. `reverseOrderSideEffects` (customer cancel + admin cancel) restores stock, coupon count, referral reward, loyalty points, wallet, and refunds Razorpay (falls back to wallet credit if the gateway refuses).

Any early exit inside the transaction must call `fail()` (does ROLLBACK). Never `return` without rollback — it poisons the pooled connection.
10. `orders.loyalty_points_earned` records points granted (COD at placement, online at verify); `delivered_at` drives the 48 h return window; `razorpay_refund_id` makes refunds idempotent. Cancelled / returned / return_requested are terminal statuses.

### 2.3 OTP / auth facts
- OTPs live in table `otps` (unique per identifier, 5 wrong attempts kill it, TTL param in minutes — delivery PINs use 360).
- Fixed OTP `123456` works only when `ALLOW_DEV_OTP=true` **and** `NODE_ENV!=production`.
- Forgot-password sends the code to the account's WhatsApp number; the response is always generic (no account enumeration).
- Google callback redirects to `${WEB_CLIENT_URL}/auth/callback#token=…` (fragment, not query).
- Changing a phone number from the profile requires an OTP for the new number. Date of birth can be set once.

### 2.4 Uploads
Only JPEG/PNG/WebP. Extension derived from MIME, magic bytes verified after write, `/uploads` served with `nosniff` + sandbox CSP. Cloudinary is used automatically when `CLOUDINARY_*` env vars are set.

### 2.5 Important tables (beyond the obvious)
| Table | Notes |
|---|---|
| `users` | `role`, `permissions` jsonb, `is_blocked`, `is_cod_blocked`, `date_of_birth`, `date_of_birth_set_at`, referral codes, spin/scratch popup flags |
| `orders` | `discount_type`, `delivery_charge`, `loyalty_points_redeemed`, `wallet_amount`, `wallet_debited`, razorpay ids, courier fields |
| `order_items` | `combo_id` when the line came from a bundle |
| `coupons` | `usage_limit`, `used_count`, `per_user_limit`, `user_id` (nullable = shared) |
| `cart` | product rows **or** combo rows (`combo_id`, `combo_selections` jsonb); CHECK quantity > 0 |
| `combos`, `combo_slots`, `combo_slot_products` | bundle definition |
| `spin_wheel_logs`, `scratch_card_logs` | prizes; `is_redeemed` set when the coupon/free shipping is used |
| `wallets`, `wallet_transactions` | ledger, never negative |
| `loyalty_cards` | keyed by **phone**, shared with in-store POS |
| `settings` | key/value store for every feature flag and number (delivery charge, loyalty rules, spin wheel timing…) |
| `audit_logs` | admin action trail, written by `auditAdminActions`; read-only in the UI |
| `deleted_at` / `deleted_by` / `trash_meta` | on products, categories, combos, coupons, banners, announcements — Trash; restore reads `trash_meta` |

Tables `scratch_card_prizes` / `scratch_card_logs` are created lazily by `admin/marketing/scratchCard.controller.js` and also by `initDb.js`.

---

## 3. Web map (`web/src`)

```
index.css                     Design tokens (@theme), base styles, component classes in @layer components
                              (.card .input .chip .switch .glass .skeleton), animations, product-grid, Swiper overrides
App.jsx                       Routes (see below), QueryClient, Toaster
api/client.js                 axios with JWT from localStorage `dundu_token`; 401 → logout + /login
api/index.js                  All API calls grouped: authApi, productApi, comboApi, cartApi, orderApi, userApi, walletApi, spinWheelApi, scratchCardApi…
store/auth.store.js           token + user (fetchMe)
store/cart.store.js           items, drawer state, addToCart / addComboToCart, helpers cartItemPrice/Name/Image
store/settings.store.js       offer badge colours
hooks/useDocumentTitle.js     per-page <title>
hooks/useNow.js               render-safe clock (useSyncExternalStore) for countdowns
utils/format.js image.js orderStatus.js
components/layout/            Header (glass sticky, category strip, mobile search toggle), Footer, MobileNav, AnnouncementBar, WelcomePopup, Layout
components/cart/CartDrawer    right-side drawer, supports combos
components/product/ProductCard
components/ui/                Button, Input, Badge, Spinner, Skeleton, EmptyState, SectionHeader, PageHeader, Price, Modal, BirthdayPopup
pages/                        home, products (list + detail), combos (list + detail), checkout, orders (list, detail, return),
                              account (profile, wishlist, wallet, loyalty-card), auth (login, signup, forgot, callback, AuthShell), help, not-found
```

Routes: `/`, `/products`, `/products/:id`, `/combos`, `/combos/:id`, `/help/:topic`, `/login`, `/signup`, `/forgot-password`, `/auth/callback`, protected: `/checkout`, `/orders`, `/orders/:id`, `/orders/:id/return`, `/profile`, `/wishlist`, `/wallet`; `/loyalty-card` is public; `*` → NotFound.

### 3.1 Conventions
- Use token classes (`text-ink`, `text-muted`, `bg-card`, `border-line`, `text-primary-soft`) — do not hard-code hex colours.
- Cards: `className="card p-5"`. Inputs: `className="input"`. Chips: `chip is-active`.
- Headings use `font-display` (Playfair Display); body is Inter.
- Grid children that contain Swiper or long text need `min-w-0` (otherwise the column can grow without bound).
- Do not call `setState` synchronously inside `useEffect` — the `react-hooks/set-state-in-effect` lint rule errors. Derive values or use `useState` initialisers / React Query instead.
- Do not call `Date.now()` during render — use `useNow()`.
- Breakpoints: phone < 640, tablet 640–1023, desktop ≥ 1024. Checkout and product page go two-column at `lg`.

### 3.2 Buy-now flow
Product page → `navigate('/checkout', { state: { buyNow: {...} } })`. Checkout sends `buy_now_item` instead of the cart.

---

## 4. Admin map (`admin/src`)
Pages: `auth`, `dashboard`, `catalog` (products, categories, combos, new-arrivals, insights), `orders` (orders, returns, carts, wishlists, delivery staff), `marketing` (control hub, coupons, referral, banners, announcements, whatsapp, birthdays, spin wheel, festival, first purchase, scratch card, reviews), `reports`, `settings` (general, payment methods, delivery, returns, app update, splash), `users` (users, activity, admins, wallets, loyalty).
Token key: `velora_admin_token`. Sidebar `superOnly` / `permission` flags mirror the backend gates in `backend/src/routes/admin/index.js`. Coupon form does not yet expose `per_user_limit` (API accepts it).

## 5. Mobile map (`mobile/src`)
Screens: auth, home, products, combos, checkout (cart, checkout, payment), orders, profile, delivery (rider app), policy. Token stored in AsyncStorage `dundu_token`. Spin wheel, scratch card and checkout reward calls send the JWT (`authHeaders()` helper inside those components). Profile phone edits need an OTP step that the UI does not have yet.

---

## 6. Environment & running

```bash
# backend
cd backend && cp .env.example .env   # fill JWT_SECRET (random), DB, Razorpay, Twilio, Cloudinary, Google
npm install && npm run migrate && npm run dev          # nodemon on :5000
# web / admin
cd web && npm install && npm run dev                    # :3000 (proxy → :5000)
cd admin && npm install && npm run dev                  # :3001
# docker (backend + web + admin + postgres)
docker compose build && docker compose up -d && docker compose exec backend npm run migrate
```

Key env: `DATABASE_URL`, `JWT_SECRET` (must be real in production), `ALLOW_DEV_OTP=true` (dev only), `TRUST_PROXY`, `WEB_CLIENT_URL`/`ADMIN_CLIENT_URL` (CORS allow-list; in production, missing values mean cross-origin is refused), `VITE_RAZORPAY_KEY_ID`, `VITE_SUPPORT_WHATSAPP`.

Restart the backend after editing anything under `backend/` if it was started with `node index.js` (not nodemon).

---

## 6.1 Hosting (developer/staging)
- **Backend + Postgres → Render** via `render.yaml` at the repo root (Dashboard → New + → Blueprint → this repo → Apply). DB URL and JWT secret are auto-generated; add Cloudinary/Razorpay/Twilio/Google keys in the service's Environment tab. Free plan sleeps after 15 min idle. Cloudinary is required because Render's disk is wiped per deploy.
- **web/ and admin/ → Vercel** as two projects (root dirs `web`, `admin`, framework Vite). Set `VITE_API_BASE_URL=https://dundu-api.onrender.com`; web also needs `VITE_RAZORPAY_KEY_ID`, `VITE_SUPPORT_WHATSAPP`. Then set `WEB_CLIENT_URL`/`ADMIN_CLIENT_URL` on Render to the Vercel URLs (CORS).
- **mobile/ → Expo** (Expo Go for devs, EAS Build/Update for testers) with `EXPO_PUBLIC_API_URL`.
- First super admin: open the admin panel's `/register` page once (locks after the first admin exists).

## 7. How to test

**Backend smoke test (manual recipe, ~30 checks)** — the script used on 2026-09-27 lives outside the repo; recreate quickly:
1. Sign up a user → `POST /api/auth/signup`.
2. Try orders with `quantity: -10 / 0 / "5abc"` → expect 400. `payment_method: "cash"` → 400. Someone else's `address_id` → 400.
3. Valid COD order → 201, product stock decreases, `delivery_charge` present.
4. Fire two concurrent `POST /orders/:id/cancel` → exactly one 200, stock restored once.
5. `POST /spin-wheel/spin`, `POST /scratch-card/reveal` without token → 401.
6. Branch admin token with `permissions:["orders"]` → `GET /admin/settings` 403, `GET /admin/orders` 200. Set `is_blocked=true` → next request 401.
7. Upload a file named `x.html` with `image/png` MIME to `POST /products/:id/reviews` → 400.

**Web**
```bash
cd web && npx eslint src && npm run build      # must be 0 errors
```
Responsive audit: Playwright script that loads every route at widths 320→1920, checks `document.documentElement.scrollWidth > innerWidth` and elements whose `getBoundingClientRect().right > innerWidth` (ignoring fixed elements and children of horizontally scrollable ancestors). Last run: 190 combinations, 0 issues.

**Isolated test data** — never seed the real DB with demo data. Create a scratch DB (`CREATE DATABASE dundu_shots`), run `DATABASE_URL=… npx node-pg-migrate up`, seed it, start `PORT=5055 WEB_CLIENT_URL=http://localhost:3055 node index.js` and `VITE_API_BASE_URL=http://localhost:5055 npx vite --port 3055`, then drop the DB.

---

## 8. Known gaps / TODO (open as of 2026-09-27)
- [ ] **Mobile checkout** still computes discounts the old way (coupon + loyalty additive, no wallet caps); mirror the web `Checkout.jsx` logic in `mobile/src/screens/checkout/checkout/CheckoutScreen.jsx`.
- [ ] Mobile has no "Pay now" for pending online orders (`POST /orders/:id/pay` exists).
- [ ] Razorpay refund path is untested against the live gateway (needs real keys); wallet fallback + `razorpay_refund_id` logic reviewed only.
- [ ] Admin coupon form: add `per_user_limit` field (backend ready).
- [ ] Mobile profile: phone change needs an OTP step (backend requires it).
- [ ] Combos in the **mobile** cart screen: verify it still shows bundle rows after backend expansion change (web is done).
- [ ] Google login works end-to-end only when `GOOGLE_*` env vars are set and `WEB_CLIENT_URL` is correct.
- [ ] Forgot-password only works for accounts with a phone number (no email provider configured).
- [ ] Size guide link on product page points to FAQ; categories support size-chart images (`/api/categories/:id/size-chart`) — wire a modal.
- [ ] Refund for cancelled online orders relies on Razorpay refund API credentials being live.
- [ ] `backend/scripts/seed-admin.js` mentioned in CLAUDE.md does not exist; use `clear-db.js` (it seeds admin@dundu.com / admin123).
- [ ] Web bundle is ~626 kB; consider route-level `React.lazy` code splitting.
- [ ] No automated test suite in the repo yet (jest/vitest). The recipes above are manual.

---

## 9. Changelog (newest first)

### 2026-09-27 — Mobile + admin review fixes
Backend
- Banner `update` is now a partial update (reorder no longer wipes title/subtitle/link/badge).
- WhatsApp broadcast substitutes `{name}`, `{phone}`, `{store_url}` (from `WEB_CLIENT_URL`) and `{code}` (from `coupon_code` in the request).
- Finance report: refunds filtered to the selected period; net profit no longer clamped at 0. Dashboard "open returns" counts pending requests only.
- Inventory endpoint accepts `stock=healthy|restock` (no LIMIT when filtered) and ignores trashed products.
- `popup_interval_minutes=0` allowed (popup disabled). Announcement `sort_order` coerced to int. Public `/announcements` returns `scheduled_time` and hides entries until that time (Asia/Kolkata).
- `PATCH /admin/reports/products/:id/cost-price` is super-admin only.
- Web + mobile `cartApi.clear` → `DELETE /cart/clear` (the old `/cart` path never existed → mobile checkout always "failed" after creating the order).
Admin
- Product list requests `show_hidden=true` (hidden products stay visible/manageable); delete confirmations say "Move to Trash"; `err.message` used everywhere; coupon expiry shown in local time; inventory passes healthy/restock to the server; dashboard low-stock tile → /inventory; banners use v5 `invalidateQueries({ queryKey })`.
Mobile (verified by a follow-up review — no critical issues): combo cart lines and zero offer prices display correctly (`lineUnitPrice/lineName/lineImage` in `store/cart.store.js`), scratch strokes follow the finger; cart clear URL, Payment → OrderDetail param, Pay-now for pending online orders, checkout math mirrors the server (no first-order discount), combo detail unwrap, order detail field names, scratch card reveals only when scratched, quantity clamp 1..99.

### 2026-09-27 — Third review fixes (payments, trash edge cases, hosting)
- `POST /orders/:id/pay` reuses the order's existing Razorpay order instead of minting a new one (a Razorpay order is payable once, so nothing can be orphaned). `verifyPayment` refunds a signature-valid payment that matches no order (`paymentService.fetchOrder`).
- Trash: `/empty/:type` route registered before `/:type/:id`; `notTrashed(type)` middleware on the six admin routers (GET/PUT/PATCH on a trashed id → 404 "in Trash", static sub-paths like `/next-code` pass); trashing a category hides its visible products (ids in `trash_meta.hidden_product_ids`) and restore un-hides them (also fixing the saved state of products trashed meanwhile); product restore is blocked while its category is trashed; coupon `code` / category `slug` are renamed `<value>~trash~<id8>` in Trash and restored (with `-restored` suffix on clash); category `reassign_to` validated (UUID, exists, not trashed, not self).
- Audit: search debounce uses a ref; `from`/`to` must be YYYY-MM-DD (400 otherwise).
- Hosting: both `vercel.json` files proxy `/api/*` and `/uploads/*` to `https://dundu-store-backend.onrender.com`, so the apps work even without `VITE_API_BASE_URL`; compose password must be alphanumeric (documented).

### 2026-09-27 — Trash (soft delete) for catalogue & marketing
- Migration `1782300000006_trash` (+ initDb): `deleted_at`, `deleted_by`, `trash_meta` on products, categories, combos, coupons, banners, announcements.
- `src/services/trash/trash.service.js`: per-type config (hide columns, blockers, purge); `trash()` flips is_hidden/is_active and remembers the prior state; `restore()` puts it back; `purge()` hard-deletes unless blocked (product in orders, category with products); `purgeExpired()` runs 30 s after boot and daily (30-day retention).
- Admin delete handlers for the six types now call `trash()`; admin lists filter `deleted_at IS NULL`; storefront queries were already filtering on is_active/is_hidden.
- API (super admin): `GET /api/admin/trash?type&search`, `POST /api/admin/trash/:type/:id/restore`, `DELETE /api/admin/trash/:type/:id`, `DELETE /api/admin/trash/empty/:type?`. All actions are audited.
- Admin panel: **System → Trash** (`/trash`) with type tabs + counts, search, restore, delete-forever and empty-trash confirmations, purge countdown. Audit Log moved into the System group too.

### 2026-09-27 — Admin audit log
- Table `audit_logs` (migration `1782300000005_audit-logs`, mirrored in initDb): actor, action (create/update/delete/login/other), entity_type/id, summary, method, path, status, sanitized details JSON, ip, user agent.
- `src/services/audit/audit.service.js`: `record()` (never throws, masks pass/secret/token/otp keys, truncates big payloads) and `auditAdminActions` middleware mounted on `/api/admin` — logs every successful POST/PUT/PATCH/DELETE automatically; controllers can override via `res.locals.audit`. Admin logins are recorded from `auth.controller.login`.
- Read API (super admin): `GET /api/admin/audit-logs` (page, limit, search, actor, action, entity, from, to), `/filters` (actors, areas, actions, stats), `/:id`.
- Admin panel: **System → Audit Log** (`/audit-log`), `pages/users/audit-log/AuditLog.jsx` with stat cards, search + filters, lazy-loaded table (useInfiniteQuery + IntersectionObserver, 40 rows per page) that scrolls inside a fixed-height container with a sticky header, detail modal with copyable JSON.

### 2026-09-27 — Migrations run at boot
- `backend/index.js` now applies pending `node-pg-migrate` files on startup (before `initDb`). Fixes Render deploys whose Start Command was only `npm start` ("relation users does not exist"). Opt out with `RUN_MIGRATIONS_ON_START=false`.
- Hosting: `render.yaml` blueprint, `web/vercel.json`, `admin/vercel.json` added; see §6.1.

### 2026-09-27 — Admin Combo Products page rebuilt
- `admin/src/pages/catalog/combos/Combos.jsx`: stat cards (combos, orders, low stock, avg savings), search across names/slots/products, live/hidden filter, sorting; cards show cover or product collage, savings %, stock/orders, hidden/low-stock badges; actions: show/hide, duplicate, edit, delete (confirm modal with "hide instead"). Modal: inline validation, live "customer sees" price panel vs. buying separately, 4:3 cover cropper, slot builder with reorder, browse-or-search product picker (local 200 + server search), per-slot product options.
- Backend `admin/catalog/combo.controller.js`: `validateComboInput` (name, price > 0, offer < price, integer stock, slots/labels/products, product ids must exist and be visible); `syncSlots` upserts slots **by id** so carts keep valid `slot_id`s after an edit; `list` returns `regular_total`, `orders_count` and product previews; `image_url=''` removes the cover. Slot payload from the admin sends `products` as an array of ids.
- Verified: 10 API checks (validation + slot-id preservation + storefront detail) pass with no server errors.

### 2026-09-27 — Admin console errors
- Admin Categories page crashed (`Tag is not defined`): missing lucide import added.
- `GET /api/admin/referral/rewards` returned 500: `referral_rewards.used_at` never existed. Migration `1782300000004_referral-rewards-used-at` adds it (backfilled from the order date); placeOrder sets it, cancel clears it.

### 2026-09-27 — Second hardening pass (refunds, stock, prizes, checkout math)
Backend
- `updateStatus`: cancelled / returned / return_requested are terminal (no reopening → no double refund). `delivered_at` set once; return window keys off it.
- `handleReturn`: locks the request + order (`FOR UPDATE`) and re-checks state; refuses `original` refund if already refunded; stores `razorpay_refund_id`; loyalty clawback uses `orders.loyalty_points_earned` (skipped for replacement); rejection is atomic.
- `verifyPayment`: only `payment_status='pending' AND status<>'cancelled'`; a stray capture for a cancelled/refunded order is refunded and rejected.
- `placeOrder`: aggregated stock check across duplicate lines (cart + combo), guarded `stock>=qty` decrements (400 not 500), product-level stock kept in sync for variant products, combo stock locked/guarded and restored on cancel, `offer_price` 0 = no offer, shared prize codes require an unredeemed win, prize log redeemed one-at-a-time.
- `reverseOrderSideEffects`: claws back earned points + total_spent, restores combo stock, refund is idempotent (`razorpay_refund_id`), wallet fallback only on definitive gateway rejection, network errors abort the cancel for retry.
- New `POST /api/orders/:id/pay` (retry Razorpay for a pending online order). `GET /orders/:id` no longer overwrites order fields with address fields.
- Spin & scratch: per-user `pg_advisory_xact_lock` inside a transaction (5 parallel spins → 1 prize); public spin config no longer exposes coupon codes.
- Admin: `/delivery-staff` super-only; wallet adjust = customers only, not self, capped by setting `wallet_max_adjustment` (super admin may exceed), transactional; product edit upserts variants by id (open orders keep `variant_id`); product delete in a transaction; delivery pickup is an atomic claim; WhatsApp `sent_by` column no longer rewritten on boot; NaN/negative guards on pagination, loyalty points, cost price; finance report sums real refund amounts.
- `/settings/payment` now returns `loyalty_redeem_points/discount` and `wallet{enabled,min_order_amount,max_usage_percent,max_discount_cap}`.
- Migration `1782300000003_refund-and-loyalty-tracking` (+ initDb): `orders.loyalty_points_earned`, `orders.delivered_at`, `orders.razorpay_refund_id`, `wallets` CHECK balance ≥ 0, setting `wallet_max_adjustment=10000`.
Web
- Checkout mirrors the server: single best discount (coupon/birthday/loyalty), shipping threshold on the post-discount amount, wallet caps from settings, real coupon error messages, prize coupon validated against the true subtotal and banner only when applied.
- Razorpay: proper `modal.ondismiss`; dismiss/failure/verify errors send the customer to the order page; Order detail shows **Pay now** for pending online orders.
- Buy Now survives the "add an address first" detour (state forwarded through Profile).
Verified with a 22-check smoke test on an isolated database (all pass, no server errors).

### 2026-09-27 — Admin Panel Modernization (Marketing, Catalog & Governance)
- **Coupons (`/coupons`)**: Sourced real order metrics, revenue and discount totals; added 1-click clipboard code copy; streamlined checkout visibility governance.
- **Marketing Control Center (`/marketing-control`)**: Purged synthetic multipliers and seed fallbacks; generous card spacing; direct PostgreSQL aggregated KPIs.
- **Banners (`/banners`)**: Executive KPI strip, clean 16:6 preview cards, curated offer badge colors, dynamic category routing filters.
- **Categories & Brands (`/categories`)**: Replaced pastel pink/blue styling with executive dark slate/white cards and taxonomy counters.
- **Announcements (`/announcements`)**: Clean popup frequency governance, removed emojis, unified typography and status indicators.
- **Referrals (`/referral`)**: 100% full width layout across all tabs; eliminated sticky pink table headers in favor of clean slate borders; zero emojis in templates; interactive dual-sided simulator with clear economics.
- **Reviews (`/reviews`)**: Completely replaced legacy raw dark mode with the Executive Design System (clean white cards, slate borders, gold rating stars); added 4 KPI metric cards, interactive 5-to-1 star distribution bars with 1-click rating filtering, real-time search, verified buyer vs admin created badges, customer photo lightbox popup, and streamlined zero-emoji creation/edit modal.
- **WhatsApp Broadcast (`/whatsapp`)**: Overhauled broadcast studio to the Executive Design System (eliminated `bg-green-50` and pastel pink text); added 4 KPI cards (Total Broadcasts, Reachable Customers, Cart Abandoners, Delivered Messages); added interactive realistic WhatsApp smartphone preview mockup with live variable substitution; added 1-click variable insertion toolbar (`{name}`, `{store_url}`, `{code}`); added high-conversion Active Cart Abandoner audience segment; clean delivery history table with search and status filters; resolved database `sent_by` UUID type compatibility in `whatsapp_logs`.
- **Birthday Notifications (`/birthdays`)**: Overhauled Birthday Rewards to the Executive Design System (eliminated `bg-green-50`, `bg-pink-50`, and `bg-purple-50` pastel cards); added 4 KPI cards (Today's Celebrants, Upcoming Next 7 Days, Birthday Discount %, Customer DOB Profiles); clean text zodiac signs with zero emojis; 1-click variable tag inserter (`{name}`, `{discount}`, `{store_url}`); live WhatsApp smartphone chat preview; bulk "Wish All Today" dispatch; synchronized `birthday_popup_enabled` backend state.
- **Payment Methods (`/payment-methods`)**: Rebuilt into a clean, simple, and clutter-free interface (eliminated walls of text, complex jargon, and pastels); provides clear toggles for Cash on Delivery (COD) and Checkout Coupon Box; clean status rows for Online Payments (Razorpay) and Dundu Wallet; standard delivery fee and free shipping order threshold controls with instant save.
- **Delivery & Shipping (`/delivery-settings`)**: Modernized to the Executive Design System with 4 KPI cards (Base Delivery Fee, Free Delivery Threshold, Estimated Transit Time, Checkout Integration Status); clean dual-card configuration layout for shipping fees and transit duration; live checkout calculation preview; real-time customer ETA badge preview; auto-dirty state tracking with clean save feedback.
- **New Arrivals (`/new-arrivals`)**: Modernized to the Executive Design System with full-width layout; eliminated clashing pastels (`bg-green-50` with `border-pink-300`); added 3 executive stat cards (Live in Showcase, Total Catalog, Showcase Ratio); added real-time search with clear button, category selector chips, and quick filter tabs (All, New Arrivals, Not Featured); clean product table with high-res thumbnails, SKU tags, pricing, stock badges, and 1-click `Add to New` / `Remove` toggle actions with instant toast feedback.
- **Splash Screen (`/splash-screen`)**: Redesigned to be clean, simple, and not complicated (eliminated all confusing KPI clutter and redundant boxes); features a direct 2-column studio with clear On/Off toggle, App Name & Tagline fields, quick preset background & text color swatches + hex pickers, 1-click optional photo upload/remove, 4 duration buttons (1.5s to 3.0s), and a clean live smartphone preview mockup right beside it with auto-dirty save detection.
- **Scratch & Win Cards (`/scratch-card`)**: Redesigned to be clean, simple, and not complicated (eliminated all confusing clutter, bulky KPI boxes, and date preset complexity); streamlined into 3 clear tabs: (1) Offer Settings & Live Card (On/Off switch, min cart spend, customer milestone dropdown, and interactive phone scratch preview), (2) Prize Rewards (clean cards with discounts, coupon codes, and win chances), and (3) Winners History (recent reveals table with instant search); standardized on `react-hot-toast`.
- **Daily Sales Report (`/reports/sales`)**: Modernized to the Executive Design System with full-width layout; eliminated rainbow pastel borders, glowing background blur circles, and clashing badges; added 4 executive KPI cards (Gross Revenue, Orders Placed, Average Basket AOV, Peak Hour); quick date switches (`Today`, `Yesterday`, custom date picker); minimalist hourly sales trend bar chart in sleek slate; real-time payment mode distribution (COD, Online Razorpay, Wallet); and top selling products ranked by revenue contribution with percentage share.
- **1st Purchase Offer & Tier Slabs (`/first-purchase`)**: Redesigned to be vibrant, colorful, and clean (eliminated all confusing clutter and redundant boxes); features a colorful sunset gradient header, distinct tier slab color borders (Starter Emerald, Silver Indigo, Gold Amber, Platinum Rose), vibrant purple/pink welcome banner with gold accents on the live phone preview mockup, real-time cart subtotal range slider demonstrating automatic slab matching, and a change-triggered Save button with blue background (`bg-blue-600 hover:bg-blue-700`) and white text (`text-white`) with discard capability.
- **Backend Reviews Controller (`review.controller.js`)**: Added search keyword matching, rating filtering (1–5), verified/admin/photo type filters, sorting options, and comprehensive stats breakdown.

### 2026-09-27 — 404 handling everywhere
- Backend `index.js`: unknown `/api/*` routes return JSON `{ success:false, message:"Route not found: METHOD /path" }`; any other unknown path gets a small branded HTML 404 (no stack traces).
- Admin `pages/common/not-found/NotFound.jsx` restyled to the pink brand with "Go back" + "Dashboard" actions (web already had a designed 404 at `pages/not-found/NotFound.jsx`).

### 2026-09-27 — Responsive pass (web)
- Checkout stacks below `lg`; summary column `min-w-0` (fixed overflow at 834 px).
- Announcement bar no longer sticky; mobile search collapses behind an icon in the header.
- Product page: quantity + save on one row, full-width Add to bag / Buy now; `min-w-0` on grid columns (fixed Swiper runaway height).
- Audit: 19 routes × 10 widths, 0 overflow issues.

### 2026-09-27 — Web rebuild ("complete & beautiful")
- New design system in `web/src/index.css` + `components/ui/*`; Playfair Display + Inter fonts; logo used in header/footer/favicon.
- New pages: `/combos`, `/combos/:id`, `/auth/callback`, `/help/:topic`, designed 404.
- Rewritten: Home, Products (sort, price, in-stock, infinite "load more"), ProductDetail, Login/Signup/Forgot (AuthShell), Orders, Wishlist, Wallet, LoyaltyCard, Header, Footer, CartDrawer, MobileNav.
- Backend: `GET /api/products` returns `total/page/limit/has_more`; combos purchasable at checkout (`expandComboCartRows`); `order_items.combo_id` migration; fixed SQL error in combo detail (`json_agg … ORDER BY` inside aggregate).
- Removed leftover Vite template CSS and `hero.png`; added `logo.png` (192 px) and `public/favicon.png`.

### 2026-09-27 — Security & money-logic hardening (backend)
- Quantity, payment-method, address-ownership, variant validation in `placeOrder`; ROLLBACK on every early exit.
- Coupons locked + per-user limit + user binding; referral reward `FOR UPDATE SKIP LOCKED`; birthday discount once per year and DOB must be ≥30 days old.
- Loyalty/wallet debited at placement; `reverseOrderSideEffects` shared by customer + admin cancel; Razorpay refund with wallet fallback.
- OTP: attempt counter, timing-safe compare, TTL param honoured, dev bypass only with `ALLOW_DEV_OTP`.
- Auth middleware reloads user from DB each request; admin routes: everything not permission-gated is super-admin only; user/admin delete refused when order history exists.
- Spin wheel & scratch card require JWT, ignore body identity, enforce cooldown/daily cap; prize coupons single-use.
- Uploads: MIME→extension, magic-byte check; `/uploads` nosniff + sandbox CSP.
- Rate limiting (`express-rate-limit`), unhandled-rejection handler, production CORS strictness, error message hiding.
- Twilio config key fix (`whatsappFrom`), forgot-password now sends WhatsApp, Google OAuth verified-email check + fragment token.
- Profile: phone change needs OTP, DOB set once. Mobile: reward calls send JWT, removed hard-coded Razorpay key.
- **Store Intelligence & Operations Dashboard (Dashboard.jsx):** Completely redesigned from the old "Executive Operations Dashboard" into a clean, modern, and beautiful command center with **zero emojis**:
  - **Clean Header:** Replaced the generic title with "Store Intelligence & Operations", live pulse telemetry badge (`emerald-50`), quick `Today` | `Yesterday` switcher, and instant refresh.
  - **4 Expansive Hero Cards:** Balanced financial barometer (Total Gross Revenue, Today's Performance, Average Order Value, Registered Shoppers) with gradient top accent bands and verified metrics.
  - **Operational Dispatch Hub:** 4 high-contrast merchant action tiles (Pending Dispatch, Low Stock Guard, Customer Returns, Active Bag Carts) with 1-click CTA buttons.
  - **Sales Velocity & Lifecycle Split:** 30-Day Sales Velocity AreaChart with dark tooltip & volume metrics alongside an Order Lifecycle progress meter breakdown.
  - **3-Column Merchandising Intelligence:** Best-selling items ranking, Category revenue contribution bars, and Fashion style telemetry tabs (Sub-Category, Cut/Type, Pattern/Work).
  - **Customer Telemetry & Filterable Transactions Ledger:** Active logins, loaded carts, satisfaction rate, and a clean transactions table with search and status tabs (`all`, `pending`, `shipped`, `delivered`, `cancelled`).
- **Finance & Profit Analytics (FinancePage.jsx):** Completely modernized into an executive financial intelligence command center with **zero emojis**:
  - **Clean Header:** Commerce economics title with wallet badge, quick period selector pills (`All Time`, `This Month`, `Last Month`, `This Year`, `Custom`), CSV export, and instant refresh.
  - **4 Expansive Hero Cards:** Balanced financial matrix (Net Realized Profit, Gross Sales Revenue, Procurement Cost / COGS, Commercial Margin & Multiplier) with gradient top accent bands.
  - **Operational Safeguards Strip:** 4 clean metric tiles for Gross Profit pre-refund, Units Shipped, Approved Refund Deductions, and Sales-to-Cost Markup Multiple.
  - **12-Month Grouped BarChart:** Revenue vs Procurement Cost vs Gross Profit with custom dark tooltip formatted in INR and rounded bar caps.
  - **Product & Category Intelligence:** Side-by-side Top Profitable Products and Category Profit Margin bars, followed by dedicated interactive Buy Price inline editing table and category distribution ledger.
- **Inventory & Stock Intelligence (InventoryDashboard.jsx):** Completely modernized into an executive warehouse telemetry command center with **zero emojis**:
  - **Clean Header:** Warehouse telemetry title with warehouse badge, CSV export, and instant refresh.
  - **4 Expansive Hero Cards:** Retail Inventory Valuation, Healthy Supply, Restock Warning & Stockouts, and Total Physical Warehouse Volume with gradient top accent bands.
  - **Stock Health Quick Barometer Strip:** 4 actionable filter tiles (All Catalog Items, Zero Stock Out, Low Stock &lt;10, Healthy Supply 10+) with interactive 1-click filter states.
  - **Product Stock Ledger Table:** High-contrast ledger with product thumbnails, SKUs, category tags, stock status badges (`Out of Stock`, `X units left`, `X in stock`), unit price with strikethrough comparison, calculated inventory asset value, and 1-click product editor links.
  - **Stock by Department:** Visual distribution meters with physical unit counts, warehouse share percentage bars, active product counts, and 1-click category filter.
- **Return Settings & Abuse Controls:** Added a classic, professional centered popup modal in `admin/src/pages/settings/returns/ReturnSettings.jsx`. Designed with strict **Success Green** (`emerald`) and **Failed / Alert Red** (`rose`) themes:
  - **Success Green Theme:** When COD restriction is enabled or saved successfully, displays a vivid emerald ambient glow, emerald `ShieldCheck` icon, pulsing `SUCCESS — PROTECTION ACTIVE` badge, emerald details breakdown card, and emerald action button (`bg-emerald-600 hover:bg-emerald-700`).
  - **Failed / Paused Red Theme:** When restriction is disabled, paused, or fails to save on the server, displays a vivid rose ambient glow, rose `ShieldAlert` / `XCircle` icon, `FAILED / RESTRICTION PAUSED` or `UPDATE FAILED` badge, rose details card, and rose button (`bg-rose-600 hover:bg-rose-700`).
  - **Global Admin Toasts:** Configured `Toaster` in `admin/src/App.jsx` with dedicated success green (`#059669` / `#ecfdf5`) and error red (`#e11d48` / `#fff1f2`) styling.
- **Promotional Coupons Modal Overhaul:** Rebuilt the "Create / Edit Promotional Coupon" modal in `admin/src/pages/marketing/coupons/Coupons.jsx` to be non-confusing and intuitive. Replaced chaotic conditional shifting fields with a stable, logical 5-section layout:
  1. **Live Customer Ticket Mockup:** Real-time preview card at the top displaying the code, discount badge, cap, minimum order, and expiration countdown.
  2. **Coupon Code & 1-Click Presets:** Monospace code input with "Generate Random Code" and 4 quick presets (`WELCOME10`, `FESTIVE20`, `FLAT100`, `MEGA500`).
  3. **Stable Discount Grid:** Fixed 2-column cards for Percentage (%) vs Flat Rupee (₹), with clear explanation and dedicated Maximum Discount Cap input for percentage.
  4. **Cart Conditions & Quotas:** Minimum cart subtotal with quick pills (`None`, `₹499`, `₹999`, `₹1,499`), per-customer limits (`1`, `2`, `Unlimited`), storewide usage quota (`100`, `500`, `1,000`, `Unlimited`), and quick expiry buttons (`+7 Days`, `+30 Days`, `Never Expires`).
  5. **Live Status Switch:** Toggle between Active (redeemable at checkout) and Paused (saved as draft).
- **Product Catalog Cards:** Added 4 executive, easy-to-understand summary and health KPI cards above the table in `admin/src/pages/catalog/products/ProductList.jsx`:
  1. **Total Catalog Products:** Displays total active published items, total units in stock across departments, and acts as a 1-click reset to view all items.
  2. **Healthy Stock:** Emerald card highlighting items with 10+ units ready for immediate checkout & same-day packing, with 1-click filter.
  3. **Restock Attention Needed:** Amber/Rose alert card clearly surfacing items below 10 units and 0 stock (out-of-stock count + low stock count) to prevent lost sales, with 1-click filter.
  4. **Featured & Special Offers:** Violet card highlighting promotional merchandise (trending styles + special offers), with 1-click filter.
  - Backend `product.controller.js` upgraded with PostgreSQL `FILTER (WHERE ...)` real-time stats aggregation and query support for `featured`, `offer`, and `stock_status` (`in_stock`, `low`, `out`, `restock`).
- **Promotional Banners & Hero Sliders:** Modernized into an executive 2-column studio layout with an **exact mobile app preview**. Features a clean executive header, 4 clean white KPI cards (Total Banners, Active Live, Category Linked, Offer Badges), left-hand filters & banners ledger with 1-click active toggles and reordering, and a sticky right-hand smartphone preview with realistic dimensions (350×700px), Dynamic Island status bar, exact dark header (`#040d04`), dark search bar (`#000000`, `#1a1a1a`), category circles, and live `BannerCarousel` matching `HomeScreen.jsx` (2:1 aspect ratio, floating offer badge, dark gradient text overlay, and interactive dots row).
  - **Banner Artwork Studio Modal:** Replaced the plain, unstyled file input with an executive Artwork Upload Dropzone. Features dual modes ("Upload File" drag & drop or click-to-browse with dashed canvas + "Web URL" for direct image links), instant 16:6 aspect ratio live artwork preview with simulated title/subtitle/badge text overlay directly inside the card, file metadata badge (filename, size), one-click "Change" and "Remove" actions, and validation ensuring no empty banner is submitted without artwork.
- **Announcements & Top Header Ticker:** Completely modernized to be non-complicated and clean (no over-coloring or garish pastel gradients) with strictly **1 announcement active at a time** (enforced in backend controller + admin UI radio toggles). Features an executive header, 4 clean white KPI cards, compact studio controls, and an **exact mobile app preview** with authentic dimensions (350×700px), Dynamic Island status bar, exact dark header (`#040d04`), dark search bar (`#000000`, `#1a1a1a`), category circles, exact 32px continuous marquee `AnnouncementBar` positioned directly above the banner carousel, and bottom navigation tabs (`MainTabs.jsx`), plus an interactive `WelcomePopup` modal toggle.
  - **Centered Activation Success / Failed Modal:** Activating an announcement (e.g., `Activated "🎉 Buy 1 Get 1 Free on selecte..." as the single active ticker`) triggers an executive, centered popup modal in `Announcements.jsx`. Features strict dual themes: **Success Green** (`emerald-600`, glowing top bar, live colored ticker swatch card, enforcement policy breakdown, `bg-emerald-600` CTA) and **Failed / Paused Red** (`rose-600`, alert top bar, advisory breakdown, `bg-rose-600` CTA).
- **Birthday Rewards & Celebrations:** Rebuilt into a colorful, vibrant, and non-complicated interface. Features a rich gradient hero header (`pink → rose → orange`), 4 colorful KPI cards with gradient icon boxes, bulk "Wish All Today" dispatch, 1-click variable tags (`{name}`, `{discount}`, `{store_url}`), clean 2-column layout with WhatsApp mobile preview and step-by-step guidance, pink/rose celebrant avatar cards, and change-triggered blue Save button (`bg-blue-600 hover:bg-blue-700 text-white font-bold`).
- **WhatsApp Broadcast & Customer Engagement:** Fully modernized and made colorful and non-complicated. Features a radiant emerald/teal/cyan gradient hero header with live gateway status badge, 4 colorful KPI cards with gradient icon containers (Total Broadcasts, Reachable Shoppers, Cart Abandoners, Delivered Messages), guided 3-step composer (Audience selector with 1-click pills, 8 colorful template presets with badges, rich message copywriter with 1-click variables and quick emoji chips), authentic smartphone live WhatsApp preview with chat bubble, delivery history table with full message modal, and high-contrast CTA buttons.
- **Spin & Win Lucky Wheel:** Simplified from 5 complex tabs down to a clean, non-complicated 3-tab studio (Wheel Settings & Studio, Wheel Slices & Prizes, Winners History). Features 4 vibrant KPI cards, exact Dundu mobile app preview with realistic SVG 3D spinning wheel simulation, interactive test spin with live celebratory winner pop-in card, color-swatch slice cards with odds progress meters, zero emojis in text labels, and blue Save button (`bg-blue-600 hover:bg-blue-700 text-white font-bold`) conditionally displayed only when settings change (`isDirty`).
- **Festival Offers:** Simplified into a non-complicated 2-column studio layout (controls on left, exact Dundu mobile app preview on right). Features 1-click theme presets, live app header with announcement strip, dynamic island status bar, exact `FestivalPopupModal` simulation with toggle between Home Screen and Popup Offer, zero emojis in text labels, and blue Save button (`bg-blue-600 hover:bg-blue-700 text-white font-bold`) conditionally displayed only on changes (`isDirty`).
- **1st Purchase Offer & Tier Slabs:** Made colorful with distinct tier slab accents (Emerald, Indigo, Amber, Rose, Purple), interactive checkout simulator with cart range slider, and blue Save button (`bg-blue-600 hover:bg-blue-700 text-white font-bold`) conditionally displayed when changes are made (`isDirty`).
- **Scratch & Win Cards:** Fully modernized and made colorful with 4 vibrant metric KPI cards, rich gradient hero banner, colorful tabs, interactive smartphone preview featuring shimmering gold foil scratch card simulation, high-energy celebratory prize reveal, vibrant prize cards with pool probability meters, preset theme palettes in modal, and blue Save button displayed only on changes.
- **Daily Sales Report:** Modernized with 4 executive KPI cards, hourly sales Recharts BarChart, payment split, and top products table.
- **New Arrivals:** Clean full-width table with category filter pills, search, 3 KPI cards, 1-click toggle buttons.
- **Splash Screen:** Clean 2-column studio, simple toggles, color swatches + hex pickers, 4 duration buttons, live smartphone preview.
- **TopBar Popovers & Dropdown Theme:** Completely converted all TopBar popovers (Recent Orders, Active Customer Carts, Saved Wishlists, Customer Birthdays, Return Requests, and live order toast popup) from dark mode (`#0d0d0d` / `#0f172a`) to crisp, executive **Light Theme**. Features clean white container backgrounds (`#ffffff`), subtle borders (`#e2e8f0`), soft dropshadows (`0 20px 45px -10px rgba(0,0,0,0.14)`), deep slate titles and customer typography (`#0f172a`), muted subtext (`#64748b`), high-contrast colored count badges with pastel backgrounds, readable status pills (`pending`, `packed`, `shipped`, `delivered`, `cancelled`), and styled empty state icons.
- **Product Catalog Inside Scroll & Lazy Loading (ProductList.jsx):** Implemented an internal scrollable table container (`max-h-[calc(100vh-340px)]`, `min-h-[400px]`, `custom-table-scrollbar`) with sticky column headers (`sticky top-0 z-20 bg-slate-50`). Infinite query pagination is wired to an internal sentinel row (`<tr ref={loadMoreRef}>`) with `IntersectionObserver` scoped directly to the table container root (`rootMargin: '250px'`), paired with an `onScroll` threshold handler for rapid wheel flings. Added native `loading="lazy"` and `decoding="async"` on product images with graceful fallbacks. Filter and search updates automatically reset table scroll to top. Added real-time progress indicators in table header and footer.


---

## 10. Debugging cheat-sheet
| Symptom | Where to look |
|---|---|
| "relation … does not exist" / "column … does not exist" | Migrations run automatically at boot (`index.js`); if disabled, run `npm run migrate`. `initDb.js` also patches at boot |
| Every request 401 after login | JWT secret changed, or user `is_blocked`; check `auth.middleware.js` |
| Branch admin gets 403 on a page | Route is super-only in `routes/admin/index.js`; grant permission or accept |
| OTP never arrives | Twilio creds missing → mock mode logs to console; check `whatsapp.service.js` |
| Spin/scratch returns 401 on mobile | Component must send `Authorization` header (`authHeaders()`) |
| Product page grows to 33 million px | A grid column lost `min-w-0` around Swiper |
| Lint error "setState in effect" | Derive state or use React Query; see §3.1 |
| Combo edit broke carts | Slots are upserted by id (`syncSlots`); admin must send `slots[].id` for existing slots |
| Combo not purchasable | `combo_selections` must cover every slot with `requires_selection`; see `expandComboCartRows` |
| Customer paid but order still "pending" | Razorpay handler → `POST /orders/verify-payment`; if it failed, Order detail "Pay now" → `POST /orders/:id/pay` |
| "Invalid status transition" on an order | Cancelled/returned orders are terminal by design (`admin/orders/order.controller.js` updateStatus) |
| Refund happened twice? | Check `orders.razorpay_refund_id` / `payment_status='refunded'`; `reverseOrderSideEffects` skips when set |
| Points not restored after cancel | `orders.loyalty_points_earned` must be set at placement (COD) / verifyPayment (online) |
| Editing an item returns 404 "is in Trash" | Restore it from System → Trash first; the six admin routers block reads/edits of trashed rows |
| Deleted item still missing / "not found" after delete | It is in Trash (`deleted_at`). Restore from System → Trash or `POST /admin/trash/:type/:id/restore` |
| CORS error in browser | Origin not in `WEB_CLIENT_URL`/`ADMIN_CLIENT_URL`; in dev leave both unset to allow all |
