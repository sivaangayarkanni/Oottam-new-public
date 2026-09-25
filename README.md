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
| Planned | Razorpay (verified webhooks), Shiprocket, Cloudinary, Resend + WhatsApp, phone-OTP auth + guest checkout, admin roles (OWNER/STAFF), EN + TA, Vercel + Neon/Supabase |

### Module roadmap
1. **Foundation**: repo, schema, seed, read-only catalogue ✅
2. **Landing page + storefront** ✅
3. Cart, auth (phone OTP), guest checkout
4. Razorpay payments
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
| `/products/[slug]` | Product detail: poster, EN/TA names, flavour + size selector with price/MRP/discount/stock, disabled "Add to cart" (cart = Module 3), WhatsApp order link, description/ingredients/prep/nutrition with "details coming soon" fallbacks, SEO metadata + Product/Breadcrumb JSON-LD |
| `/policies/{privacy,terms,refunds,shipping}` | Stub policy pages ("content coming soon"), `noindex` |
| `/api/products` | JSON catalogue (`productCount`, `variantCount`, `samplePrices`, `products[]`) |
| `/catalogue` | 308 redirect to `/shop` (Module 1 page retired) |

### Front-end notes

- Design tokens (brand + per-family poster colours) live in `src/app/globals.css` (`@theme`). Fonts: **Baloo Thambi 2** (display, Latin + Tamil), **Nunito** (body), **Noto Sans Tamil** (Tamil text).
- Animations use `motion` (Framer Motion) scroll reveals plus a few CSS keyframes. All of them respect `prefers-reduced-motion`.
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
| `RAZORPAY_*`, `SHIPROCKET_*`, `CLOUDINARY_*`, `RESEND_API_KEY`, `OTP_HASH_SECRET` | later modules | Placeholders only |

The OWNER user is created **without a password**. Admins sign in with phone OTP (Module 3/5).

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

## Brand

- WhatsApp orders: +91 92455 37575 ([catalogue](https://wa.me/c/919245537575))
- FSSAI licence: 22425571000318
