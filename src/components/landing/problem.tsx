import { AlarmClock, FlaskConical, Hourglass } from "lucide-react";
import { Mascot, SpeechBubble } from "@/components/mascot";
import { Reveal } from "@/components/reveal";

const PROBLEMS = [
  {
    icon: AlarmClock,
    title: "Rushed mornings",
    body: "School runs, office calls, tiffin boxes. Breakfast is usually the first thing that gets skipped.",
  },
  {
    icon: FlaskConical,
    title: "“Instant” isn’t always honest",
    body: "Many instant foods rely on preservatives and added colours to look good and last on the shelf.",
  },
  {
    icon: Hourglass,
    title: "Tradition takes time",
    body: "Real dosa, adai and pongal mean soaking, grinding and waiting, often for hours before you can cook.",
  },
];

export function Problem() {
  return (
    <section id="problem" aria-labelledby="problem-heading" className="relative scroll-mt-20 bg-ink py-20 text-cream sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <p className="text-center font-display text-lg font-bold uppercase tracking-[0.2em] text-turmeric">Chapter 1 · The problem</p>
          <h2 id="problem-heading" className="mx-auto mt-3 max-w-3xl text-center font-display text-4xl font-extrabold leading-tight sm:text-6xl">
            Every morning, the same struggle.
          </h2>
        </Reveal>

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {PROBLEMS.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 0.12} className="relative rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <span className="absolute right-6 top-4 font-display text-6xl font-extrabold text-white/10" aria-hidden>
                0{i + 1}
              </span>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-saffron text-white">
                <p.icon className="h-7 w-7" aria-hidden />
              </span>
              <h3 className="mt-6 font-display text-2xl font-bold">{p.title}</h3>
              <p className="mt-2 text-cream/75">{p.body}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal from="up" className="mt-14 flex items-end justify-center gap-3">
          <Mascot size={110} animate="wobble" decorative shadow={false} />
          <SpeechBubble tail="left" className="mb-10">Sound familiar? There’s a better way…</SpeechBubble>
        </Reveal>
      </div>
    </section>
  );
}
