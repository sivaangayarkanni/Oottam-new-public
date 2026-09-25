import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatPaise } from "@/lib/money";
import type { ShopProduct } from "@/lib/catalogue";

/** Colourful product card using the product's poster colour. */
export function ProductCard({ product, headingLevel = "h3" }: { product: ShopProduct; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  const color = product.familyColor ?? "#f57c00";
  const image = product.images.find((i) => i.isPrimary) ?? product.images[0];
  const discount = product.minMrp > product.minPrice ? Math.round((1 - product.minPrice / product.minMrp) * 100) : 0;
  const flavours = product.variants.map((v) => v.flavourEn);
  const uniqueFlavours = [...new Set(flavours)];

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] text-white shadow-lg transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl focus-within:-translate-y-1.5"
      style={{ backgroundColor: color }}
    >
      <div className="relative mx-4 mt-4 aspect-[4/3] overflow-hidden sm:aspect-[4/5] rounded-[1.5rem] bg-black/10">
        {image && (
          <Image
            src={image.url}
            alt={image.alt ?? `${product.nameEn} poster`}
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover object-top transition duration-500 group-hover:scale-105"
          />
        )}
        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-turmeric px-3 py-1 text-sm font-extrabold text-ink">
            {discount}% off
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-white/75">{product.category.nameEn}</p>
        <H className="mt-1 font-display text-2xl font-extrabold leading-tight">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-white">
            {product.nameEn}
          </Link>
        </H>
        <p className="font-tamil text-white/85">{product.nameTa}</p>
        {uniqueFlavours.length > 1 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Flavours">
            {uniqueFlavours.map((f) => (
              <li key={f} className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
                {f}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex items-end justify-between pt-5">
          <p>
            <span className="text-sm text-white/75">{product.maxPrice > product.minPrice ? "From " : ""}</span>
            <span className="font-display text-2xl font-extrabold">{formatPaise(product.minPrice)}</span>
            {product.minMrp > product.minPrice && (
              <s className="ml-2 text-sm text-white/70">{formatPaise(product.minMrp)}</s>
            )}
          </p>
          <span
            aria-hidden
            className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink transition group-hover:translate-x-1"
          >
            <ArrowRight className="h-5 w-5" />
          </span>
        </div>
      </div>
    </article>
  );
}
