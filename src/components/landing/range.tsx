import { RangeDeck } from "@/components/landing/range-deck";
import { toCardProduct } from "@/components/cards/to-card-product";
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
            Rava dosa, adai and pongal in flavours full of millets and greens, plus our Paarambariyam heritage specials. Flip a card to see every flavour.
          </p>
        </Reveal>
        <RangeDeck products={products.map(toCardProduct)} />
        <p className="mt-2 text-center text-sm text-ink-soft sm:hidden" aria-hidden>Swipe to explore →</p>
        <div className="mt-10 flex justify-center">
          <ButtonLink href="/shop" variant="ghost">Explore the shop</ButtonLink>
        </div>
      </div>
    </section>
  );
}
