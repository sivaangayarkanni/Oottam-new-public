"use client";

import { motion, useReducedMotion } from "motion/react";

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** Direction the element slides in from. */
  from?: "up" | "left" | "right" | "scale";
  as?: "div" | "li" | "section" | "article";
};

/** Scroll-triggered reveal. Content is fully visible when reduced motion is on. */
export function Reveal({ children, className, delay = 0, from = "up", as = "div" }: Props) {
  const reduce = useReducedMotion();
  const offset =
    from === "left" ? { x: -40 } : from === "right" ? { x: 40 } : from === "scale" ? { scale: 0.9 } : { y: 32 };
  const Comp = motion[as];
  if (reduce) return <Comp className={className}>{children}</Comp>;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Comp>
  );
}
