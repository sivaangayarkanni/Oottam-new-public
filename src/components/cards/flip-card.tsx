"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { Tilt } from "./tilt";
import type { CardProduct } from "./types";

type Props = {
  product: CardProduct;
  headingLevel?: "h2" | "h3";
  sizes?: string;
};

const face = "[grid-area:1/1] flex flex-col overflow-hidden rounded-[2rem] text-white shadow-lg";

/**
 * Product card with 3D tilt and a flip-to-reveal back face listing the flavours.
 * The flip control is a real <button> with aria-pressed; the hidden face is `inert`
 * so keyboard and screen-reader users only ever reach the visible side.
 */
export function FlipCard({ product, headingLevel = "h3", sizes }: Props) {
  const [flipped, setFlipped] = useState(false);
  const frontBtn = useRef<HTMLButtonElement>(null);
  const backBtn = useRef<HTMLButtonElement>(null);
  const H = headingLevel;
  const discount = product.minMrp > product.minPrice ? Math.round((1 - product.minPrice / product.minMrp) * 100) : 0;
  const href = `/products/${product.slug}`;
  const multi = product.flavours.length > 1;

  function flip(next: boolean) {
    setFlipped(next);
    // Move focus to the control on the newly visible face.
    requestAnimationFrame(() => (next ? backBtn : frontBtn).current?.focus({ preventScroll: true }));
  }

  return (
    <Tilt className="group">
      <motion.div
        className="grid h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 140, damping: 18 }}
      >
        {/* ── Front ── */}
        <article
          className={face}
          style={{ backgroundColor: product.color, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          inert={flipped}
          aria-hidden={flipped}
        >
          <div className="relative mx-4 mt-4 aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-black/10 sm:aspect-[4/5]">
            {product.image && (
              <Image
                src={product.image.url}
                alt={product.image.alt}
                fill
                sizes={sizes ?? "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 85vw"}
                className="object-cover object-top transition duration-500 group-hover:scale-105"
              />
            )}
            {discount > 0 && (
              <span className="absolute left-3 top-3 rounded-full bg-turmeric px-3 py-1 text-sm font-extrabold text-ink">
                {discount}% off
              </span>
            )}
          </div>
          <div className="relative flex flex-1 flex-col p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-white/80">{product.categoryName}</p>
            <H className="mt-1 font-display text-2xl font-extrabold leading-tight">
              <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-white">
                {product.nameEn}
              </Link>
            </H>
            {product.nameTa && <p lang="ta" className="font-tamil text-white/90">{product.nameTa}</p>}
            <div className="mt-auto flex items-end justify-between gap-3 pt-5">
              <p>
                <span className="text-sm text-white/80">{product.maxPrice > product.minPrice ? "From " : ""}</span>
                <span className="font-display text-2xl font-extrabold">{formatPaise(product.minPrice)}</span>
                {product.minMrp > product.minPrice && (
                  <s className="ml-2 text-sm text-white/75">{formatPaise(product.minMrp)}</s>
                )}
              </p>
              <button
                ref={frontBtn}
                type="button"
                onClick={() => flip(true)}
                aria-pressed={flipped}
                aria-label={`Flip card to see ${multi ? "flavours" : "details"} for ${product.nameEn}`}
                className="relative z-10 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-ink shadow-md transition hover:scale-105 active:scale-95"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                {multi ? `${product.flavours.length} flavours` : "Details"}
              </button>
            </div>
          </div>
        </article>

        {/* ── Back ── */}
        <div
          className={face}
          style={{
            background: `linear-gradient(160deg, ${product.color} 0%, color-mix(in srgb, ${product.color} 55%, #1a0f07) 100%)`,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          inert={!flipped}
          aria-hidden={!flipped}
        >
          <div className="flex flex-1 flex-col p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-white/80">{product.categoryName}</p>
            <p className="mt-1 font-display text-3xl font-extrabold leading-tight">{product.nameEn}</p>
            {product.nameTa && <p lang="ta" className="font-tamil text-white/90">{product.nameTa}</p>}

            <p className="mt-6 flex items-center gap-2 font-display text-lg font-bold text-turmeric">
              <Sparkles className="h-5 w-5" aria-hidden /> {multi ? "Choose your flavour" : "Flavour"}
            </p>
            <ul className="mt-3 space-y-2">
              {product.flavours.map((f) => (
                <li key={f.en} className="flex items-baseline justify-between gap-3 rounded-2xl px-4 py-2" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
                  <span className="font-bold">{f.en}</span>
                  {f.ta && <span lang="ta" className="font-tamil text-sm text-white/85">{f.ta}</span>}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-white/85">
              Pack {product.sizes.length > 1 ? "sizes" : "size"}: {product.sizes.map((s) => `${s} g`).join(", ")}
            </p>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
              <button
                ref={backBtn}
                type="button"
                onClick={() => flip(false)}
                aria-label={`Flip back to the front of ${product.nameEn}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-white/70 px-4 py-2 text-sm font-bold transition hover:bg-white/15"
              >
                <RotateCcw className="h-4 w-4 -scale-x-100" aria-hidden /> Back
              </button>
              <Link
                href={href}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2 font-extrabold text-ink shadow-md transition hover:scale-105"
              >
                View product <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </Tilt>
  );
}
