import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const productInclude = {
  category: true,
  images: { orderBy: { sortOrder: "asc" } },
  variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

/** Active categories → active products → active variants + images, in display order. */
export function getCatalogue() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
}

export type Catalogue = Awaited<ReturnType<typeof getCatalogue>>;

export type ShopSort = "featured" | "price-asc" | "price-desc";

/** Products for the storefront, filtered by category/tag and sorted by lowest variant price. */
export async function getShopProducts(opts: { category?: string; tag?: string; sort?: ShopSort } = {}) {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      category: { isActive: true, ...(opts.category ? { slug: opts.category } : {}) },
      ...(opts.tag ? { tags: { has: opts.tag } } : {}),
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: productInclude,
  });
  const withPrice = products
    .filter((p) => p.variants.length > 0)
    .map((p) => ({ ...p, ...priceRange(p) }));
  if (opts.sort === "price-asc") withPrice.sort((a, b) => a.minPrice - b.minPrice);
  if (opts.sort === "price-desc") withPrice.sort((a, b) => b.minPrice - a.minPrice);
  return withPrice;
}

export type ShopProduct = Awaited<ReturnType<typeof getShopProducts>>[number];

export function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true, category: { isActive: true } },
    include: productInclude,
  });
}

export function priceRange(p: { variants: { priceInPaise: number; mrpInPaise: number }[] }) {
  const prices = p.variants.map((v) => v.priceInPaise);
  const mrps = p.variants.map((v) => v.mrpInPaise);
  return {
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    minMrp: mrps.length ? Math.min(...mrps) : 0,
  };
}

/** Only APPROVED reviews are ever shown publicly. */
export function getApprovedReviews(limit = 6) {
  return prisma.review.findMany({
    where: { status: "APPROVED", product: { isActive: true } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { product: { select: { nameEn: true, slug: true } } },
  });
}

/** True while any active variant still carries placeholder (sample) pricing. */
export async function hasSamplePrices() {
  const count = await prisma.productVariant.count({ where: { isActive: true, isSampleData: true } });
  return count > 0;
}
