/**
 * Oottam catalogue seed.
 *
 * ⚠️  SAMPLE PRICES – replace before launch.
 * Pack sizes (sizeGrams) and prices (priceInPaise / mrpInPaise) below are PLACEHOLDERS.
 * Every seeded variant is flagged with `isSampleData: true` so the admin panel / storefront
 * can warn until real values are entered. Nutrition facts and ingredients are intentionally
 * left null – never invent them.
 *
 * The seed is idempotent (upserts by slug / sku / phone) and safe to re-run.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { CouponType, PrismaClient, Role } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const CLAIMS = ["Natural", "No Preservative", "No Added Colors"];

// ── SAMPLE DATA: placeholder pack size & prices (in paise) per product family ──
const SAMPLE_SIZE_GRAMS = 200; // SAMPLE – real pack size unknown
const SAMPLE_PRICES: Record<string, { price: number; mrp: number }> = {
  "rava-dosa-mix": { price: 12000, mrp: 14000 }, // SAMPLE ₹120 / MRP ₹140
  "adai-mix": { price: 13000, mrp: 15000 }, // SAMPLE ₹130 / MRP ₹150
  "pongal-mix": { price: 15000, mrp: 17000 }, // SAMPLE ₹150 / MRP ₹170
  "pulusu-adai": { price: 14000, mrp: 16000 }, // SAMPLE
  chekka: { price: 14000, mrp: 16000 }, // SAMPLE
  "pulusu-vadai": { price: 14000, mrp: 16000 }, // SAMPLE
};
const SAMPLE_STOCK = 50; // SAMPLE

type Flavour = { code: string; en: string; ta: string };

const F = {
  MULTI_GRAIN: { code: "MG", en: "Multi Grain", ta: "மல்டி கிரைன்" },
  MUDAKATHAN: { code: "MDK", en: "Mudakathan", ta: "முடக்கத்தான்" },
  MURUNGA: { code: "MRG", en: "Murunga", ta: "முருங்கை" },
  MANATHAKKALI: { code: "MNT", en: "Manathakkali", ta: "மணத்தக்காளி" },
  THAKKALI: { code: "THK", en: "Thakkali", ta: "தக்காளி" },
  ABC: { code: "ABC", en: "ABC", ta: "ஏபிசி" },
  KUTHIRAIVALI: { code: "KTV", en: "Kuthiraivali", ta: "குதிரைவாலி" },
  VARAGU: { code: "VRG", en: "Varagu", ta: "வரகு" },
  THINAI: { code: "THN", en: "Thinai", ta: "திணை" },
  MULTI_GRAIN_RAVA: { code: "MGR", en: "Multi Grain Rava", ta: "மல்டி கிரைன் ரவா" },
  CLASSIC: { code: "CLS", en: "Classic", ta: "பாரம்பரிய" },
} satisfies Record<string, Flavour>;

const categories = [
  { slug: "rava-dosa-mix", nameEn: "Rava Dosa Mix", nameTa: "ரவா தோசை மிக்ஸ்", sortOrder: 1 },
  { slug: "adai-mix", nameEn: "Adai Mix", nameTa: "அடை மிக்ஸ்", sortOrder: 2 },
  { slug: "pongal-mix", nameEn: "Pongal Mix", nameTa: "பொங்கல் மிக்ஸ்", sortOrder: 3 },
  {
    slug: "paarambariyam",
    nameEn: "Paarambariyam",
    nameTa: "பாரம்பரியம்",
    descriptionEn: "Our traditional range.",
    sortOrder: 4,
  },
];

type ProductSeed = {
  slug: string;
  skuPrefix: string;
  categorySlug: string;
  nameEn: string;
  nameTa: string;
  familyColor: string;
  poster: string;
  flavours: Flavour[];
  descriptionEn: string;
  tags: string[]; // storefront filters: millet | greens | traditional
};

const products: ProductSeed[] = [
  {
    slug: "rava-dosa-mix",
    skuPrefix: "OTM-RDM",
    categorySlug: "rava-dosa-mix",
    nameEn: "Rava Dosa Mix",
    nameTa: "ரவா தோசை மிக்ஸ்",
    familyColor: "#2E7D32", // green poster
    poster: "/images/posters/rava-dosa-mix-green.jpg",
    tags: ["greens"],
    flavours: [F.MULTI_GRAIN, F.MUDAKATHAN, F.MURUNGA, F.MANATHAKKALI, F.THAKKALI, F.ABC],
    descriptionEn: "Instant rava dosa mix in six flavours. Natural, no preservative, no added colors.",
  },
  {
    slug: "adai-mix",
    skuPrefix: "OTM-ADM",
    categorySlug: "adai-mix",
    nameEn: "Adai Mix",
    nameTa: "அடை மிக்ஸ்",
    familyColor: "#6A1B9A", // purple poster
    poster: "/images/posters/adai-mix-purple.jpg",
    tags: ["greens"],
    flavours: [F.MUDAKATHAN, F.MURUNGA, F.MANATHAKKALI, F.THAKKALI, F.ABC],
    descriptionEn: "Instant adai mix in five flavours. Natural, no preservative, no added colors.",
  },
  {
    slug: "pongal-mix",
    skuPrefix: "OTM-PGM",
    categorySlug: "pongal-mix",
    nameEn: "Pongal Mix",
    nameTa: "பொங்கல் மிக்ஸ்",
    familyColor: "#1565C0", // blue poster
    poster: "/images/posters/pongal-mix-blue.jpg",
    tags: ["millet"],
    flavours: [F.KUTHIRAIVALI, F.VARAGU, F.THINAI, F.MULTI_GRAIN_RAVA],
    descriptionEn: "Instant millet pongal mix. Natural, no preservative, no added colors.",
  },
  {
    slug: "pulusu-adai",
    skuPrefix: "OTM-PAD",
    categorySlug: "paarambariyam",
    nameEn: "Pulusu Adai",
    nameTa: "புளுசு அடை",
    familyColor: "#00838F", // teal poster
    poster: "/images/posters/paarambariyam-pulusu-adai-teal.jpg",
    tags: ["traditional"],
    flavours: [F.CLASSIC],
    descriptionEn: "Traditional Pulusu Adai from our Paarambariyam range.",
  },
  {
    slug: "chekka",
    skuPrefix: "OTM-CHK",
    categorySlug: "paarambariyam",
    nameEn: "Chekka",
    nameTa: "செக்க",
    familyColor: "#C62828", // red poster
    poster: "/images/posters/paarambariyam-chekka-red.jpg",
    tags: ["traditional"],
    flavours: [F.CLASSIC],
    descriptionEn: "Traditional Chekka from our Paarambariyam range.",
  },
  {
    slug: "pulusu-vadai",
    skuPrefix: "OTM-PVD",
    categorySlug: "paarambariyam",
    nameEn: "Pulusu Vadai",
    nameTa: "புளுசு வடை",
    familyColor: "#C2185B", // pink poster
    poster: "/images/posters/paarambariyam-pulusu-vadai-pink.jpg",
    tags: ["traditional"],
    flavours: [F.CLASSIC],
    descriptionEn: "Traditional Pulusu Vadai from our Paarambariyam range.",
  },
];

async function seedCatalogue() {
  const categoryIds = new Map<string, string>();
  for (const c of categories) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
    categoryIds.set(c.slug, row.id);
  }

  let variantCount = 0;
  for (const [pIndex, p] of products.entries()) {
    const data = {
      categoryId: categoryIds.get(p.categorySlug)!,
      nameEn: p.nameEn,
      nameTa: p.nameTa,
      taglineEn: "Instant and Healthy",
      descriptionEn: p.descriptionEn,
      familyColor: p.familyColor,
      claims: CLAIMS,
      tags: p.tags,
      sortOrder: pIndex + 1,
      isActive: true,
      isFeatured: pIndex < 3,
      // TODO(brand): supply real ingredients, prep steps and lab-tested nutrition.
      // Left null on purpose – do not invent.
    };
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, ...data },
    });

    // Poster image (replace images on every run to stay idempotent)
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: p.poster,
        alt: `Oottam ${p.nameEn} poster`,
        isPrimary: true,
      },
    });

    const sample = SAMPLE_PRICES[p.slug];
    for (const [vIndex, f] of p.flavours.entries()) {
      const sku = `${p.skuPrefix}-${f.code}-${SAMPLE_SIZE_GRAMS}G`;
      const vData = {
        productId: product.id,
        flavourEn: f.en,
        flavourTa: f.ta,
        sizeGrams: SAMPLE_SIZE_GRAMS, // SAMPLE
        priceInPaise: sample.price, // SAMPLE PRICE
        mrpInPaise: sample.mrp, // SAMPLE PRICE
        stock: SAMPLE_STOCK, // SAMPLE
        isActive: true,
        isSampleData: true, // SAMPLE PRICES – replace before launch
        sortOrder: vIndex + 1,
      };
      await prisma.productVariant.upsert({
        where: { sku },
        update: vData,
        create: { sku, ...vData },
      });
      variantCount++;
    }
  }
  return { products: products.length, variants: variantCount };
}

async function seedOwner() {
  const phone = process.env.SEED_OWNER_PHONE?.trim();
  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const name = process.env.SEED_OWNER_NAME?.trim() || "Oottam Owner";
  if (!phone && !email) {
    console.warn("⚠️  SEED_OWNER_PHONE / SEED_OWNER_EMAIL not set – skipping OWNER user.");
    return null;
  }
  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error(`SEED_OWNER_PHONE must be E.164 (e.g. +91XXXXXXXXXX), got "${phone}"`);
  }
  // No password: admins sign in with phone OTP (module 3/5).
  const existing = await prisma.user.findFirst({
    where: { OR: [phone ? { phone } : {}, email ? { email } : {}].filter((w) => Object.keys(w).length) },
  });
  const data = { phone, email, name, role: Role.OWNER };
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data })
    : await prisma.user.create({ data });
  return user;
}

// ── SAMPLE coupons for testing checkout. Edit or deactivate (isActive=false) before launch. ──
const SAMPLE_COUPONS = [
  {
    code: "WELCOME10",
    description: "[SAMPLE] 10% off your first order, up to ₹50. Test coupon, review before launch.",
    type: CouponType.PERCENT,
    value: 10,
    maxDiscountInPaise: 5000,
    minOrderInPaise: 19900,
    perUserLimit: 1,
    usageLimit: 1000,
  },
  {
    code: "FLAT50",
    description: "[SAMPLE] ₹50 off orders of ₹499 or more. Test coupon, review before launch.",
    type: CouponType.FLAT,
    value: 5000,
    maxDiscountInPaise: null,
    minOrderInPaise: 49900,
    perUserLimit: null,
    usageLimit: 500,
  },
];

async function seedCoupons() {
  for (const c of SAMPLE_COUPONS) {
    // Only create; never overwrite usage counters or owner edits on re-seed.
    await prisma.coupon.upsert({ where: { code: c.code }, update: {}, create: { ...c, isActive: true } });
  }
  return SAMPLE_COUPONS.length;
}

async function main() {
  const counts = await seedCatalogue();
  const owner = await seedOwner();
  const coupons = await seedCoupons();
  console.log(
    `✅ Seeded ${categories.length} categories, ${counts.products} products, ${counts.variants} variants` +
      (owner ? `, OWNER user ${owner.id}` : "") +
      `, ${coupons} SAMPLE coupons (WELCOME10, FLAT50)`,
  );
  console.log("⚠️  SAMPLE PRICES – replace before launch (all variants have isSampleData=true).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
