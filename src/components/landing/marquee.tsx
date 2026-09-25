import { SITE } from "@/lib/site";

const WORDS = [...SITE.claims, SITE.tagline, SITE.nameTa];

/** Scrolling brand-promise ribbon (decorative, static under reduced motion). */
export function Marquee() {
  const row = [...WORDS, ...WORDS];
  return (
    <div className="-rotate-1 overflow-hidden bg-leaf py-3 text-white" aria-hidden>
      <div className="flex w-max animate-marquee gap-8 whitespace-nowrap font-display text-2xl font-bold">
        {[...row, ...row].map((w, i) => (
          <span key={i} className="flex items-center gap-8">
            {w} <span className="text-turmeric">✺</span>
          </span>
        ))}
      </div>
    </div>
  );
}
