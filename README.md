# Oottam Store (ஊட்டம்)

E-commerce store for **Oottam – "Instant and Healthy"** South Indian breakfast mixes
(Natural · No Preservative · No Added Colors · FSSAI Lic. 22425571000318).

> ## ⚠️ SAMPLE PRICES – replace before launch
> All pack sizes (`sizeGrams`) and prices (`priceInPaise`, `mrpInPaise`) and stock levels in
> `prisma/seed.ts` are **placeholders**. Every seeded variant has `isSampleData = true`, and the
> catalogue page shows a warning banner while any sample variant exists.
> Ingredients, preparation steps and nutrition facts are intentionally **null** until the brand supplies real values. Do not make them up.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Tailwind CSS v4, ESLint, `src/` dir) |
| Database | PostgreSQL via Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`) |
| Auth | Phone OTP (+91) with pluggable SMS provider, DB-backed revocable sessions |
| Validation / tests | zod · Vitest (unit + Postgres integration) |
| Planned | Razorpay (verified webhooks), Shiprocket, Cloudinary, Resend + WhatsApp, admin roles (OWNER/STAFF), EN + TA, Vercel + Neon/Supabase |

### Module roadmap
1. **Foundation**: repo, schema, seed, read-only catalogue ✅
2. **Landing page + storefront** ✅
3. **Cart, phone-OTP login, address book, checkout** ✅
4. **Payments: direct UPI with manual verification** ✅ (Razorpay can be added later as another provider)
5. Admin panel
6. Shipping + notifications
7. Security hardening + go live

## Getting started

Requirements: Node.js ≥ 20.9, PostgreSQL 14+.

```bash
npm install                 # also runs `prisma generate` (postinstall)
cp .env.example .env        # then edit DATABASE_URL and SEED_OWNER_*
npm run db:migrate          # apply migrations (dev)
npm run db:seed             # load categories, products, variants, OWNER user
npm run dev                 # http://localhost:3000
```

### Routes

| Route | What it is |
|---|---|
| `/` | Storytelling landing page, guided by the Oottam chef mascot: hero → problem → solution → how it works → range (from DB) → why trust us → Paarambariyam heritage → reviews (approved only, hidden when none) → final CTA |
| `/shop` | Product grid from the DB. Filters: `?category=rava-dosa-mix\|adai-mix\|pongal-mix\|paarambariyam`, `?tag=millet\|greens\|traditional`, `?sort=price-asc\|price-desc` (server-rendered links, no client JS needed) |
| `/products/[slug]` | Product detail: poster, EN/TA names, flavour + size selector with price/MRP/discount/stock, quantity + **Add to cart** (opens the cart drawer), WhatsApp order link, description/ingredients/prep/nutrition with "details coming soon" fallbacks, SEO metadata + Product/Breadcrumb JSON-LD |
| `/cart` | Full cart page (quantity, remove, stock warnings, delivery estimate). The header cart icon opens a slide-out drawer with a live count |
| `/login` | Phone OTP login (+91): enter mobile → 6-digit code → verify. `?next=` (same-site paths only) |
| `/account` | Profile (name/email), address book (add/edit/delete/default) and "My orders". Protected |
| `/account/welcome` | Optional name/email capture after first login |
| `/account/addresses/new`, `/account/addresses/[id]` | Address form (zod-validated) |
| `/checkout` | Guest (phone + address) or logged-in (saved addresses) checkout, coupon, server-computed totals, payment placeholder, optional COD |
| `/orders/[orderNumber]` | Order confirmation / details. Visible to the order's owner, OWNER/STAFF, or a guest holding the signed `?t=` link. Shows **Awaiting payment** (dynamic UPI QR + UTR form), **Verifying payment** or **Paid**. `?placed=1` shows confetti (skipped for reduced motion) |
| `/admin/payments` | OWNER/STAFF only (404 for everyone else): verify submitted UPI payments (confirm / reject), customers yet to pay, recent decisions |
| `/policies/{privacy,terms,refunds,shipping}` | Stub policy pages ("content coming soon"), `noindex` |
| `/api/products` | JSON catalogue (`productCount`, `variantCount`, `samplePrices`, `products[]`) |
| `/catalogue` | 308 redirect to `/shop` (Module 1 page retired) |

### Front-end notes

- Design tokens (brand + per-family poster colours) live in `src/app/globals.css` (`@theme`). Fonts: **Baloo Thambi 2** (display, Latin + Tamil), **Nunito** (body), **Noto Sans Tamil** (Tamil text).
- Animations use `motion` (Framer Motion) plus a few CSS keyframes. All of them respect `prefers-reduced-motion`. Scroll-linked effects only animate `transform`/`opacity`:
  - **Scroll progress bar** in the six pack colours (`components/scroll/scroll-progress.tsx`).
  - **Hero parallax**: pack posters float in layers at different scroll speeds, with idle floating and a waving mascot (`landing/hero-visual.tsx`).
  - **Mascot guide**: a mini mascot follows the reader, and its speech bubble changes per section via `data-guide` attributes in `app/page.tsx`. It doubles as a back-to-top button (`scroll/mascot-guide.tsx`).
  - **Pinned scrollytelling** (`landing/story-scroll.tsx`): pain points appear then scatter, a cream wipe opens from the mascot, and the scene becomes the solution with the promises. Under reduced motion a static Problem + Solution pair is shown instead (pure CSS `motion-reduce:` switch).
  - **Mix/Pour/Cook** steps reveal one by one with a self-drawing connector.
  - **Range deck** (`landing/range-deck.tsx`): cards start as a fanned deck and deal into the grid as the section scrolls in (sm+; mobile gets a native swipe row).
  - **Tilt + flip cards** (`components/cards/`): 3D hover tilt with glare, and a flip `<button aria-pressed>` that reveals the flavour list. The hidden face is `inert`, and focus moves to the visible face. Used on the landing page and `/shop`.
  - **Horizontal heritage journey** (`landing/heritage-horizontal.tsx`): the section is pinned and vertical scroll drives a horizontal track (md+ with motion). Mobile or reduced motion gets a native swipe row or grid.
  - **Magnetic CTA buttons** (`scroll/magnetic.tsx`) and a subtle brand marquee.
  - Note: scroll progress values are passed through a function `useTransform` to opt out of motion's native ScrollTimeline acceleration, which mis-handled keyframe ranges that don't span 0 to 1 (values faded back out).
- Mascot cut-outs (`public/images/mascot/`) were cropped from the posters and background-removed with `rembg` (isnet-general-use). `oottam-chef-rounded.png` is a plain rounded crop fallback. The source is only ~225×296 px, so a high-resolution mascot file from the brand would look sharper.
- The site-wide "sample values" banner is data-driven: it disappears automatically once no active variant has `isSampleData = true`.
- Product JSON-LD **omits `offers` while prices are sample data**, so placeholder prices are never published to search engines.
- `Product.tags` (`millet`, `greens`, `traditional`) power the shop filters.

### Local PostgreSQL quick setup (Debian/Ubuntu)

```bash
sudo apt-get install -y postgresql
sudo service postgresql start
sudo -u postgres psql -c "CREATE ROLE oottam LOGIN PASSWORD 'change-me' CREATEDB;" \
                      -c "CREATE DATABASE oottam OWNER oottam;"
