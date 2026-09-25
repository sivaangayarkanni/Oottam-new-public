import { ArrowDown, Leaf, ShieldCheck, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { HeroVisual } from "@/components/landing/hero-visual";
import { Magnetic } from "@/components/scroll/magnetic";
import { Reveal } from "@/components/reveal";
import { WhatsAppIcon } from "@/components/icons";
import { SITE } from "@/lib/site";

const CLAIM_ICONS = [Leaf, ShieldCheck, Sparkles];

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      {/* soft decorative blobs */}
      <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-[34rem] w-[34rem] rounded-full bg-saffron/15 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-[26rem] w-[26rem] rounded-full bg-leaf/10 blur-2xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pb-24 lg:pt-16">
        <div className="text-center lg:text-left">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full bg-leaf/10 px-4 py-1.5 text-sm font-bold text-leaf-deep">
              <Leaf className="h-4 w-4" aria-hidden /> South Indian breakfast mixes
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 id="hero-heading" className="mt-5 font-display font-extrabold leading-[0.95]">
              <span className="block text-7xl text-saffron-deep sm:text-8xl lg:text-9xl">{SITE.name}</span>
              <span lang="ta" className="mt-2 block font-tamil text-4xl text-leaf sm:text-5xl">
                {SITE.nameTa}
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 font-display text-3xl font-bold text-ink sm:text-4xl">
              <span className="relative inline-block">
                {SITE.tagline}
                <svg aria-hidden viewBox="0 0 300 20" className="absolute -bottom-3 left-0 w-full text-turmeric" preserveAspectRatio="none">
                  <path d="M3 14c60-10 140-12 294-4" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span>
            </p>
            <p className="mx-auto mt-6 max-w-xl text-lg text-ink-soft lg:mx-0">
              Traditional dosa, adai and pongal, made instant. Real millets and greens, with nothing artificial added.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Magnetic>
                <ButtonLink href="/shop">Shop now</ButtonLink>
              </Magnetic>
              <Magnetic>
                <ButtonLink href={SITE.whatsappUrl} variant="whatsapp" external>
                  <WhatsAppIcon /> Order on WhatsApp
                </ButtonLink>
              </Magnetic>
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-2 lg:justify-start">
              {SITE.claims.map((c, i) => {
                const Icon = CLAIM_ICONS[i];
                return (
                  <li key={c} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-sm font-semibold">
                    <Icon className="h-4 w-4 text-leaf" aria-hidden /> {c}
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>

        <HeroVisual />
      </div>

      <a
        href="#problem"
        className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowDown className="h-4 w-4 animate-bounce motion-reduce:animate-none" aria-hidden /> Follow the story
      </a>
    </section>
  );
}
