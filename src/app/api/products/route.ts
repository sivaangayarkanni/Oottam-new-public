import { connection } from "next/server";
import { getCatalogue } from "@/lib/catalogue";

// GET /api/products – read-only catalogue JSON (categories → products → variants).
export async function GET() {
  await connection(); // always read fresh from the DB at request time
  try {
    const categories = await getCatalogue();
    const products = categories.flatMap((c) =>
      c.products.map((p) => ({
        id: p.id,
        slug: p.slug,
        category: { slug: c.slug, nameEn: c.nameEn, nameTa: c.nameTa },
        nameEn: p.nameEn,
        nameTa: p.nameTa,
        taglineEn: p.taglineEn,
        descriptionEn: p.descriptionEn,
        familyColor: p.familyColor,
        claims: p.claims,
        ingredientsEn: p.ingredientsEn,
        nutrition: p.nutrition,
        images: p.images.map((i) => ({ url: i.url, alt: i.alt, isPrimary: i.isPrimary })),
        variants: p.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          flavourEn: v.flavourEn,
          flavourTa: v.flavourTa,
          sizeGrams: v.sizeGrams,
          priceInPaise: v.priceInPaise,
          mrpInPaise: v.mrpInPaise,
          inStock: v.stock > 0,
          isSampleData: v.isSampleData,
        })),
      })),
    );
    const variantCount = products.reduce((n, p) => n + p.variants.length, 0);
    return Response.json({
      categories: categories.length,
      productCount: products.length,
      variantCount,
      samplePrices: products.some((p) => p.variants.some((v) => v.isSampleData)),
      products,
    });
  } catch (err) {
    console.error("GET /api/products failed", err);
    return Response.json({ error: "Failed to load products" }, { status: 500 });
  }
}
