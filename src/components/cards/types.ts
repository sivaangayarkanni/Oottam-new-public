/** Plain, serialisable product data for client-side card components. */
export type CardProduct = {
  id: string;
  slug: string;
  nameEn: string;
  nameTa: string | null;
  categoryName: string;
  color: string;
  image: { url: string; alt: string } | null;
  flavours: { en: string; ta: string | null }[];
  sizes: number[];
  minPrice: number;
  maxPrice: number;
  minMrp: number;
  /** One purchasable variant per flavour (smallest pack) for quick add. */
  quickAdd: { variantId: string; flavourEn: string; sizeGrams: number; stock: number }[];
};
