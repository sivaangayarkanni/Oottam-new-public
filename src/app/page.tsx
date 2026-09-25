import { connection } from "next/server";
import { getShopProducts } from "@/lib/catalogue";
import { Hero } from "@/components/landing/hero";
import { Marquee } from "@/components/landing/marquee";
import { StoryScroll } from "@/components/landing/story-scroll";
import { Problem } from "@/components/landing/problem";
import { Solution } from "@/components/landing/solution";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Range } from "@/components/landing/range";
import { WhyTrust } from "@/components/landing/why-trust";
import { Heritage } from "@/components/landing/heritage";
import { FinalCta } from "@/components/landing/final-cta";
import { Reviews } from "@/components/reviews";
import { ScrollProgress } from "@/components/scroll/scroll-progress";
import { MascotGuide } from "@/components/scroll/mascot-guide";

export default async function Home() {
  await connection();
  const products = await getShopProducts();
  const heritage = products.filter((p) => p.category.slug === "paarambariyam");

  // `data-guide` lines are what the mini mascot says while that section is on screen.
  return (
    <main>
      <ScrollProgress />
      <div data-guide="">
        <Hero />
      </div>
      <Marquee />

      <div id="problem" className="scroll-mt-16" data-guide="Sound familiar? Keep scrolling, it gets better…">
        {/* Pinned scrollytelling when motion is allowed; static sections for reduced motion (pure CSS switch). */}
        <section aria-labelledby="story-problem-heading" className="motion-reduce:hidden">
          <StoryScroll />
        </section>
        <div className="hidden motion-reduce:block">
          <Problem />
          <Solution />
        </div>
      </div>

      <div data-guide="Just three steps. Mix, pour, cook!">
        <HowItWorks />
      </div>
      <div data-guide="Hover to tilt, flip a card to see the flavours!">
        <Range products={products} />
      </div>
      <div data-guide="Real millets and greens. Nothing artificial.">
        <WhyTrust />
      </div>
      <div data-guide="Let’s travel through our heritage recipes →">
        <Heritage products={heritage} />
      </div>
      <Reviews />
      <div data-guide="See you at breakfast!">
        <FinalCta />
      </div>
      <MascotGuide />
    </main>
  );
}
