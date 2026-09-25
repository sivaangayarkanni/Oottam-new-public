import { BadgeCheck, Ban, ShieldCheck, Sprout, Wheat } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { SITE } from "@/lib/site";

const MILLETS = [
  { en: "Kuthiraivali", ta: "குதிரைவாலி", note: "barnyard millet" },
  { en: "Varagu", ta: "வரகு", note: "kodo millet" },
  { en: "Thinai", ta: "திணை", note: "foxtail millet" },
];
const GREENS = [
  { en: "Mudakathan", ta: "முடக்கத்தான்", note: "balloon vine leaves" },
  { en: "Murunga", ta: "முருங்கை", note: "drumstick (moringa) leaves" },
  { en: "Manathakkali", ta: "மணத்தக்காளி", note: "black nightshade leaves" },
];

function IngredientList({ title, icon: Icon, items, color }: {
  title: string;
  icon: typeof Wheat;
  items: typeof MILLETS;
  color: string;
}) {
  return (
    <div className="rounded-[2rem] bg-white p-7 shadow-md ring-1 ring-ink/5">
      <h3 className="flex items-center gap-3 font-display text-2xl font-extrabold">
        <span className="grid h-11 w-11 place-items-center rounded-full text-white" style={{ backgroundColor: color }}>
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        {title}
      </h3>
      <ul className="mt-5 space-y-3">
        {items.map((it) => (
          <li key={it.en} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-dashed border-ink/10 pb-3 last:border-0">
            <span>
              <span className="font-display text-xl font-bold">{it.en}</span>{" "}
              <span lang="ta" className="font-tamil text-ink-soft">{it.ta}</span>
            </span>
            <span className="text-sm text-ink-soft">{it.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WhyTrust() {
  return (
    <section id="why-oottam" aria-labelledby="trust-heading" className="scroll-mt-20 bg-leaf py-20 text-white sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="text-center">
          <p className="font-display text-lg font-bold uppercase tracking-[0.2em] text-turmeric">Chapter 5 · Why trust us</p>
          <h2 id="trust-heading" className="mx-auto mt-3 max-w-3xl font-display text-4xl font-extrabold leading-tight sm:text-6xl">
            Ingredients your grandmother would recognise
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-6 text-ink md:grid-cols-2">
          <Reveal from="left"><IngredientList title="Millets" icon={Wheat} items={MILLETS} color="var(--color-pongal)" /></Reveal>
          <Reveal from="right"><IngredientList title="Greens" icon={Sprout} items={GREENS} color="var(--color-rava)" /></Reveal>
        </div>
        <ul className="mt-6 grid gap-6 md:grid-cols-3">
          <Reveal as="li" className="rounded-[2rem] bg-white/10 p-7 ring-1 ring-white/20">
            <BadgeCheck className="h-9 w-9 text-turmeric" aria-hidden />
            <h3 className="mt-3 font-display text-2xl font-bold">FSSAI licensed</h3>
            <p className="mt-1 text-white/80">Lic. No. <span className="font-bold tracking-wide text-white">{SITE.fssai}</span></p>
          </Reveal>
          <Reveal as="li" delay={0.1} className="rounded-[2rem] bg-white/10 p-7 ring-1 ring-white/20">
            <ShieldCheck className="h-9 w-9 text-turmeric" aria-hidden />
            <h3 className="mt-3 font-display text-2xl font-bold">The no-preservative promise</h3>
            <p className="mt-1 text-white/80">Nothing added to artificially extend shelf life. Ever.</p>
          </Reveal>
          <Reveal as="li" delay={0.2} className="rounded-[2rem] bg-white/10 p-7 ring-1 ring-white/20">
            <Ban className="h-9 w-9 text-turmeric" aria-hidden />
            <h3 className="mt-3 font-display text-2xl font-bold">No added colours</h3>
            <p className="mt-1 text-white/80">Every shade on your plate comes from real ingredients.</p>
          </Reveal>
        </ul>
      </div>
    </section>
  );
}
