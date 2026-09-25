import { connection } from "next/server";
import { getShopProducts } from "@/lib/catalogue";
import { Hero } from "@/components/landing/hero";
import { Marquee } from "@/components/landing/marquee";
import { Problem } from "@/components/landing/problem";
import { Solution } from "@/components/landing/solution";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Range } from "@/components/landing/range";
import { WhyTrust } from "@/components/landing/why-trust";
import { Heritage } from "@/components/landing/heritage";
import { FinalCta } from "@/components/landing/final-cta";
import { Reviews } from "@/components/reviews";

export default async function Home() {
  await connection();
  const products = await getShopProducts();
  const heritage = products.filter((p) => p.category.slug === "paarambariyam");

  return (
    <main>
      <Hero />
      <Marquee />
      <Problem />
      <Solution />
      <HowItWorks />
      <Range products={products} />
      <WhyTrust />
      <Heritage products={heritage} />
      <Reviews />
      <FinalCta />
    </main>
  );
}
