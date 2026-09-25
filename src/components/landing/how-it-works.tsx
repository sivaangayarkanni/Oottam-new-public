"use client";

import { CookingPot, Droplet, Soup } from "lucide-react";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { Reveal } from "@/components/reveal";

function MixArt() {
  return (
    <div className="relative grid h-28 w-28 place-items-center rounded-full bg-rava/10">
      <span aria-hidden className="absolute inset-2 animate-stir rounded-full border-4 border-dashed border-rava/40" />
      <Soup className="h-12 w-12 text-rava" aria-hidden />
    </div>
  );
}
function PourArt() {
  return (
    <div className="relative grid h-28 w-28 place-items-center rounded-full bg-adai/10">
      <Droplet className="h-12 w-12 animate-drip fill-adai/30 text-adai" aria-hidden />
    </div>
  );
}
function CookArt() {
  return (
    <div className="relative grid h-28 w-28 place-items-center rounded-full bg-pongal/10">
      <span aria-hidden className="absolute top-3 flex gap-2">
        {[0, 0.5, 1].map((d) => (
          <span key={d} className="h-5 w-1.5 animate-steam rounded-full bg-pongal/50" style={{ animationDelay: `${d}s` }} />
        ))}
      </span>
      <CookingPot className="mt-5 h-12 w-12 text-pongal" aria-hidden />
    </div>
  );
}

const STEPS = [
  { art: MixArt, title: "Mix", body: "Mix Oottam with water as directed on the pack." },
  { art: PourArt, title: "Pour", body: "Pour onto a hot tawa, or into your pot for pongal." },
  { art: CookArt, title: "Cook", body: "Cook until done and serve hot with your favourite chutney." },
];

function Step({ step, i, p, reduce }: { step: (typeof STEPS)[number]; i: number; p: MotionValue<number>; reduce: boolean }) {
  const a0 = 0.1 + i * 0.28;
  const opacity = useTransform(p, [a0, a0 + 0.18], [0, 1]);
  const y = useTransform(p, [a0, a0 + 0.18], [60, 0]);
  const scale = useTransform(p, [a0, a0 + 0.12, a0 + 0.18], [0.5, 1.08, 1]);
  const Art = step.art;
  return (
    <motion.li style={reduce ? undefined : { opacity, y }} className="relative flex flex-col items-center text-center">
      <motion.div style={reduce ? undefined : { scale }} className="relative rounded-full bg-cream-deep p-1">
        <Art />
        <span className="absolute -right-1 -top-1 grid h-9 w-9 place-items-center rounded-full bg-ink font-display text-lg font-bold text-white">
          {i + 1}
        </span>
      </motion.div>
      <h3 className="mt-5 font-display text-3xl font-extrabold">{step.title}</h3>
      <p className="mt-2 max-w-xs text-ink-soft">{step.body}</p>
    </motion.li>
  );
}

export function HowItWorks() {
  const ref = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 55%"] });
  const p = useTransform(scrollYProgress, (v) => v); // opt out of native acceleration (see StoryScroll)
  const line = useTransform(p, [0.1, 0.85], [0, 1]);
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20 bg-cream-deep py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-center font-display text-lg font-bold uppercase tracking-[0.2em] text-saffron-deep">Chapter 3 · How it works</p>
          <h2 id="how-heading" className="mt-3 text-center font-display text-4xl font-extrabold sm:text-6xl">
            Mix. Pour. Cook. <span className="text-saffron">Done.</span>
          </h2>
        </Reveal>
        <ol ref={ref} className="relative mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
          {/* connector that draws itself as you scroll */}
          <motion.span
            aria-hidden
            style={reduce ? undefined : { scaleX: line }}
            className="absolute left-[16%] right-[16%] top-14 hidden h-1.5 origin-left rounded-full bg-gradient-to-r from-rava via-adai to-pongal md:block"
          />
          {STEPS.map((s, i) => (
            <Step key={s.title} step={s} i={i} p={p} reduce={reduce} />
          ))}
        </ol>
        <p className="mt-12 text-center text-sm text-ink-soft">Exact quantities and cooking directions are printed on every pack.</p>
      </div>
    </section>
  );
}
