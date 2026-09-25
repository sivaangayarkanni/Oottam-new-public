"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#f57c00", "#ffc93c", "#2e7d32", "#c62828", "#1565c0", "#6a1b9a", "#00838f"];

/** One-shot canvas confetti burst. Skipped entirely when the user prefers reduced motion. */
export function Confetti({ pieces = 160, durationMs = 3800 }: { pieces?: number; durationMs?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    const W = () => canvas.width;
    const H = () => canvas.height;
    const parts = Array.from({ length: pieces }, (_, i) => {
      const fromLeft = i % 2 === 0;
      return {
        x: fromLeft ? W() * 0.15 : W() * 0.85,
        y: H() * 0.55,
        vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 9) * dpr,
        vy: -(10 + Math.random() * 12) * dpr,
        w: (6 + Math.random() * 6) * dpr,
        h: (10 + Math.random() * 8) * dpr,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[i % COLORS.length],
      };
    });
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, W(), H());
      const fade = t > durationMs - 800 ? Math.max(0, (durationMs - t) / 800) : 1;
      ctx.globalAlpha = fade;
      for (const p of parts) {
        p.vy += 0.35 * dpr;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
        ctx.restore();
      }
      if (t < durationMs) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W(), H());
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [pieces, durationMs]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />;
}
