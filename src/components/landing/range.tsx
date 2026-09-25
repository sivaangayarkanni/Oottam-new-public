import { ProductCard } from "@/components/product-card";
import { ButtonLink } from "@/components/button-link";
import { Reveal } from "@/components/reveal";
import type { ShopProduct } from "@/lib/catalogue";

export function Range({ products }: { products: ShopProduct[] }) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="range-heading" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="flex flex-col items-center text-center">
          <p className="font-display text-lg font-bold uppercase tracking-[0.2em] text-saffron-deep">Chapter 4 · The range</p>
          <h2 id="range-heading" className="mt-3 font-display text-4xl font-extrabold sm:text-6xl">
            A colour for every craving
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Rava dosa, adai and pongal in flavours full of millets and greens, plus our Paarambariyam heritage specials.
          </p>
        </Reveal>
        {/* Swipeable carousel on mobile, grid from sm up */}
        <Reveal>
        <ul className="-mx-4 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id} className="w-[82%] shrink-0 snap-center sm:w-auto">
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
        </Reveal>
        <p className="mt-2 text-center text-sm text-ink-soft sm:hidden" aria-hidden>Swipe to explore →</p>
        <div className="mt-10 flex justify-center">
          <ButtonLink href="/shop" variant="ghost">Explore the shop</ButtonLink>
        </div>
      </div>
    </section>
  );
}
