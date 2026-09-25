import Image from "next/image";
import Link from "next/link";
import { Mascot, SpeechBubble } from "@/components/mascot";
import { Reveal } from "@/components/reveal";
import { HeritageHorizontal } from "@/components/landing/heritage-horizontal";
import { toCardProduct } from "@/components/cards/to-card-product";
import type { ShopProduct } from "@/lib/catalogue";

/**
 * Paarambariyam heritage section.
 * - md+ with motion allowed: pinned horizontal scroll journey (client component).
 * - mobile or prefers-reduced-motion: native swipe row / static grid (pure CSS switch, no JS needed).
 */
export function Heritage({ products }: { products: ShopProduct[] }) {
  if (products.length === 0) return null;
  return (
    <section aria-label="Paarambariyam heritage range">
      <div className="hidden motion-safe:md:block">
        <HeritageHorizontal products={products.map(toCardProduct)} />
      </div>
      <div className="motion-safe:md:hidden">
        <HeritageFallback products={products} />
      </div>
    </section>
  );
}

function HeritageFallback({ products }: { products: ShopProduct[] }) {
  return (
    <div
      className="relative overflow-hidden py-20 text-white sm:py-28"
      style={{
        background:
          "radial-gradient(55rem 38rem at 0% 0%, var(--color-pulusu-adai) 0%, var(--color-pulusu-adai) 18%, transparent 70%), radial-gradient(55rem 38rem at 100% 100%, var(--color-pulusu-vadai) 0%, var(--color-pulusu-vadai) 18%, transparent 70%), var(--color-chekka)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
          <Reveal>
            <p className="font-display text-lg font-bold uppercase tracking-[0.2em] text-turmeric">Chapter 6 · Heritage</p>
            <h2 className="mt-3 font-display font-extrabold leading-none">
              <span lang="ta" className="block font-tamil text-5xl sm:text-7xl">பாரம்பரியம்</span>
              <span className="mt-2 block text-3xl sm:text-5xl">Paarambariyam: heritage, kept alive</span>
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-white/85">
              Some recipes are too precious to lose. Our Paarambariyam range brings back old favourites from South Indian
              kitchens, made just as easy as the rest.
            </p>
          </Reveal>
          <Reveal from="right" className="hidden items-end gap-2 lg:flex">
            <SpeechBubble tail="right" className="mb-16 max-w-[14rem]">Straight from grandma’s recipe book!</SpeechBubble>
            <Mascot size={150} decorative />
          </Reveal>
        </div>
        <ul className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
          {products.map((p) => {
            const image = p.images[0];
            return (
              <li key={p.id} className="w-[80%] shrink-0 snap-center md:w-auto">
                <Link
                  href={`/products/${p.slug}`}
                  className="group block overflow-hidden rounded-[2rem] bg-white/10 p-3 ring-1 ring-white/25 transition hover:-translate-y-1 hover:bg-white/20"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem]">
                    {image && (
                      <Image
                        src={image.url}
                        alt={image.alt ?? p.nameEn}
                        fill
                        sizes="(min-width: 768px) 30vw, 80vw"
                        className="object-cover object-bottom transition duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between px-3 py-4">
                    <div>
                      <h3 className="font-display text-2xl font-extrabold">{p.nameEn}</h3>
                      <p lang="ta" className="font-tamil text-white/85">{p.nameTa}</p>
                    </div>
                    <span className="h-10 w-10 rounded-full ring-4 ring-white/70" style={{ backgroundColor: p.familyColor ?? "#fff" }} aria-hidden />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-center text-sm text-white/75 md:hidden" aria-hidden>Swipe to explore →</p>
      </div>
    </div>
  );
}
