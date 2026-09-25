"use client";

import { motion, useScroll, useSpring } from "motion/react";

/** Reading-progress bar in the six pack colours (transform: scaleX only). */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[70] h-1.5 origin-left"
      style={{
        scaleX,
        background:
          "linear-gradient(90deg, var(--color-rava), var(--color-adai), var(--color-pongal), var(--color-pulusu-adai), var(--color-chekka), var(--color-pulusu-vadai))",
      }}
    />
  );
}
