"use client";

import { MotionConfig } from "motion/react";

/** Global motion settings: honour the user's prefers-reduced-motion setting. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
