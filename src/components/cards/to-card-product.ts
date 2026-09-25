import type { ShopProduct } from "@/lib/catalogue";
import type { CardProduct } from "./types";

export function toCardProduct(p: ShopProduct): CardProduct {
  const image = p.images.find((i) => i.isPrimary) ?? p.images[0];
  const flavours = [...new Map(p.variants.map((v) => [v.flavourEn, { en: v.flavourEn, ta: v.flavourTa }])).values()];
  return {
    id: p.id,
    slug: p.slug,
    nameEn: p.nameEn,
    nameTa: p.nameTa,
    categoryName: p.category.nameEn,
    color: p.familyColor ?? "#f57c00",
    image: image ? { url: image.url, alt: image.alt ?? `${p.nameEn} poster` } : null,
    flavours,
    sizes: [...new Set(p.variants.map((v) => v.sizeGrams))].sort((a, b) => a - b),
    minPrice: p.minPrice,
    maxPrice: p.maxPrice,
    minMrp: p.minMrp,
  };
}
