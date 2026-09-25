"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/**
 * A mini mascot that follows the reader. It watches elements with a `data-guide`
 * attribute and shows that section's line in a speech bubble. Purely decorative
 * (the same content is on the page), so the bubble is aria-hidden; the mascot
 * itself is a "back to top" button.
 */
export function MascotGuide() {
  const [message, setMessage] = useState<string | null>(null);
  const [bubble, setBubble] = useState(false);
  const reduce = useReducedMotion();
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { scrollYProgress } = useScroll();
  const ringRotate = useTransform(scrollYProgress, [0, 1], [0, 360]);

  useEffect(() => {
    // Sections with a guide line, plus the footer (where the guide steps aside).
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-guide], body > footer, footer"));
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const text = (e.target as HTMLElement).dataset?.guide ?? "";
          setMessage(text || null);
          setBubble(Boolean(text));
          if (hideTimer.current) clearTimeout(hideTimer.current);
          hideTimer.current = setTimeout(() => setBubble(false), window.innerWidth < 640 ? 3500 : 5000);
        }
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const visible = message !== null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="guide"
          className="fixed bottom-4 right-3 z-[60] flex items-end gap-2 sm:bottom-6 sm:right-6"
          initial={{ opacity: 0, y: 40, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.6 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <AnimatePresence mode="wait">
            {bubble && (
              <motion.p
                key={message}
                aria-hidden
                className="mb-8 max-w-[11rem] rounded-2xl border-2 border-ink bg-white px-3 py-2 font-display text-sm font-semibold leading-snug text-ink shadow-[3px_3px_0_0_var(--color-ink)] sm:max-w-[14rem] sm:text-base"
                initial={{ opacity: 0, x: 12, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 12, scale: 0.9 }}
                transition={{ duration: 0.25 }}
              >
                {message}
              </motion.p>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })}
            onMouseEnter={() => setBubble(true)}
            aria-label="Back to top"
            className="relative grid h-12 w-12 place-items-center rounded-full bg-cream shadow-lg ring-2 ring-saffron/50 sm:h-20 sm:w-20"
          >
            {/* scroll-progress ring */}
            <motion.span
              aria-hidden
              className="absolute inset-[-5px] rounded-full border-[3px] border-dashed border-saffron/70"
              style={reduce ? undefined : { rotate: ringRotate }}
            />
            <Image
              src="/images/mascot/oottam-chef.png"
              alt=""
              width={225}
              height={296}
              className="animate-float h-auto w-7 sm:w-12"
            />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
