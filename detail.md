# Dundu / Velora — Project Detail Reference

> **Purpose of this file**: a deep-dive knowledge base of the entire codebase so a future session can get oriented fast without re-exploring everything. `CLAUDE.md` has the authoritative dev-setup commands and top-level rules — **read that first**, this file goes deeper on structure, schema, and current state. Generated 2026-09-04 by exploring the full repo (4 parallel sub-agents covering backend/admin/web/mobile + manual inspection of root config, migrations, spec.md).

---

## 0. TL;DR Orientation

- **Product**: "Dundu" (formerly branded "Velora" — a rename is mid-flight, see [§8 Known Issues](#8-known-issues--wip-signals)) — an e-commerce platform for a clothing brand (women, kids, newborn, maternity).
- **Spec**: `spec.md` (274 lines) is the original short spec. The codebase has since grown **well beyond spec.md** with a full gamification/marketing layer (spin wheel, scratch cards, festival theming, first-purchase offers, combos) — see [§6](#6-features-beyond-specmd-gamification--marketing-layer).
- **Two independent systems, per `CLAUDE.md`**:
  - **Online** (built, this repo's main content): `web/` + `admin/` + `mobile/` + `backend/` (port 5000, db `velora_db`/`dundu_db`).
  - **Offline** (planned, **not yet created**): `dundu-offline/` with `super-admin/`, `branch-admin/`, `backend-offline/` (port 5001, db `dundu_offline`). Confirmed via Glob: **this directory does not exist in the repo yet.** The online backend's `1780700000000_split-offline-backend` migration already stripped all branch/POS columns out of the online DB in preparation for this split, and admin's `branchApi`/`salesApi` exist as read-only oversight hooks into the (not-yet-built) offline system.
- **Repo is mid-refactor**: huge numbers of `R`/`RM` renames in git status — pages/screens/controllers/routes were just reorganized from flat files into `<domain>/<feature>/` subfolders across admin, web, mobile, **and** backend. Lots of untracked new files = active feature development (gamification suite, combos).

---

## 1. Repo Layout

```
Dundu-Online/
├── CLAUDE.md            # authoritative dev setup & rules (READ FIRST)
├── spec.md              # original short spec (274 lines) — now partially superseded
├── docker-compose.yml   # postgres + backend + web + admin containers
├── .env.example         # compose-level env (ports, CORS origins, build-time vite vars)
├── admin/               # React + Tailwind admin panel (Vite, :3001)
├── web/                 # React customer storefront (Vite, :3000)
├── mobile/              # React Native (Expo SDK 54) customer + delivery app
├── backend/             # Node/Express API (:5000), shared by web/admin/mobile
└── (dundu-offline/)     # NOT YET CREATED — planned per CLAUDE.md
```

Root `README.md` is just a corrupted/placeholder title, not real docs — ignore it. `backend/README.md` is excellent and detailed (architecture, API catalog, "how to add a feature" guide) — treat it as the backend's own source of truth alongside this file.

---

## 2. Tech Stack (confirmed from package.json)

| App | Core deps |
|---|---|
| `backend/` | express, pg, node-pg-migrate, jsonwebtoken, bcryptjs, passport + passport-google-oauth20, express-validator, multer, cloudinary, razorpay, twilio, qrcode, helmet, cors, uuid |
| `admin/` | react, react-router-dom, @tanstack/react-query, axios, zustand, react-hook-form, react-hot-toast, recharts, lucide-react |
| `web/` | react, react-router-dom, @tanstack/react-query, axios, zustand, react-hook-form, react-hot-toast, swiper, lucide-react |
| `mobile/` | expo `~54.0.33`, react `19.1.0`, react-native `0.81.5` (newArchEnabled), @react-navigation/{native,native-stack,bottom-tabs} v7, zustand, axios, @react-native-async-storage/async-storage, expo-camera, expo-image-picker, react-native-svg, react-native-reanimated, react-native-webview |

**⚠️ Mobile quirk**: `mobile/AGENTS.md` (included via `mobile/CLAUDE.md` → `@AGENTS.md`) explicitly warns: *"Expo HAS CHANGED — read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code."* Always verify against Expo v54 docs rather than general/cached Expo knowledge.

---

## 3. Backend (`backend/`) — Deep Dive

### 3.1 Architecture pattern
Controller → Service → Route → Validator → Middleware, feature-subfoldered under `customer/` and `admin/` domains. Full tree is documented in `backend/README.md` §1 — don't duplicate it here, but the gist:

- `src/controllers/customer/{auth,cart,catalog,delivery,order,spinWheel,user}/`
- `src/controllers/admin/{analytics,catalog,marketing,orders,settings,users}/`
- `src/routes/customer/*.routes.js`, `src/routes/admin/{analytics,catalog,marketing,orders,settings,users}/`
- `src/middleware/{auth,role,error}/`
- `src/services/{otp,payment,whatsapp}/`
- `src/validators/*.validator.js`
- `src/config/{env,db,passport,cloudinary}.js`
- `src/database/initDb.js` — idempotent runtime schema patcher (see 3.3)

The old flat files (`src/controllers/*.controller.js`, `src/routes/*.js`, `src/routes/admin/*.js`, `src/middleware/*.js`, `src/services/*.service.js`) show as `deleted` in git status — this is a completed migration to the subfolder structure, not a mid-flight break.

### 3.2 Route inventory

Mounted at `/api` (`src/routes/index.js`):
- `/auth`, `/products`, `/categories`, `/combos`, `/cart`, `/orders`, `/users`, `/coupons`, `/loyalty`, `/delivery`, `/spin-wheel` → customer routes.
- `/admin` → entire admin sub-router (see below), gated by `authenticate` + `requireRole(['admin','super_admin'])`.
- Inline endpoints defined directly in `routes/index.js` (not their own route files): `GET /announcements`, `GET /settings/splash`, `GET /settings/payment`, `GET /home` (banners/categories/new-arrivals/trending/offers feed), `GET /festival/config`, `GET /first-purchase/config`, `GET /scratch-card/config`, `POST /scratch-card/reveal`, `GET /scratch-card/active-reward`.

Admin sub-router (`/api/admin/*`):
- **Analytics**: `/dashboard`, `/inventory`, `/insights`, `/reports` (perm `reports`)
- **Catalog**: `/products`, `/categories`, `/combos`, `/product-materials`, `/brands`, `/reviews`
- **Marketing**: `/announcements`, `/banners`, `/birthdays`, `/coupons`, `/loyalty` (perm `loyalty`), `/referral`, `/whatsapp`, `/spin-wheel`, `/festival`, `/first-purchase`, `/scratch-card`
- **Orders**: `/orders` (perm `orders`), `/returns` (perm `returns`), `/carts`, `/wishlists`
- **Users/Staff**: `/users`, `/admins`, `/delivery-staff`
- **Settings**: `/settings`, `/splash`

Full endpoint-level catalog with methods is in `backend/README.md` §4 — use that for exact verbs/paths.

### 3.3 Database schema

Two layers make up the *actual* live schema — neither alone is complete:

1. **Versioned migrations** (`backend/migrations/*.js`, `node-pg-migrate`, run via `npm run migrate`) — 32 files, chronological by timestamp prefix.
2. **`src/database/initDb.js`** — runs on every server boot, idempotent `CREATE TABLE IF NOT EXISTS`/`ADD COLUMN IF NOT EXISTS` for things not (yet) captured as real migrations.
3. **Controller-level lazy self-migration** — a few controllers create their own tables/columns on `require()`: `scratchCard.controller.js` (creates `scratch_card_prizes`, `scratch_card_logs`, `users.force_scratch_popup`/`last_scratch_at`), `user.controller.js` (`users.is_cod_blocked`), `report.controller.js` (`products.cost_price`, `order_items.cost_price`), `whatsapp.routes.js` (`whatsapp_logs`).

**⚠️ Anti-pattern to be aware of**: new schema changes have been going into `initDb.js` and controller-self-migration instead of `node-pg-migrate` migrations recently. If you add a column, check both `migrations/` AND `initDb.js` AND the relevant controller file before assuming a column doesn't exist.

#### Core tables (initial schema, `1715000000000`)
Enums: `user_role` (super_admin/admin/user, later + `delivery_staff`), `order_status` (pending→packed→shipped→delivered, +cancelled/returned, +`return_requested` added later via `initDb.js`), `payment_status`, `discount_type`, `return_status`.

`users`, `otps`, `categories`, `brands`, `products` (category_id/brand_id FKs, material/type/gender/age_group, price/offer_price/stock/sku, is_hidden/is_featured/is_offer_product), `product_variants` (size/color/stock/sku), `product_images` (url/is_primary/sort_order), `banners`, `addresses`, `coupons`, `cart`, `orders`, `order_items`, `return_requests`, `wishlists`, `reviews`, `notifications`.

#### Chronological feature additions (post-initial)
| Migration | Adds |
|---|---|
| `add-pos-columns` | `orders.is_pos_order`, `orders.customer_phone` (later dropped in offline-split) |
| `admin-reviews` | `reviews.user_id` nullable + `reviewer_name`/`is_admin_created` (admin-authored reviews) |
| `billing-customer-name` | `orders.customer_name` |
| `product-code` | `products.product_code` (unique) |
| `product-new-arrival` | `products.is_new_arrival` |
| `product-image-color` | `product_images.color` |
| `orders-user-id-nullable` | guest/POS orders allowed |
| `loyalty-cards` | **new table** `loyalty_cards` (phone unique, points, total_spent) — **phone-keyed, not `users.id`-keyed** |
| `announcements` | **new table** `announcements` (text/bg_color/text_color/is_active/sort_order); `show_popup`/`scheduled_time` added later via `initDb.js` |
| `settings` | **new table** `settings` (generic key/value) — becomes the backbone for referral %, spin wheel config, festival theme, first-purchase offer, scratch card config, birthday discount, payment/delivery config |
| `referral-system` (+ fix migration) | `users.referral_code`/`referred_by`; `referral_rewards` (reward_type referrer/referred, discount_percent, order_id FK — fixed int→uuid in follow-up) |
| `orders-loyalty-discount` | `orders.loyalty_discount` |
| `orders-courier-info` | `orders.courier_name`/`courier_tracking_number`/`courier_phone` |
| `stock-non-negative` | CHECK constraints on `products.stock`/`product_variants.stock` |
| `banner-badge`, `banner-badge-color` | `banners.badge_text`/`badge_active`/`badge_color` |
| `admin-permissions` | `users.permissions` (jsonb array); grandfathers branch admins to `["billing","orders","returns","loyalty","reports"]` |
| **`split-offline-backend`** | **Removes branch/POS data from online DB**: drops POS orders, branch-tied products/admins, `products.branch_id`, `orders.is_pos_order/branch_id/customer_name/customer_phone`, `users.branch_id`; **drops `branches` table entirely**. This is the seam where offline became a separate planned system. |
| `login-product-activity` | **new tables** `login_logs` (user_id, created_at), `product_views` (user_id, product_id, created_at) — feeds admin insights |
| `delivery-staff` | `user_role` enum +`delivery_staff`; `orders.delivery_qr_token` (unique), `picked_up_by`/`picked_up_at`, `delivered_by`/`delivery_completed_at` |
| `otps-identifier-unique` | `otps.identifier` gets a real UNIQUE constraint (was missing, broke the OTP upsert's `ON CONFLICT`) |

#### Spin Wheel — 7 chained migrations (`1781000000000`–`1781600000000`)
1. `spin-wheel` — `spin_wheel_segments` (label/type: coupon\|loyalty_points\|free_shipping\|no_prize/value/coupon_code/color/probability weight/is_active/sort_order), `spin_wheel_logs` (user_id or phone, segment_id FK, prize snapshot, coupon_code); seeds defaults + 6 segments.
2. `spin-wheel-user-targets` — `spin_wheel_segments.target_user_type` (all/new/existing/vip); `spin_wheel_user_targets` table for per-user forced/custom prizes.
3. `spin-wheel-timing-settings` — delay seconds, max spins/day, start/end time window (settings table).
4. `spin-wheel-user-permissions` — `users.spin_wheel_enabled` (per-user admin toggle).
5. `spin-wheel-time-slots` — require-login flag, time-slot mode (morning/evening/night/anytime).
6. `spin-wheel-force-popup` — `users.force_spin_popup`/`last_forced_popup_at` + global "force all" setting.
7. `spin-wheel-reward-redeem` — `spin_wheel_logs.is_redeemed`.

#### Combos — 2 newest migrations
- `combos` — `combos` (name/price/offer_price/image/stock/is_active), `combo_slots` (combo_id FK, slot_label, requires_selection), `combo_slot_products` (slot_id FK, product_id FK — the choices in that slot).
- `cart-combo-support` (**newest migration**) — `cart.combo_id` (FK), `cart.combo_selections` (jsonb array of `{slot_id, slot_label, product_id, variant_id, color, size}`); `cart.product_id` made nullable so combo-only lines don't need a plain product.

### 3.4 Services
- **`services/otp/otp.service.js`** — 6-digit OTP, stores in `otps` table, bypasses to `123456` outside production. **⚠️ Bug found**: this service queries columns `target`/`purpose` on `otps`, but the table (per all migrations + `initDb.js`) only has `identifier`/`otp`/`expires_at`/`is_used`. This will error at runtime unless there's an uncaptured schema change — **verify before relying on OTP flows**.
- **`services/payment/payment.service.js`** — Razorpay-only currently (order creation + HMAC verify). CLAUDE.md calls for a provider-swappable abstraction; not yet true — Cashfree/PhonePe are not implemented despite being named in spec.md and CLAUDE.md.
- **`services/whatsapp/whatsapp.service.js`** — Twilio wrapper, console-log mock fallback if creds absent. Covers OTP, order status messages, delivery OTP, and bulk broadcast.

### 3.5 Middleware & permissions
- `authenticate` (hard 401 if no/bad JWT) / `authenticateOptional` (attaches user if present, never rejects — used for spin wheel personalization).
- `requireRole(roles)`, `requirePermission(key)` — super_admin bypasses all permission checks; `admin` needs `key` present in their `users.permissions` jsonb array.
- `constants/permissions.js`: `ADMIN_PERMISSIONS = ['billing', 'orders', 'returns', 'loyalty', 'reports']` — the complete grantable permission set for branch admins.

### 3.6 App bootstrap (`backend/index.js`)
`helmet()` → `cors()` (allowlist from `env.corsOrigins`, else wildcard) → `express.json()`/`urlencoded()` → `passport.initialize()` → static `/uploads` → mount `/api` routes → `GET /health` → `globalError` handler last.
Startup: verifies DB connectivity (`SELECT 1`) → runs `initDb()` → listens. **Exits process on DB/initDb failure** — won't boot against an unmigrated/unreachable DB.

---

## 4. Admin Panel (`admin/`) — Deep Dive

- **Routing** (`App.jsx`): react-router + react-query + react-hot-toast. No `<ProtectedRoute>` component — instead every page is wrapped in `<Layout>`, and `Layout.jsx` itself does the auth gate (redirect to `/login` if no token). **Role-based route restriction is not enforced by the router**, only by hiding nav links (`Sidebar.jsx`) — a determined branch-admin could hit a super-only URL directly if the backend doesn't independently reject it (it generally does, via `requirePermission`).
- **Full route list**: `/`, `/finance`, `/products`, `/products/:id`, `/categories`, `/combos`, `/orders`, `/orders/:id`, `/returns`, `/users`, `/users/:id`, `/user-activity`, `/admins`, `/delivery-staff`, `/coupons`, `/banners`, `/carts`, `/wishlists`, `/reports/daily`, `/reviews`, `/new-arrivals`, `/loyalty`, `/announcements`, `/referral`, `/spin-wheel`, `/festival`, `/first-purchase`, `/scratch-card`, `/settings`, `/payment-methods`, `/delivery-settings`, `/return-settings`, `/insights/products`, `/whatsapp`, `/birthdays`, `/app-update`, `/inventory`, `/splash-config`, `*` (404).
- **Page tree**: `pages/<domain>/<feature>/File.jsx` — domains `auth`, `catalog` (incl. `combos`, `product-insights/tabs/{Overview,Categories,ProductDemand,Variants}Tab.jsx`), `common`, `dashboard`, `marketing` (incl. `festival`, `first-purchase`, `scratch-card`, `spin-wheel`), `orders`, `reports` (incl. new `finance`), `settings` (incl. new `delivery`, `payment-methods`, `returns`), `users`.
- **API layer** (`api/client.js` + `api/index.js`): axios, base `${VITE_API_BASE_URL}/api` or `/api`; token read from `dundu_admin_token` with fallback to legacy `velora_admin_token`; 401 clears both + hard-redirects to `/login`. Exported modules grouped by domain include the full gamification surface: `spinWheelApi`, `festivalApi`, `firstPurchaseApi`, `scratchCardApi` (each with config/settings/permission-rules/force-popup/logs), plus `comboApi`, `branchApi`/`salesApi` (read-only hooks into the not-yet-built offline system).
- **Auth store** (`store/auth.store.js`): `{user, token, isLoading}`; `fetchMe()` client-side-verifies role is admin/super_admin; `isSuperAdmin()`, `hasPermission(key)`. **⚠️ Bug**: `logout()` only clears `velora_admin_token`, not `dundu_admin_token` — inconsistent with the rest of the dual-key handling.
- **Layout**: `Layout.jsx` (auth gate + shell), `Sidebar.jsx` (nav groups with `superOnly` flag on whole groups or individual items, plus optional `permission` key for granular branch-admin access — only Finance/Loyalty Cards/Sales Report/Orders/Returns currently use `permission`), `TopBar.jsx` (live ops toolbar: birthday ticker, polling widgets for notifications/cart-monitor/wishlists/recent-orders/returns every 6s, new-order toast+chime).
- **UI kit** (`components/ui/`): Badge, Button, Input/Select/Textarea, Modal, NotificationModal (blocking confirm), ToastNotification (**a second, separate toast system alongside react-hot-toast** — worth consolidating eventually), StatCard, CategoryChips, ImageCropperModal (crop/zoom/rotate with live mobile-card preview), Spinner.
- **Utils**: `dirty.js` (`anyChanged()` — numeric-aware dirty-check for conditional Save buttons), `format.js` (INR price/date formatting, en-IN locale).

---

## 5. Web Storefront (`web/`) — Deep Dive

- **Routing** (`App.jsx`): react-router + react-query + react-hot-toast; `ScrollToTop` on navigation; global `<WelcomePopup>` + `<Layout>` wrap everything. `<ProtectedRoute>` component exists here (unlike admin/mobile) — redirects to `/login` with `state.from` if unauthenticated.
- **Public routes**: `/`, `/products`, `/products/:id` (remounts via `KeyedProductDetail` on id change), `/login`, `/signup`, `/forgot-password`, `/loyalty-card` (phone-lookup, works logged-out).
- **Protected routes**: `/checkout`, `/orders`, `/orders/:id`, `/orders/:id/return`, `/profile`, `/wishlist`. No dedicated 404 page — inline 404 JSX in `App.jsx`.
- **Page tree**: `pages/<domain>/<feature>/File.jsx` — `account/{loyalty-card,profile,wishlist}`, `auth/{forgot-password,login,signup}`, `checkout/checkout`, `home/home`, `orders/{order-detail,order-list,return-request}`, `products/{product-detail,product-list}`.
- **API layer**: same pattern as admin/mobile — token key `dundu_token` with `velora_token` legacy fallback (read-only). Exported modules: `authApi`, `homeApi`, `announcementApi`, `productApi`, `categoryApi`, `cartApi`, `orderApi`, `couponApi`, `loyaltyApi`, `referralApi`, `settingsApi`, `userApi`, and `spinWheelApi` (only `getActiveReward` is actually consumed — see below).
- **Stores** (Zustand): `auth.store.js`, `cart.store.js` (derives totals preferring `offer_price`), `settings.store.js` (offer badge colors).
- **Utils**: `razorpay.js` (lazy-load checkout.js + open modal), `format.js` (price/date/discount%).
- **Layout**: `Layout.jsx` (AnnouncementBar + Header + main + Footer + global CartDrawer + BirthdayPopup), `Header.jsx` (dark navbar, category circle strip incl. synthetic "Offers" bubble), `Footer.jsx`, `AnnouncementBar.jsx` (marquee), `WelcomePopup.jsx` (throttled via `localStorage['dundu_popup_last_shown']`).
- **Other components**: `auth/ProtectedRoute.jsx`, `cart/CartDrawer.jsx`, `product/ProductCard.jsx` (redirects unauthenticated add-to-cart/wishlist to `/login`, preserving `auth_redirect` in sessionStorage), `ui/BirthdayPopup.jsx` (per-day dismiss key, re-shows every 2 min until dismissed, auto-applies a birthday discount at checkout).
- **Gamification footprint on web is minimal**: only `spinWheelApi.getActiveReward()` is used (silently auto-applies an already-won spin-wheel coupon at checkout). **No spin-wheel/scratch-card/festival UI exists in `web/`** — those are mobile+admin only so far. If a future task is "bring gamification to web," this is the gap.
- Uses `swiper` for hero carousel (Home) and product gallery (ProductDetail) — not used elsewhere in the stack.

---

## 6. Mobile App (`mobile/`) — Deep Dive

- **Two completely separate navigation worlds from one root** (`AppNavigator.jsx`): after a config-driven `SplashScreen`, branches on `user?.role === 'delivery_staff'` → **`DeliveryNavigator`** (no tabs, no shopping UI: DeliveryHome → DeliveryScan (camera QR, fullscreen modal) → DeliveryOrder). Everyone else (**including guests**) → **`AppStack`** wrapping `MainTabs` (Home/Shop/Cart-with-badge/Profile) plus pushed screens, with a stack of always-mounted global overlay modals: LoginPromptModal, BirthdayPopupModal, SpinWheelModal, FestivalPopupModal, ScratchCardModal, FreeShippingModal, FestivalFallingGifts.
- No `<ProtectedRoute>` equivalent — protected screens (Checkout, Orders, Wishlist, Referral, LoyaltyCard, etc.) are just declared in the shared stack; gating is ad hoc per-action via `loginPrompt.store`.
- **Screen tree**: `screens/<domain>/<feature>/File.jsx` — `auth`, `checkout` (cart/checkout/payment/order-success), `combos` (**new**: ComboList/ComboDetail), `delivery` (home/order/scan), `home` (home/splash), `orders`, `policy` (6 static-content screens), `products`, `profile` (profile/wishlist/referral/notifications/loyalty-card). 28 screens across 8 domains.
- **API layer**: same 3-app pattern; token key `dundu_token`, legacy `velora_token` fallback; response interceptor auto-unwraps the backend's `{success,message,data}` envelope. Domain modules include `deliveryApi` (available/myOrders/pickup/resendOtp/complete) and `festivalApi.getConfig`.
- **Stores** (Zustand, no persist middleware — AsyncStorage handled manually): `auth.store.js` (registers itself as the 401-logout callback into `api/client.js`), `cart.store.js` (handles both plain products and combo line items in totals; triggers free-shipping nudge when cart total is between 0 and 500), `settings.store.js` (full festival-theme state + popup config, refetched on every app-foreground), `loginPrompt.store.js`, and 3 **new/untracked** stores: `freeShipping.store.js`, `scratchCard.store.js`, `spinWheel.store.js` (has a `forceTriggerCount` counter to force-relaunch the wheel).
- **Config** (`src/config.js`): `API_URL`/`UPLOADS_URL` from `EXPO_PUBLIC_*` env vars, **falls back to a hardcoded dev LAN IP** (`192.168.31.134`) — must be overridden via `.env` for any other machine/deployment.
- **`app.json`**: name/slug `Dundu`/`dundu`, `newArchEnabled: true`, camera permission scoped specifically to delivery QR-scan ("Delivery staff use the camera to scan hub pickup QR codes").
- **New/untracked gamification components** (`components/ui/`): `FestivalFallingGifts.jsx` (decorative), `FestivalPopupModal.jsx`, `FreeShippingModal.jsx`, `FreeShippingNudgeBanner.jsx` (threshold 500), `ScratchCardModal.jsx` (svg + PanResponder scratch gesture), `SpinWheelModal.jsx` (svg wheel, force-trigger aware, AppState-aware). Plus existing: `AppHeader`, `AnnouncementBar`, `CategoryStrip`, `PhoneInput` (+91-only), `LoginPromptModal`, `BirthdayPopupModal`, `WelcomePopup`.
- Mobile is the **most fully-built gamification surface** of the three frontends — it has all 4 new marketing mechanics wired with dedicated stores/components; web only passively consumes the spin-wheel's *result*; admin has full config UI for all of them.

---

## 7. Docker / Deployment

`docker-compose.yml` runs **postgres + backend + web + admin** only. `mobile/` ships via Expo/EAS; `dundu-offline/` (once built) will be a fully separate deployment — neither is part of this compose stack. nginx fronts each frontend container, proxying `/api` and `/uploads` to the backend container so no CORS setup is needed for a same-origin deploy. Config split: `.env` (compose-level: DB creds, ports, CORS origins, build-time Vite vars) vs `backend/.env` (app secrets: JWT, Razorpay, Twilio, Cloudinary, Google). `docker compose exec backend npm run migrate` must be run manually after first boot and after any new migration — compose does **not** auto-migrate.

---

## 8. Known Issues / WIP Signals

Worth checking/fixing before they bite:

1. **Brand rename Velora → Dundu is mid-flight everywhere.** All three frontends (`admin`, `web`, `mobile`) read the *new* localStorage/AsyncStorage token key (`dundu_*_token`) with a fallback read of the *old* key (`velora_*_token`), but only ever *write* the new key. Backend DB is still `velora_db`/`dundu_db` depending on which `.env` you're looking at (`CLAUDE.md` says `velora_db`, `backend/README.md` example says `dundu_db`) — confirm the actual DB name in use before assuming either.
2. **`admin/src/store/auth.store.js` `logout()` bug**: only clears `velora_admin_token`, leaves `dundu_admin_token` behind — a logged-out admin session may still look authenticated on next load. Small, easy fix if picked up.
3. **`backend/src/services/otp/otp.service.js` likely broken**: queries `target`/`purpose` columns on `otps` that don't exist in any migration or in `initDb.js` (which only defines `identifier`/`otp`/`expires_at`/`is_used`). Verify OTP login/signup actually works before building on it, or find the missing schema change.
4. **Payment abstraction incomplete**: CLAUDE.md/spec.md call for Razorpay/Cashfree/PhonePe behind a common interface; only Razorpay is implemented in `services/payment/`.
5. **Schema is split across 3 places** (versioned migrations, `initDb.js`, controller-level lazy `CREATE TABLE IF NOT EXISTS`) — always grep all three before concluding a column/table doesn't exist. Newer features (scratch card, several loose columns) skipped `node-pg-migrate` entirely.
6. **Two toast systems coexist in `admin/`**: `react-hot-toast` (used in `App.jsx`) and a custom `ToastNotification.jsx`/`useToasts()` — pick one when doing cleanup work there.
7. **`mobile/src/config.js`** falls back to a hardcoded personal dev LAN IP if `EXPO_PUBLIC_API_URL` isn't set — fine for the original dev's machine, breaks for anyone else. Always set `.env` for mobile work.
8. **Admin has no router-level role gating** — only nav-hiding + backend permission checks. Not a security hole (backend enforces it) but means a super-only *page* could partially render for a branch admin who navigates there directly, until an API call 403s.

---

## 9. Features Beyond `spec.md` (Gamification & Marketing Layer)

None of the following are in `spec.md`; they've been built on top of the generic `settings` key/value table (§3.3) plus dedicated tables where noted. This is the main "new" surface area of the project relative to the original spec:

| Feature | Backend | Admin config | Mobile UX | Web UX |
|---|---|---|---|---|
| **Spin Wheel** ("Spin & Win") | Full: 7 migrations, weighted segments, per-user targeting (new/existing/VIP), time-slot/day windows, per-user enable/disable, forced-popup override, redemption tracking | Full CRUD + settings + permission rules + force-popup + logs | Full: `SpinWheelModal.jsx` + dedicated store, force-trigger support | Passive only — auto-applies an already-won reward at checkout |
| **Scratch Card** ("Scratch & Win") | Own prize pool + log table (self-migrated in controller, not versioned), min-order/eligibility rules, cooldown, date window, forced popup | Full CRUD + settings + permission rules + force-popup + logs | Full: `ScratchCardModal.jsx` (svg + gesture) + store | None |
| **Festival theme** | Settings-table only: seasonal name/emoji/colors/logo/banner text + optional popup w/ coupon | Config page | Full: theme colors on `settings.store`, `FestivalPopupModal`, `FestivalFallingGifts` decorative overlay, nav re-themes | None |
| **First Purchase Offer** | Settings-table only: flat discount or order-value slabs, auto-apply/coupon | Config page | Not explicitly found as a distinct UI (likely folds into checkout discount logic) | Not explicitly found |
| **Birthday campaign** | Reads `users.date_of_birth`, 7-day-ahead lookup, templated WhatsApp send (1 or bulk), configurable discount % | Birthdays page (ticker in TopBar too) | `BirthdayPopupModal.jsx` | `BirthdayPopup.jsx` (per-day dismiss, auto-discount) |
| **Free Shipping nudge** | Presumably a settings threshold (₹500 seen in mobile) | — (check Settings/Delivery pages) | `FreeShippingModal.jsx` + `FreeShippingNudgeBanner.jsx` + store, triggered when cart total is 0–500 | Not found |
| **Combos** (product bundles) | Full: `combos`/`combo_slots`/`combo_slot_products` tables, cart line-item support (`cart.combo_id`/`combo_selections`) | Full CRUD (`catalog/combos`) | Full: `ComboListScreen`/`ComboDetailScreen`, `comboApi` | Not found — likely a web gap |

**Practical implication**: if asked to "add gamification to web" or "finish the first-purchase offer," start by checking whether the admin config + backend already exist (they likely do) and you just need the consuming UI.

---

## 10. Quick Reference — Where Things Live

- Need to add a backend endpoint? → follow `backend/README.md` §5 (validator → controller → route → mount).
- Need to check what an admin permission gates? → `backend/src/constants/permissions.js` + `middleware/role/role.middleware.js`.
- Need the exact DB shape of a table? → check migrations first (`backend/migrations/`, sorted by filename timestamp), then `src/database/initDb.js`, then grep the relevant controller for `CREATE TABLE IF NOT EXISTS`.
- Need to know an admin page's route? → `admin/src/App.jsx`.
- Need a web/mobile store's shape? → `web/src/store/*.js` or `mobile/src/store/*.js` (Zustand, small files, quick to read directly).
- Building the offline system? → it doesn't exist yet; re-read `CLAUDE.md`'s Offline row and the `split-offline-backend` migration for what was deliberately excluded from the online DB.
