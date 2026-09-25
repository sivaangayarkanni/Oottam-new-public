import { Ban, Leaf, ShieldCheck } from "lucide-react";
import { Mascot, SpeechBubble } from "@/components/mascot";
import { Reveal } from "@/components/reveal";

const PROMISES = [
  { icon: Leaf, title: "Natural", body: "Grains, millets and greens, just as tradition intended." },
  { icon: ShieldCheck, title: "No Preservative", body: "Nothing added to artificially stretch shelf life." },
  { icon: Ban, title: "No Added Colors", body: "The colours come from the ingredients themselves." },
];

export function Solution() {
  return (
    <section aria-labelledby="solution-heading" className="relative overflow-hidden py-20 sm:py-28">
      <div aria-hidden className="absolute -left-20 top-10 h-80 w-80 rounded-full bg-turmeric/25 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal from="left" className="relative mx-auto flex flex-col items-center">
          <SpeechBubble tail="bottom" className="mb-6 max-w-xs text-xl">
            That’s exactly why I made Oottam!
          </SpeechBubble>
          <div className="relative grid h-80 w-80 place-items-center rounded-full bg-gradient-to-br from-saffron to-turmeric">
            <Mascot size={220} variant="alt" />
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="font-display text-lg font-bold uppercase tracking-[0.2em] text-saffron-deep">Chapter 2 · The solution</p>
            <h2 id="solution-heading" className="mt-3 font-display text-4xl font-extrabold leading-tight sm:text-6xl">
              Traditional recipes, <span className="text-leaf">made instant.</span>
            </h2>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">
              Oottam (<span lang="ta" className="font-tamil">ஊட்டம்</span>, “nourishment”) brings the breakfasts you grew
              up with to your busy mornings. We do the slow part, so you get the taste of home without the soaking and grinding.
            </p>
          </Reveal>
          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            {PROMISES.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 0.1} className="rounded-[1.75rem] bg-white p-6 shadow-md ring-1 ring-ink/5">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-leaf/10 text-leaf">
                  <p.icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-xl font-bold">{p.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{p.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
