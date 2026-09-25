"use client";

import { useLayoutEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { FlipCard } from "@/components/cards/flip-card";
import type { CardProduct } from "@/components/cards/types";

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function DealItem({
  product,
  i,
  n,
  p,
  enabled,
  register,
}: {
  product: CardProduct;
  i: number;
  n: number;
  p: MotionValue<number>;
  enabled: MotionValue<number>;
  register: (i: number, el: HTMLLIElement | null, dx: MotionValue<number>, dy: MotionValue<number>) => void;
}) {
  const dx = useMotionValue(0);
  const dy = useMotionValue(0);
  const start = i * 0.07;
  const end = Math.min(1, 0.5 + i * 0.07);
  const t = useTransform(p, (v) => easeOut(clamp((v - start) / (end - start))));
  const rest = (i - (n - 1) / 2) * 5; // fanned deck angle
  const x = useTransform(() => enabled.get() * dx.get() * (1 - t.get()));
  const y = useTransform(() => enabled.get() * (dy.get() - i * 6) * (1 - t.get()));
  const rotate = useTransform(() => enabled.get() * rest * (1 - t.get()));
  const scale = useTransform(() => 1 - enabled.get() * 0.12 * (1 - t.get()));

  return (
    <motion.li
      ref={(el) => register(i, el, dx, dy)}
      style={{ x, y, rotate, scale, zIndex: n - i }}
      className="relative w-[82%] shrink-0 snap-center will-change-transform sm:w-auto"
    >
      <FlipCard product={product} />
    </motion.li>
  );
}

/**
 * The range starts as a fanned deck in the middle of the grid and deals out into
 * place as the section scrolls into view (sm+ only; mobile gets a native swipe row,
 * reduced motion gets the plain grid).
 */
export function RangeDeck({ products }: { products: CardProduct[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const items = useRef(new Map<number, { el: HTMLLIElement; dx: MotionValue<number>; dy: MotionValue<number> }>());
  const reduce = useReducedMotion();
  const enabled = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 95%", "start 20%"] });
  const p = useTransform(scrollYProgress, (v) => v); // opt out of native acceleration (see StoryScroll)

  const register = (i: number, el: HTMLLIElement | null, dx: MotionValue<number>, dy: MotionValue<number>) => {
    if (el) items.current.set(i, { el, dx, dy });
    else items.current.delete(i);
  };

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const mq = window.matchMedia("(min-width: 640px)");
    const measure = () => {
      const on = mq.matches && !reduce;
      enabled.set(on ? 1 : 0);
      if (!on) return;
      const cx = list.clientWidth / 2;
      const cy = Math.min(list.clientHeight / 2, 320);
      items.current.forEach(({ el, dx, dy }) => {
        // offsetLeft/Top ignore transforms, so measuring is stable mid-animation
        dx.set(cx - (el.offsetLeft + el.offsetWidth / 2));
        dy.set(cy - (el.offsetTop + Math.min(el.offsetHeight, 640) / 2));
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", measure);
    };
  }, [reduce, enabled]);

  return (
    <ul
      ref={listRef}
      className="relative -mx-4 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3"
    >
      {products.map((prod, i) => (
        <DealItem key={prod.id} product={prod} i={i} n={products.length} p={p} enabled={enabled} register={register} />
      ))}
    </ul>
  );
}