# DATABASE_URL="postgresql://oottam:change-me@localhost:5432/oottam?schema=public"
```

## Module 3: cart, login & checkout

Business logic lives in framework-free services under `src/lib/` (they take the Prisma client as a parameter, so the
same code runs in Server Actions and in tests). Next.js glue (cookies, headers) is in `src/server/`, Server Actions in
`src/app/actions/`.

| File | Responsibility |
|---|---|
| `lib/pricing.ts` | Pure maths: subtotal, coupon evaluation (PERCENT with cap / FLAT, min order, dates, total + per-customer limits), delivery fee, totals. All integer paise; prices are GST-inclusive so `tax = 0` |
| `lib/cart.ts` | Cart read model (live DB prices, stock issues), add/set/remove with stock + 10-per-line clamp, guest→user merge |
| `lib/orders.ts` | `quoteCheckout`, `placeOrder` (one transaction), `releaseExpiredOrders` |
| `lib/otp.ts`, `lib/sms/` | OTP generation/hash/verify/rate-limits; pluggable SMS provider |
| `lib/session.ts` | DB sessions (create / find / revoke / revoke-all) |
| `lib/validation.ts` | zod schemas: phone, address (Indian states/UTs list), profile, checkout, coupon code, safe `next` redirect |
| `lib/tokens.ts` | HMAC signing (cart cookie, guest order links), constant-time compare |
| `src/proxy.ts` | Optimistic redirect of `/account/**` and `/admin/**` to `/login?next=…` when there's no session cookie |

### Flows

- **Cart**: guests get an `oottam_cart` cookie (`<random token>.<HMAC>`; httpOnly, `Secure` in production, SameSite=Lax,
  30 days) that maps to `Cart.guestToken`. Logged-in users have a DB cart. On login, the guest cart is merged into
  the user's cart (quantities summed, clamped to stock) and the cookie is dropped. The cart stores only variant ids +
  quantities; **every view and every order is re-priced from the database**.
- **Login**: `/login` → `requestOtpAction` → code sent via `SMS_PROVIDER` → `verifyOtpAction` → user upserted by phone,
  `phoneVerifiedAt` set, new session, guest cart merged, earlier guest orders with that (now verified) phone attached to
  the account → redirect to `next` (or `/account/welcome` the first time).
- **Checkout**: server renders a quote; coupon "Apply" re-quotes on the server. "Place order" posts an idempotency key
  plus the total the customer saw. `placeOrder` then, in **one transaction**:
  1. reads the cart; for each line runs `UPDATE "ProductVariant" SET stock = stock - q WHERE id = … AND stock >= q`
     (Postgres re-checks the condition after taking the row lock, so concurrent checkouts **cannot oversell**; lines are
     processed in a fixed order to avoid deadlocks);
  2. re-prices from the locked rows, validates the coupon and redeems it with a guarded `usedCount` increment;
  3. aborts with "prices changed" if the total differs from what the customer saw;
  4. allocates `OTM-YYYY-NNNNNN`, snapshots the address and item prices, creates the Order (`PENDING`) and a `Payment`
     row (`razorpay`, `CREATED`) for Module 4, and empties the cart.
  A repeated key returns the first order (`duplicate: true`) instead of creating another; a key reused by a different
  customer is rejected.
- **Payment**: placeholder ("Online payment connects in the next step"). **COD** is behind `FEATURE_COD` (default off);
  COD orders are created `CONFIRMED` with a `cod` payment row.
- **Unpaid orders**: `npm run orders:release-expired` (or `releaseExpiredOrders()` from code) cancels `PENDING`
  online orders older than `PENDING_ORDER_TTL_MINUTES` that have no authorised/captured payment, returns stock and
  coupon usage, marks the payment `FAILED/EXPIRED` and writes an `AuditLog`. It is idempotent and safe to run in
  parallel. **Schedule it every ~5 minutes** (Render/Railway cron job, GitHub Actions schedule or system cron).
- **Order page access**: owner of the order, OWNER/STAFF, or a guest with `?t=<HMAC(orderNumber)>` (sent in the
  post-checkout redirect). Anyone else gets a 404. The page sets `Referrer-Policy: same-origin` so the token isn't leaked.

### Security notes

- **OTP**: 6 digits from `crypto.randomInt`; only `HMAC-SHA256(OTP_HASH_SECRET, phone:code)` is stored; 5-minute
  expiry; 5 attempts per code (the attempt is counted atomically *before* comparing, so parallel guesses can't exceed
  it); single use; a new code invalidates older ones; `timingSafeEqual` comparison.
  Send limits: **per phone 1 per 30 s and 5 per hour; per IP 1 per 10 s and 10 per hour**, enforced from `OtpCode`
  rows under a Postgres advisory lock (no race). The code is **never** returned to the browser; the dev provider only
  logs it to the server console, and production refuses the dev provider unless `ALLOW_DEV_SMS_IN_PRODUCTION=true`.
- **Sessions**: cookie `oottam_session` = 256-bit random token (httpOnly, `Secure` in production, SameSite=Lax, 30 days);
  the DB stores only its SHA-256, so a DB leak doesn't leak sessions. A fresh session is issued on every login (the old
  one is revoked) and logout revokes it server-side. `revokeAllSessions(userId)` is ready for the admin panel.
  `requireUser()` in each protected page is the authoritative check; the proxy is only a fast redirect.
- **CSRF**: every mutation is a Server Action (POST). Next.js compares the `Origin` header with the `Host` and rejects
  cross-site calls; combined with SameSite=Lax cookies this is our CSRF protection. If the site is served behind a
  proxy on a different host, add it to `experimental.serverActions.allowedOrigins`. No mutating GET routes exist.
- **Input**: all inputs are validated with zod (phone, address incl. 6-digit PIN and state/UT list, profile, coupon,
  checkout). Address edits/deletes are scoped by `userId`. Post-login redirects accept same-site paths only.
- **Prices**: the client never sends prices; totals are computed on the server from DB rows inside the order transaction.

### Tests

`npm test` runs Vitest (53 tests in Module 3; 76 with Module 4):
- `tests/unit/pricing.test.ts`: fees, thresholds, percent/flat coupons, caps, dates, limits.
- `tests/unit/otp.test.ts`: OTP hashing, rate-limit window maths, SMS production guard, phone/address validation, safe redirects.
- `tests/integration/orders.test.ts` (Postgres): pricing + stock decrement + snapshots, **12 concurrent checkouts for 5
  units → exactly 5 orders**, rollback on partial stock, idempotency (incl. concurrent double submit), coupon usage
  limits, stale totals, expired-order stock release (run twice in parallel → released once), cart clamping.
- `tests/integration/auth.test.ts` (Postgres): OTP single use, expiry, attempt lockout (also under 20 parallel guesses),
  per-phone / per-IP rate limits, sessions + revocation, guest-cart merge.

Integration tests use `TEST_DATABASE_URL` (a separate database; migrations are applied automatically in
`tests/support/global-setup.ts`) and truncate its tables between tests.

### Hooks left for later modules

- **Module 4**: done as direct UPI, see below. Razorpay remains a provider value for later.
- **Module 5 (Admin)**: `revokeAllSessions`, `AuditLog`, coupons table (sample coupons are marked `[SAMPLE]`),
  `FEATURE_COD`, delivery-fee env vars.
- **Module 6 (Shipping/notifications)**: implement `msg91`/`twilio` in `src/lib/sms/index.ts` (interface `SmsProvider`),
  send order confirmations after `placeOrder`, create `Shipment` rows.

## Module 4: direct UPI payments (manual verification)

Online payment starts as **direct UPI to the shop's own UPI ID**. There is no payment gateway, so a person checks each
payment in the bank app and confirms it. The design keeps Razorpay as a drop-in later.

### Flow

1. **Checkout**: the "Pay by UPI" option (`ONLINE_PAYMENT_PROVIDER=upi`) places the order as `PENDING` with
   `paymentMethod=UPI`, a `Payment` row (`provider=upi`, `status=CREATED`, amount, snapshot of the UPI ID paid to) and
   `Order.paymentDueAt = now + UPI_PAYMENT_WINDOW_MINUTES` (default 24 h). Stock is reserved as before.
2. **Pay** (order page, `components/payments/upi-pay-panel.tsx`): a **per-order QR rendered on the server** (SVG, `qrcode`)
   for `upi://pay?pa=<UPI_VPA>&pn=<UPI_PAYEE_NAME>&am=<exact total>&cu=INR&tn=<order no.>&tr=<order no.>`. The amount is
   formatted from the order's stored `totalInPaise`, the same number the server charged. Also shown: a **"Pay ₹X with UPI
   app"** deep link (mobile only), the amount and order number in large type, the UPI ID with a **Copy** button, the
   alternate ID, and a collapsed **static QR fallback** (`public/images/payments/upi-static-qr.jpg`, with instructions
   to type the amount and the order number as the note).
3. **Submit UTR**: the customer enters the 12-digit UTR / UPI reference (spaces and dashes are ignored). The payment
   moves to `PENDING_VERIFICATION` and the page shows **Verifying payment** (it refreshes itself every 30 s).
   No screenshot upload.
4. **Verify** (`/admin/payments`): OWNER/STAFF see each submission (order, customer, phone, amount, UTR with Copy, time,
   UPI ID, items).
   - **Confirm payment** needs the tick box "I found ₹X with UTR … in the bank account". The payment becomes `CAPTURED`
     and the order `CONFIRMED`; the confirming user and time are stored (`Payment.verifiedById/verifiedAt`) and audited.
   - **Reject** needs a reason, which the customer sees, and one of two follow-ups:
     - *Ask to pay / re-enter*: a fresh `CREATED` attempt is opened and the payment window restarts.
     - *Cancel the order*: stock and coupon use are released.
5. **Customer sees Paid**, with the UTR and confirmation time.

### Rules and safeguards

- **State machine** (`lib/payments/upi.ts`): `CREATED → PENDING_VERIFICATION → CAPTURED | REJECTED`. Every transition locks
  the order row (`SELECT … FOR UPDATE`), so submit, confirm, reject and the expiry job can't interleave. Double confirm,
  confirm after expiry, and submitting twice are refused.
- **UTR**: exactly 12 digits; **unique across all orders** (DB unique index, also checked in the transaction, so two
  concurrent submissions of one UTR can't both win). A rejected UTR stays recorded and **can't be reused**.
- **Rate limit**: 5 UTR submissions per order and 15 per IP per hour (counted from `AuditLog`, including failed attempts).
- **Who can verify**: only active OWNER/STAFF, checked again in the service (not just the page). Customers, guests and
  inactive staff get `forbidden`.
- **Expiry** (`npm run orders:release-expired`): unpaid orders are released once `paymentDueAt` passes (UPI: 24 h by
  default; Razorpay/legacy rows: `PENDING_ORDER_TTL_MINUTES`). Orders with a **submitted UTR are never auto-cancelled**.
  Staff decide.
- **Audit log**: `payment.utr_submit_attempt`, `payment.utr_submitted`, `payment.upi_confirmed`, `payment.upi_rejected`,
  `order.cancelled_payment_rejected`, `order.expired_stock_released`.
- **Config, not code**: the UPI ID, alternate ID and payee name come from env (`UPI_VPA`, `UPI_VPA_ALT`, `UPI_PAYEE_NAME`).
  If they're missing, UPI is not offered at checkout.
- `UPI_INCLUDE_TR=false` drops the `tr` parameter. Some UPI apps are stricter about `tr` on personal (non-merchant) UPI
  IDs, so do a live ₹1 test with GPay, PhonePe and Paytm before launch.

### Adding Razorpay later

Each attempt is a `Payment` row with a `provider` (`upi` | `razorpay` | `cod`). `onlinePaymentProvider()` in
`lib/config.ts` picks the checkout method. For Razorpay:
- set `ONLINE_PAYMENT_PROVIDER=razorpay`;
- create the gateway order from the `CREATED` row;
- verify the signature/webhook and set `CAPTURED`, then `CONFIRMED`.

The order page already has an `awaitingRazorpay` branch, and the expiry job and `paymentView()` work for either provider.

### Tests

`npm test` now runs **76 tests**. New:
- `tests/unit/upi.test.ts`: amount formatting, URI building/encoding, `tr` toggle, UTR normalisation, `paymentView`,
  config parsing.
- `tests/integration/upi.test.ts` (Postgres):
  - QR amount equals the server order total;
  - full CREATED → VERIFYING → PAID path with audit;
  - double confirm; malformed and duplicate UTRs (including two concurrent submissions);
  - rate limit; unauthorised confirm (customer, anonymous, inactive staff);
  - reject → retry (new attempt, old UTR blocked, window reset) and reject → cancel (stock back);
  - expiry: unpaid released, submitted never released, fresh not yet released;
  - the expiry-vs-submit race; no confirming of expired orders.

## Environment variables

See `.env.example`. **Never commit `.env`** (it is git-ignored).

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `SEED_OWNER_PHONE` | for seed | E.164 phone of the initial OWNER admin (e.g. `+91XXXXXXXXXX`) |
| `SEED_OWNER_EMAIL` | for seed | Email of the initial OWNER admin |
| `SEED_OWNER_NAME` | no | Display name for the OWNER |
| `NEXT_PUBLIC_SITE_URL` | no | Public base URL |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | no | WhatsApp number for order links (`919245537575`) |
| `AUTH_SECRET` | **prod** | ≥32 random chars. Signs the guest-cart cookie and guest order links. (`openssl rand -base64 48`) |
| `OTP_HASH_SECRET` | **prod** | ≥32 random chars. HMAC key for stored OTP hashes |
| `SMS_PROVIDER` | **prod** | `dev` (console, default outside production) · `msg91` · `twilio` (stubs until Module 6 wiring) |
| `ALLOW_DEV_SMS_IN_PRODUCTION` | no | `true` lets a *local* production build use the console provider. **Never set on the live site** |
| `DELIVERY_FEE_PAISE` | no | Flat delivery fee (default `4900` = ₹49) |
| `FREE_DELIVERY_THRESHOLD_PAISE` | no | Free delivery when subtotal − discount ≥ this (default `49900` = ₹499; `0` = always free) |
| `FEATURE_COD` | no | `true` shows Cash on Delivery at checkout (default **off**) |
| `PENDING_ORDER_TTL_MINUTES` | no | How long unpaid **Razorpay** online orders hold stock (default `30`) |
| `ONLINE_PAYMENT_PROVIDER` | no | `upi` (default, direct UPI with manual verification) or `razorpay` (later) |
| `UPI_VPA` | for UPI | Shop UPI ID that customers pay to (e.g. `name@okhdfcbank`) |
| `UPI_VPA_ALT` | no | Alternate UPI ID for the same account, shown as a fallback |
| `UPI_PAYEE_NAME` | for UPI | Payee name in the UPI link (should match the bank account name) |
| `UPI_PAYMENT_WINDOW_MINUTES` | no | How long an unpaid UPI order holds stock (default `1440` = 24 h, minimum 5) |
| `UPI_INCLUDE_TR` | no | `false` omits the `tr` reference parameter from the UPI link (default `true`) |
| `TEST_DATABASE_URL` | tests | Separate database for integration tests (must differ from `DATABASE_URL`) |
| `RAZORPAY_*`, `SHIPROCKET_*`, `CLOUDINARY_*`, `RESEND_API_KEY` | later modules | Placeholders only |

In development `AUTH_SECRET`/`OTP_HASH_SECRET` fall back to a clearly-labelled dev value; **production refuses to start
auth without them**. The OWNER user is created **without a password** and signs in with phone OTP like everyone else.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run db:generate` | Generate Prisma client into `src/generated/prisma` (git-ignored) |
| `npm run db:migrate` | `prisma migrate dev` (create/apply migrations locally) |
| `npm run db:deploy` | `prisma migrate deploy` (production/CI) |
| `npm run db:seed` | Run `prisma/seed.ts` (idempotent, safe to re-run) |
| `npm run db:reset` | Drop, re-migrate and re-seed the local DB |
| `npm run db:studio` | Prisma Studio |
| `npm test` | Vitest: unit tests + Postgres integration tests (needs `TEST_DATABASE_URL`; migrations are applied to it automatically) |
| `npm run orders:release-expired` | Cancel unpaid online orders past their payment window and return their stock (never touches orders with a submitted UTR). Run from a cron every ~5 min |

## Schema overview (`prisma/schema.prisma`)

**All money is stored as integer paise** (₹1 = 100 paise). Never floats.

| Model | Purpose / notes |
|---|---|
| `User` | phone (unique, E.164), email (unique), name, `role` CUSTOMER / STAFF / OWNER, preferred locale |
| `Address` | Saved customer addresses (Indian PIN code), default flag |
| `Category` | Product families: Rava Dosa Mix, Adai Mix, Pongal Mix, Paarambariyam (EN/TA names) |
| `Product` | slug, `nameEn`/`nameTa`, descriptions, `familyColor`, `prepSteps` JSON, ingredients, `nutrition` JSON (nullable), claims, active/featured flags, SEO fields |
| `ProductImage` | Image URLs (local posters now, Cloudinary later via `publicId`) |
| `ProductVariant` | flavour (EN/TA), `sizeGrams`, unique `sku`, `priceInPaise`, `mrpInPaise`, stock, `isSampleData`; unique (product, flavour, size) |
| `Cart` / `CartItem` | User or guest (`guestToken`) carts, optional coupon; unique (cart, variant) |
| `Order` | `orderNumber` (unique), status PENDING → CONFIRMED → PACKED → SHIPPED → DELIVERED / CANCELLED / REFUNDED, payment method (RAZORPAY/COD), contact + **address snapshot JSON**, subtotal/discount/shipping/tax/total in paise, guest-friendly (`userId` nullable) |
| `OrderItem` | Immutable product/flavour/size/SKU/**price snapshot** |
| `Payment` | `razorpayOrderId` / `razorpayPaymentId` (unique), signature, status, amount/refunds, raw webhook payload, `lastWebhookEventId` for idempotency |
| `Coupon` | PERCENT / FLAT, caps, min order, usage limits, validity window |
| `Review` | 1–5 rating, moderation status, optional verified-purchase order link |
| `Shipment` | Shiprocket IDs, AWB, courier, tracking, status, raw payload |
| `AuditLog` | Who changed what (before/after JSON), IP, user agent |
| `OtpCode` | **Hashed** OTP codes with attempts/expiry per phone & purpose |
| `Session` | DB-backed login sessions: SHA-256 of the cookie token, expiry, last used, `revokedAt`, IP/UA |

`Order` also has `idempotencyKey` (unique; double-submit protection) and `stockReleasedAt`; order numbers come from
the Postgres sequence `order_number_seq` (`OTM-<year>-<6 digits>`).

## Seed data

`prisma/seed.ts` loads 4 categories, 6 products and 18 flavour variants:

| Product | Category | Flavours | Poster |
|---|---|---|---|
| Rava Dosa Mix (ரவா தோசை மிக்ஸ்) | Rava Dosa Mix | Multi Grain, Mudakathan, Murunga, Manathakkali, Thakkali, ABC | `public/images/posters/rava-dosa-mix-green.jpg` |
| Adai Mix (அடை மிக்ஸ்) | Adai Mix | Mudakathan, Murunga, Manathakkali, Thakkali, ABC | `adai-mix-purple.jpg` |
| Pongal Mix (பொங்கல் மிக்ஸ்) | Pongal Mix | Kuthiraivali, Varagu, Thinai, Multi Grain Rava | `pongal-mix-blue.jpg` |
| Pulusu Adai (புளுசு அடை) | Paarambariyam | Classic | `paarambariyam-pulusu-adai-teal.jpg` |
| Chekka (செக்க) | Paarambariyam | Classic | `paarambariyam-chekka-red.jpg` |
| Pulusu Vadai (புளுசு வடை) | Paarambariyam | Classic | `paarambariyam-pulusu-vadai-pink.jpg` |

Sample values used (**replace before launch**): 200 g packs; Rava Dosa ₹120 (MRP ₹140),
Adai ₹130 (MRP ₹150), Pongal ₹150 (MRP ₹170), Paarambariyam ₹140 (MRP ₹160); stock 50.

**Sample coupons** (description starts with `[SAMPLE]`; created once, never overwritten by re-seeding):
`WELCOME10` = 10% off, max ₹50, min order ₹199, once per customer, 1000 uses; `FLAT50` = ₹50 off orders ≥ ₹499, 500 uses.
Deactivate or edit them before launch.

## Brand

- WhatsApp orders: +91 92455 37575 ([catalogue](https://wa.me/c/919245537575))
- FSSAI licence: 22425571000318
