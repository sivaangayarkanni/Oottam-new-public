"use client";

import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

/** Pulls its child gently towards the cursor (mouse only, disabled for reduced motion). */
export function Magnetic({ children, strength = 0.35 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 250, damping: 15, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 250, damping: 15, mass: 0.4 });

  function onMove(e: React.PointerEvent) {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  }
  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className="inline-block p-2 -m-2"
      style={{ x, y }}
      whileTap={reduce ? undefined : { scale: 0.95 }}
    >
      {children}
    </motion.div>
  );
}
