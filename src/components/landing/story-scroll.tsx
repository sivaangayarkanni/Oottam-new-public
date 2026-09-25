"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { AlarmClock, Ban, FlaskConical, Hourglass, Leaf, ShieldCheck } from "lucide-react";

const PAINS = [
  {
    icon: AlarmClock,
    title: "Rushed mornings",
    body: "School runs, office calls, tiffin boxes. Breakfast is usually the first thing that gets skipped.",
    scatter: { x: -520, y: -260, r: -28 },
  },
  {
    icon: FlaskConical,
    title: "“Instant” isn’t always honest",
    body: "Many instant foods rely on preservatives and added colours to look good and last on the shelf.",
    scatter: { x: 60, y: 420, r: 18 },
  },
  {
    icon: Hourglass,
    title: "Tradition takes time",
    body: "Real dosa, adai and pongal mean soaking, grinding and waiting, often for hours before you can cook.",
    scatter: { x: 540, y: -240, r: 30 },
  },
];

const PROMISES = [
  { icon: Leaf, title: "Natural", body: "Grains, millets and greens, just as tradition intended." },
  { icon: ShieldCheck, title: "No Preservative", body: "Nothing added to artificially stretch shelf life." },
  { icon: Ban, title: "No Added Colors", body: "The colours come from the ingredients themselves." },
];

function PainCard({ pain, i, p }: { pain: (typeof PAINS)[number]; i: number; p: MotionValue<number> }) {
  const a0 = 0.06 + i * 0.09;
  const a1 = a0 + 0.08;
  const s0 = 0.44 + i * 0.015;
  const s1 = s0 + 0.12;
  const opacity = useTransform(p, [a0, a1, s0, s1], [0, 1, 1, 0]);
  const y = useTransform(p, [a0, a1, s0, s1], [60, 0, 0, pain.scatter.y]);
  const x = useTransform(p, [s0, s1], [0, pain.scatter.x]);
  const rotate = useTransform(p, [a0, a1, s0, s1], [i % 2 ? 6 : -6, 0, 0, pain.scatter.r]);
  const scale = useTransform(p, [a0, a1, s0, s1], [0.85, 1, 1, 0.7]);
  return (
    <motion.li
      style={{ opacity, x, y, rotate, scale }}
      className="relative rounded-[1.75rem] border border-white/10 bg-[#3a2616] p-4 shadow-2xl will-change-transform sm:p-7"
    >
      <span className="absolute right-5 top-3 font-display text-4xl font-extrabold text-white/10 sm:text-6xl" aria-hidden>
        0{i + 1}
      </span>
      <div className="flex items-center gap-3 sm:block">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-saffron text-white sm:h-14 sm:w-14">
          <pain.icon className="h-5 w-5 sm:h-7 sm:w-7" aria-hidden />
        </span>
        <h3 className="font-display text-lg font-bold sm:mt-5 sm:text-2xl">{pain.title}</h3>
      </div>
      <p className="mt-2 text-sm text-cream/75 sm:text-base">{pain.body}</p>
    </motion.li>
  );
}

function Promise({ item, i, p }: { item: (typeof PROMISES)[number]; i: number; p: MotionValue<number> }) {
  const a0 = 0.8 + i * 0.045;
  const opacity = useTransform(p, [a0, a0 + 0.07], [0, 1]);
  const y = useTransform(p, [a0, a0 + 0.07], [40, 0]);
  const scale = useTransform(p, [a0, a0 + 0.07], [0.8, 1]);
  return (
    <motion.li
      style={{ opacity, y, scale }}
      className="flex items-center gap-3 rounded-[1.5rem] bg-white p-3 shadow-md ring-1 ring-ink/5 sm:block sm:p-5"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf/10 text-leaf sm:h-12 sm:w-12">
        <item.icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
      </span>
      <div>
        <h3 className="font-display text-lg font-bold sm:mt-3 sm:text-xl">{item.title}</h3>
        <p className="hidden text-sm text-ink-soft sm:block">{item.body}</p>
      </div>
    </motion.li>
  );
}

/**
 * Pinned scrollytelling: the problem (pain points appear, then scatter), a cream
 * wipe, the mascot pops in, and the scene becomes the solution with the promises.
 * Scroll-linked values only drive transform + opacity. Rendered only when motion is OK
 * (a static Problem/Solution pair is shown for reduced motion; see page.tsx).
 */
