import type { ShopProduct } from "@/lib/catalogue";
import { FlipCard } from "@/components/cards/flip-card";
import { toCardProduct } from "@/components/cards/to-card-product";

/** Server wrapper: maps a DB product to the interactive tilt/flip card. */
export function ProductCard({ product, headingLevel = "h3" }: { product: ShopProduct; headingLevel?: "h2" | "h3" }) {
  return <FlipCard product={toCardProduct(product)} headingLevel={headingLevel} />;
}
