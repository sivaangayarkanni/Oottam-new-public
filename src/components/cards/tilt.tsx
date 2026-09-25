"use client";

import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import clsx from "clsx";

/**
 * 3D tilt on hover (fine pointers only), with a soft glare that follows the cursor.
 * Only transform/opacity are animated. Disabled for reduced motion.
 */
export function Tilt({ children, className, max = 10 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 20, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const glareX = useTransform(px, [0, 1], ["-30%", "30%"]);
  const glareY = useTransform(py, [0, 1], ["-30%", "30%"]);
  const glareOpacity = useSpring(0, spring);
  const transform = useMotionTemplate`translate(${glareX}, ${glareY})`;

  function onMove(e: React.PointerEvent) {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
    glareOpacity.set(1);
  }
  function onLeave() {
    px.set(0.5);
    py.set(0.5);
    glareOpacity.set(0);
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={clsx("h-full", className)}
      style={{ perspective: 1100 }}
    >
      <motion.div
        className="relative h-full"
        style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        {children}
        {!reduce && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[2rem]"
            style={{ opacity: glareOpacity }}
          >
            <motion.div
              className="absolute -inset-1/2 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.35),transparent_45%)]"
              style={{ transform }}
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
