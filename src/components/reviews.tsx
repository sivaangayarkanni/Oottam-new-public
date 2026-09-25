import { Star } from "lucide-react";
import { getApprovedReviews } from "@/lib/catalogue";
import { Reveal } from "@/components/reveal";

/**
 * Customer reviews. Renders ONLY approved reviews from the Review table and
 * renders nothing at all when there are none. Never add placeholder testimonials.
 */
export async function Reviews() {
  const reviews = await getApprovedReviews(6);
  if (reviews.length === 0) return null;

  return (
    <section aria-labelledby="reviews-heading" className="bg-cream-deep py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 id="reviews-heading" className="text-center font-display text-4xl font-extrabold sm:text-5xl">
          Loved at breakfast tables
        </h2>
        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {reviews.map((r, i) => (
            <Reveal as="li" key={r.id} delay={i * 0.08} className="rounded-[2rem] bg-white p-6 shadow-md">
              <p className="flex gap-0.5 text-saffron" aria-label={`${r.rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, s) => (
                  <Star key={s} aria-hidden className={s < r.rating ? "h-5 w-5 fill-current" : "h-5 w-5 opacity-30"} />
                ))}
              </p>
              {r.title && <p className="mt-3 font-display text-xl font-bold">{r.title}</p>}
              {r.body && <p className="mt-2 text-ink-soft">{r.body}</p>}
              <p className="mt-4 text-sm font-semibold">
                {r.authorName ?? "Verified customer"} · <span className="text-ink-soft">{r.product.nameEn}</span>
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
