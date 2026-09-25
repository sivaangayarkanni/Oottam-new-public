"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { ArrowRight } from "lucide-react";
import { formatPaise } from "@/lib/money";
import type { CardProduct } from "@/components/cards/types";

function Scene({ product, i, n, p }: { product: CardProduct; i: number; n: number; p: MotionValue<number> }) {
  // each scene's own local progress while it crosses the viewport
  const c = (i + 1) / (n + 1);
  const posterY = useTransform(p, [c - 0.35, c + 0.35], [60, -60]);
  const posterRotate = useTransform(p, [c - 0.35, c + 0.35], [-8, 8]);
  const textX = useTransform(p, [c - 0.35, c + 0.1], [120, 0]);
  return (
    <article className="relative flex h-[72%] w-[min(62vw,56rem)] shrink-0 items-center gap-10 overflow-hidden rounded-[2.5rem] bg-white/10 p-8 ring-1 ring-white/25 backdrop-blur-sm lg:p-12">
      <span
        aria-hidden
        className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
      />
      <motion.div style={{ y: posterY, rotate: posterRotate }} className="relative h-full shrink-0">
        {product.image && (
          <Image
            src={product.image.url}
            alt={product.image.alt}
            width={1076}
            height={1600}
            sizes="(min-width: 768px) 25vw, 60vw"
            className="h-full w-auto rounded-[1.75rem] shadow-2xl ring-4 ring-white/40"
          />
        )}
      </motion.div>
      <motion.div style={{ x: textX }} className="relative">
        <p className="font-display text-lg font-bold uppercase tracking-[0.2em] text-turmeric">
          Paarambariyam · 0{i + 1}
        </p>
        <h3 className="mt-2 font-display text-5xl font-extrabold leading-none lg:text-7xl">{product.nameEn}</h3>
        {product.nameTa && (
          <p lang="ta" className="mt-2 font-tamil text-3xl font-semibold text-white/90">
            {product.nameTa}
          </p>
        )}
        <p className="mt-6 text-lg text-white/85">
          A heritage favourite from South Indian kitchens, made instant. From{" "}
          <span className="font-bold text-white">{formatPaise(product.minPrice)}</span>.
        </p>
        <Link
          href={`/products/${product.slug}`}
          className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 py-3 font-display text-lg font-bold text-ink shadow-[0_6px_0_0_rgba(0,0,0,0.25)] transition hover:scale-105"
        >
          Discover {product.nameEn} <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
      </motion.div>
    </article>
  );
}

function ColorLayer({ color, i, n, p }: { color: string; i: number; n: number; p: MotionValue<number> }) {
  const c = (i + 1) / (n + 1);
  // stacked crossfade: each colour fades in over the previous one and stays
  const opacity = useTransform(p, [c - 0.22, c - 0.05], [i === 0 ? 1 : 0, 1]);
  return <motion.div aria-hidden className="absolute inset-0" style={{ opacity, backgroundColor: color }} />;
}

/**
 * Pinned horizontal journey through the Paarambariyam range: vertical scroll drives
 * the track sideways. Shown on md+ when motion is allowed; see Heritage for the fallback.
 */
export function HeritageHorizontal({ products }: { products: CardProduct[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  const x = useTransform(p, (v) => -v * distance);
  const mascotX = useTransform(p, [0, 1], ["0vw", "55vw"]);

  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => setDistance(Math.max(0, el.scrollWidth - window.innerWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div ref={wrap} className="relative" style={{ height: `${(products.length + 1) * 90 + 60}vh` }}>
      <div className="sticky top-16 h-[calc(100svh-4rem)] overflow-hidden text-white" style={{ backgroundColor: products[0]?.color }}>
        {products.map((prod, i) => (
          <ColorLayer key={prod.id} color={prod.color} i={i} n={products.length} p={p} />
        ))}
        <motion.div ref={track} style={{ x }} className="relative flex h-full w-max items-center gap-10 px-[6vw] will-change-transform">
          <div className="w-[min(38vw,34rem)] shrink-0">
            <p className="font-display text-lg font-bold uppercase tracking-[0.2em] text-turmeric">Chapter 6 · Heritage</p>
            <h2 className="mt-3 font-display font-extrabold leading-none">
              <span lang="ta" className="block font-tamil text-6xl lg:text-7xl">பாரம்பரியம்</span>
              <span className="mt-3 block text-4xl lg:text-5xl">Paarambariyam: heritage, kept alive</span>
            </h2>
            <p className="mt-5 text-lg text-white/85">
              Some recipes are too precious to lose. Our Paarambariyam range brings back old favourites from South Indian
              kitchens, made just as easy as the rest.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold" aria-hidden>
              Keep scrolling <ArrowRight className="h-4 w-4" />
            </p>
          </div>
          {products.map((prod, i) => (
            <Scene key={prod.id} product={prod} i={i} n={products.length} p={p} />
          ))}
          <div className="w-[6vw] shrink-0" aria-hidden />
        </motion.div>
        {/* mascot strolling along the bottom as the track moves */}
        <motion.div aria-hidden style={{ x: mascotX }} className="absolute bottom-3 left-[6vw]">
          <Image src="/images/mascot/oottam-chef.png" alt="" width={225} height={296} className="animate-wave h-auto w-16" />
        </motion.div>
        <div aria-hidden className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
          <motion.div className="h-full origin-left bg-turmeric" style={{ scaleX: p }} />
        </div>
      </div>
    </div>
  );
}