export function StoryScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // A function transform opts out of motion's native ScrollTimeline acceleration, which
  // mis-handles keyframe ranges that don't span 0..1 (values fade back out past the range).
  const p = useTransform(scrollYProgress, (v) => v);

  const labelOpacity = useTransform(p, [0.42, 0.5], [1, 0]);
  const headOpacity = useTransform(p, [0.42, 0.52], [1, 0]);
  const headY = useTransform(p, [0.42, 0.52], [0, -120]);
  const headScale = useTransform(p, [0.42, 0.52], [1, 0.8]);
  const familiarOpacity = useTransform(p, [0.33, 0.37, 0.46, 0.5], [0, 1, 1, 0]);
  const familiarScale = useTransform(p, [0.33, 0.37], [0.6, 1]);

  const wipeScale = useTransform(p, [0.47, 0.62], [0, 1]);
  const mascotScale = useTransform(p, [0.49, 0.6, 0.65], [0, 1.15, 1]);
  const mascotRotate = useTransform(p, [0.49, 0.65], [-25, 0]);
  const bubbleOpacity = useTransform(p, [0.66, 0.7], [0, 1]);
  const bubbleScale = useTransform(p, [0.66, 0.7], [0.6, 1]);
  const solOpacity = useTransform(p, [0.7, 0.78], [0, 1]);
  const solY = useTransform(p, [0.7, 0.78], [50, 0]);
  const hintOpacity = useTransform(p, [0, 0.1, 0.14], [1, 1, 0]);

  return (
    <div ref={ref} className="relative h-[480vh]">
      <div className="sticky top-16 h-[calc(100svh-4rem)] overflow-hidden bg-ink text-cream">
        {/* ── Scene 1: the problem ── */}
        <div className="absolute inset-0 mx-auto flex max-w-7xl flex-col justify-center px-4 sm:px-6">
          <motion.p style={{ opacity: labelOpacity }} className="text-center font-display text-sm font-bold uppercase tracking-[0.2em] text-turmeric sm:text-lg">
            Chapter 1 · The problem
          </motion.p>
          <motion.h2
            id="story-problem-heading"
            style={{ opacity: headOpacity, y: headY, scale: headScale }}
            className="mx-auto mt-2 max-w-3xl text-center font-display text-3xl font-extrabold leading-tight sm:mt-3 sm:text-6xl"
          >
            Every morning, the same struggle.
          </motion.h2>
          <ol className="mx-auto mt-6 grid w-full max-w-5xl gap-3 sm:mt-12 sm:gap-6 md:grid-cols-3">
            {PAINS.map((pain, i) => (
              <PainCard key={pain.title} pain={pain} i={i} p={p} />
            ))}
          </ol>
          <motion.p
            style={{ opacity: familiarOpacity, scale: familiarScale }}
            className="mx-auto mt-6 w-fit rounded-full bg-white px-5 py-2 font-display text-lg font-bold text-ink sm:mt-10"
          >
            Sound familiar? There’s a better way…
          </motion.p>
          <motion.p style={{ opacity: hintOpacity }} className="absolute bottom-6 left-0 right-0 text-center text-sm text-cream/60" aria-hidden>
            Keep scrolling ↓
          </motion.p>
        </div>

        {/* ── Transition: cream wipe from the centre ── */}
        <motion.div
          aria-hidden
          style={{ scale: wipeScale }}
          className="absolute left-1/2 top-[30%] h-[180vmax] w-[180vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream will-change-transform lg:left-[27%] lg:top-[55%]"
        />

        {/* ── Scene 2: the solution ── */}
        <div className="absolute inset-0 mx-auto grid max-w-7xl content-center items-center gap-4 px-4 text-ink sm:gap-10 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="relative mx-auto flex flex-col items-center">
            <motion.div style={{ opacity: bubbleOpacity, scale: bubbleScale }} className="relative mb-3 rounded-3xl border-2 border-ink bg-white px-4 py-2 font-display text-base font-semibold shadow-[4px_4px_0_0_var(--color-ink)] sm:mb-5 sm:text-xl">
              That’s exactly why I made Oottam!
            </motion.div>
            <motion.div
              style={{ scale: mascotScale, rotate: mascotRotate }}
              className="relative grid h-40 w-40 place-items-center rounded-full bg-gradient-to-br from-saffron to-turmeric sm:h-80 sm:w-80"
            >
              <Image
                src="/images/mascot/oottam-chef-alt.png"
                alt=""
                width={224}
                height={301}
                className="animate-wave w-24 sm:w-52"
              />
            </motion.div>
          </div>
          <motion.div style={{ opacity: solOpacity, y: solY }}>
            <p className="text-center font-display text-sm font-bold uppercase tracking-[0.2em] text-saffron-deep sm:text-lg lg:text-left">
              Chapter 2 · The solution
            </p>
            <h2 className="mt-2 text-center font-display text-3xl font-extrabold leading-tight sm:mt-3 sm:text-6xl lg:text-left">
              Traditional recipes, <span className="text-leaf">made instant.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm text-ink-soft sm:mt-5 sm:text-lg lg:mx-0 lg:text-left">
              Oottam (<span lang="ta" className="font-tamil">ஊட்டம்</span>, “nourishment”) brings the breakfasts you grew
              up with to your busy mornings. We do the slow part, so you get the taste of home without the soaking and grinding.
            </p>
            <ul className="mt-4 grid gap-2 sm:mt-8 sm:grid-cols-3 sm:gap-4">
              {PROMISES.map((item, i) => (
                <Promise key={item.title} item={item} i={i} p={p} />
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
