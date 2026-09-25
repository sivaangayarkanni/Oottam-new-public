import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { ChevronRight, Leaf, ShieldCheck, Sparkles } from "lucide-react";
import { getProductBySlug, getShopProducts } from "@/lib/catalogue";
import { SITE } from "@/lib/site";
import { VariantSelector } from "@/components/variant-selector";
import { ProductCard } from "@/components/product-card";
import { Mascot } from "@/components/mascot";

const loadProduct = cache((slug: string) => getProductBySlug(slug));

type PrepStep = { en: string; ta?: string };

function asPrepSteps(value: unknown): PrepStep[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is PrepStep => typeof s === "object" && s !== null && typeof (s as PrepStep).en === "string");
}

function asNutrition(value: unknown): [string, string][] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v)]);
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "Product not found" };
  const title = `${product.nameEn} (${product.nameTa ?? ""}) | Instant mix`;
  const description =
    product.descriptionEn ?? `${product.nameEn} by Oottam. ${SITE.tagline}. ${SITE.claims.join(", ")}.`;
  const image = product.images[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title, description, type: "website", images: image ? [{ url: image }] : undefined },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

function ComingSoon({ what }: { what: string }) {
  return (
    <p className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-ink/15 px-4 py-3 text-ink-soft">
      <Sparkles className="h-5 w-5 shrink-0 text-saffron" aria-hidden />
      {what} details coming soon.
    </p>
  );
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  await connection();
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const color = product.familyColor ?? "#f57c00";
  const image = product.images.find((i) => i.isPrimary) ?? product.images[0];
  const prepSteps = asPrepSteps(product.prepSteps);
  const nutrition = asNutrition(product.nutrition);
  const others = (await getShopProducts()).filter((p) => p.id !== product.id);
  const related = [
    ...others.filter((p) => p.categoryId === product.categoryId),
    ...others.filter((p) => p.categoryId !== product.categoryId),
  ].slice(0, 3);
  const isSample = product.variants.some((v) => v.isSampleData);

  const absolute = (path: string) => new URL(path, SITE.url).toString();
  const prices = product.variants.map((v) => v.priceInPaise / 100);
  const inStock = product.variants.some((v) => v.stock > 0);
  // Product JSON-LD. Offers are omitted while prices are sample data so placeholder prices never reach search engines.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.nameEn,
        alternateName: product.nameTa ?? undefined,
        description: product.descriptionEn ?? undefined,
        image: product.images.map((i) => absolute(i.url)),
        sku: product.variants[0]?.sku,
        category: product.category.nameEn,
        brand: { "@type": "Brand", name: SITE.name },
        url: absolute(`/products/${product.slug}`),
        ...(!isSample && prices.length
          ? {
              offers: {
                "@type": "AggregateOffer",
                priceCurrency: "INR",
                lowPrice: Math.min(...prices).toFixed(2),
                highPrice: Math.max(...prices).toFixed(2),
                offerCount: product.variants.length,
                availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absolute("/") },
          { "@type": "ListItem", position: 2, name: "Shop", item: absolute("/shop") },
          { "@type": "ListItem", position: 3, name: product.nameEn, item: absolute(`/products/${product.slug}`) },
        ],
      },
    ],
  };

  return (
    <main className="pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-soft">
            <li><Link href="/" className="hover:text-ink hover:underline">Home</Link></li>
            <li aria-hidden><ChevronRight className="h-4 w-4" /></li>
            <li><Link href="/shop" className="hover:text-ink hover:underline">Shop</Link></li>
            <li aria-hidden><ChevronRight className="h-4 w-4" /></li>
            <li>
              <Link href={`/shop?category=${product.category.slug}`} className="hover:text-ink hover:underline">
                {product.category.nameEn}
              </Link>
            </li>
            <li aria-hidden><ChevronRight className="h-4 w-4" /></li>
            <li aria-current="page" className="font-semibold text-ink">{product.nameEn}</li>
          </ol>
        </nav>
      </div>

      <div className="mx-auto mt-6 grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[2.5rem] p-4 sm:p-6" style={{ backgroundColor: color }}>
            {image && (
              <Image
                src={image.url}
                alt={image.alt ?? `${product.nameEn} poster`}
                width={1076}
                height={1600}
                sizes="(min-width: 1024px) 45vw, 95vw"
                className="mx-auto w-full max-w-md rounded-[1.75rem] shadow-2xl"
                preload
              />
            )}
          </div>
        </div>

        <div>
          <p className="inline-flex rounded-full px-3 py-1 text-sm font-bold text-white" style={{ backgroundColor: color }}>
            {product.category.nameEn}
          </p>
          <h1 className="mt-4 font-display text-5xl font-extrabold leading-none sm:text-6xl">{product.nameEn}</h1>
          {product.nameTa && (
            <p lang="ta" className="mt-2 font-tamil text-2xl font-semibold" style={{ color }}>
              {product.nameTa}
            </p>
          )}
          {product.taglineEn && <p className="mt-3 text-lg font-semibold text-ink-soft">{product.taglineEn}</p>}
          <ul className="mt-5 flex flex-wrap gap-2">
            {product.claims.map((c, i) => {
              const Icon = [Leaf, ShieldCheck, Sparkles][i % 3];
              return (
                <li key={c} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold ring-1 ring-ink/10">
                  <Icon className="h-4 w-4 text-leaf" aria-hidden /> {c}
                </li>
              );
            })}
          </ul>

          <div className="mt-8">
            <VariantSelector
              productName={product.nameEn}
              color={color}
              whatsappUrl={SITE.whatsappUrl}
              variants={product.variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                flavourEn: v.flavourEn,
                flavourTa: v.flavourTa,
                sizeGrams: v.sizeGrams,
                priceInPaise: v.priceInPaise,
                mrpInPaise: v.mrpInPaise,
                stock: v.stock,
                lowStockThreshold: v.lowStockThreshold,
              }))}
            />
          </div>

          <div className="mt-10 space-y-8">
            <section aria-labelledby="desc-h">
              <h2 id="desc-h" className="font-display text-2xl font-extrabold">About this mix</h2>
              <div className="mt-3">
                {product.descriptionEn ? <p className="text-lg text-ink-soft">{product.descriptionEn}</p> : <ComingSoon what="Product" />}
              </div>
            </section>
            <section aria-labelledby="ing-h">
              <h2 id="ing-h" className="font-display text-2xl font-extrabold">Ingredients</h2>
              <div className="mt-3">
                {product.ingredientsEn ? <p className="text-ink-soft">{product.ingredientsEn}</p> : <ComingSoon what="Ingredient" />}
              </div>
            </section>
            <section aria-labelledby="prep-h">
              <h2 id="prep-h" className="font-display text-2xl font-extrabold">How to prepare</h2>
              <div className="mt-3">
                {prepSteps.length > 0 ? (
                  <ol className="space-y-3">
                    {prepSteps.map((s, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-bold text-white" style={{ backgroundColor: color }}>
                          {i + 1}
                        </span>
                        <span className="pt-1 text-ink-soft">{s.en}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ComingSoon what="Preparation" />
                )}
              </div>
            </section>
            <section aria-labelledby="nut-h">
              <h2 id="nut-h" className="font-display text-2xl font-extrabold">Nutrition</h2>
              <div className="mt-3">
                {nutrition.length > 0 ? (
                  <table className="w-full overflow-hidden rounded-2xl bg-white text-left ring-1 ring-ink/10">
                    <tbody>
                      {nutrition.map(([k, v]) => (
                        <tr key={k} className="border-b border-ink/5 last:border-0">
                          <th scope="row" className="px-4 py-2 font-semibold">{k}</th>
                          <td className="px-4 py-2 text-ink-soft">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <ComingSoon what="Nutrition" />
                )}
              </div>
            </section>
            <p className="text-sm text-ink-soft">FSSAI Lic. No. {SITE.fssai}</p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-h" className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
          <div className="flex items-end gap-4">
            <Mascot size={70} animate="none" decorative />
            <h2 id="related-h" className="font-display text-3xl font-extrabold sm:text-4xl">You might also love</h2>
          </div>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <li key={p.id}><ProductCard product={p} /></li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
