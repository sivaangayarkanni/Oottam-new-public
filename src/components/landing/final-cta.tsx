import { ButtonLink } from "@/components/button-link";
import { Mascot, SpeechBubble } from "@/components/mascot";
import { Reveal } from "@/components/reveal";
import { WhatsAppIcon } from "@/components/icons";
import { SITE } from "@/lib/site";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-heading" className="px-4 py-20 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-saffron px-6 py-14 text-white sm:px-14">
        <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-turmeric/40" />
        <div aria-hidden className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-saffron-deep/40" />
        <div className="relative grid items-center gap-10 md:grid-cols-[1fr_auto]">
          <Reveal>
            <p className="font-display text-lg font-bold uppercase tracking-[0.2em] text-ink/70">The happy ending</p>
            <h2 id="cta-heading" className="mt-2 font-display text-4xl font-extrabold leading-tight sm:text-6xl">
              Better mornings start with <span className="text-ink">Oottam.</span>
            </h2>
            <p className="mt-4 max-w-xl text-lg text-white/90">{SITE.tagline}. {SITE.claims.join(" · ")}.</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <ButtonLink href="/shop" variant="light">Shop now</ButtonLink>
              <ButtonLink href={SITE.whatsappUrl} variant="whatsapp" external>
                <WhatsAppIcon /> Order on WhatsApp
              </ButtonLink>
            </div>
          </Reveal>
          <Reveal from="scale" className="flex flex-col items-center">
            <SpeechBubble tail="bottom" className="mb-5">See you at breakfast!</SpeechBubble>
            <Mascot size={180} animate="wobble" decorative />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
