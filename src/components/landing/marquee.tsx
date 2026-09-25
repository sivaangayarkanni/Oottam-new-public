import { SITE } from "@/lib/site";

const WORDS = [...SITE.claims, SITE.tagline, SITE.nameTa];

/** Scrolling brand-promise ribbon (decorative, static under reduced motion). */
export function Marquee() {
  const row = [...WORDS, ...WORDS];
  return (
    <div className="relative z-10 -rotate-1 overflow-hidden bg-leaf py-2.5 text-white/95" aria-hidden>
      <div className="flex w-max animate-marquee gap-8 whitespace-nowrap font-display text-xl font-bold [animation-duration:45s]">
        {[...row, ...row].map((w, i) => (
          <span key={i} className="flex items-center gap-8">
            {w} <span className="text-turmeric">✺</span>
          </span>
        ))}
      </div>
    </div>
  );
}
