import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { connection } from "next/server";
import { SlidersHorizontal } from "lucide-react";
import { getShopProducts, type ShopSort } from "@/lib/catalogue";
import { CATEGORY_FILTERS, TAG_FILTERS } from "@/lib/site";
import { ProductCard } from "@/components/product-card";
import { Mascot } from "@/components/mascot";

export const metadata: Metadata = {
  title: "Shop instant breakfast mixes",
  description:
    "Shop Oottam instant Rava Dosa, Adai and Pongal mixes plus the Paarambariyam heritage range. Natural, no preservative, no added colors.",
  alternates: { canonical: "/shop" },
};

const SORTS: { value: ShopSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

type Params = { category?: string; tag?: string; sort?: string };

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function hrefWith(current: Params, patch: Partial<Params>) {
  const next = { ...current, ...patch };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v && !(k === "sort" && v === "featured")) qs.set(k, v);
  const s = qs.toString();
  return s ? `/shop?${s}` : "/shop";
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={clsx(
        "rounded-full border-2 px-4 py-2 text-sm font-bold transition",
        active ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink hover:border-ink/40",
      )}
    >
      {children}
    </Link>
  );
}

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  await connection();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const current: Params = {
    category: pick(one(sp.category), CATEGORY_FILTERS.map((c) => c.slug)),
    tag: pick(one(sp.tag), TAG_FILTERS.map((t) => t.slug)),
    sort: pick(one(sp.sort), SORTS.map((s) => s.value)) ?? "featured",
  };
  const products = await getShopProducts({
    category: current.category,
    tag: current.tag,
    sort: current.sort as ShopSort,
  });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-10 sm:px-6">
      <header className="relative overflow-hidden rounded-[2.5rem] bg-saffron px-6 py-10 text-white sm:px-12">
        <div aria-hidden className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-turmeric/40" />
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <h1 className="font-display text-5xl font-extrabold sm:text-6xl">The Oottam shop</h1>
            <p className="mt-2 max-w-lg text-lg text-white/90">
              Instant, healthy South Indian breakfasts. Pick a family, a flavour, and say goodbye to soaking and grinding.
            </p>
          </div>
          <Mascot size={120} className="hidden shrink-0 sm:block" decorative />
        </div>
      </header>

      <section aria-label="Filters" className="mt-8 space-y-4 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-ink/5 sm:p-6">
        <div className="flex items-center gap-2 font-display text-lg font-bold">
          <SlidersHorizontal className="h-5 w-5" aria-hidden /> Filter & sort
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-sm font-semibold text-ink-soft">Category</span>
          <Chip href={hrefWith(current, { category: undefined })} active={!current.category}>All</Chip>
          {CATEGORY_FILTERS.map((c) => (
            <Chip key={c.slug} href={hrefWith(current, { category: c.slug })} active={current.category === c.slug}>
              {c.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-sm font-semibold text-ink-soft">Goodness</span>
          <Chip href={hrefWith(current, { tag: undefined })} active={!current.tag}>Any</Chip>
          {TAG_FILTERS.map((t) => (
            <Chip key={t.slug} href={hrefWith(current, { tag: t.slug })} active={current.tag === t.slug}>
              {t.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-sm font-semibold text-ink-soft">Sort by</span>
          {SORTS.map((s) => (
            <Chip key={s.value} href={hrefWith(current, { sort: s.value })} active={current.sort === s.value}>
              {s.label}
            </Chip>
          ))}
        </div>
      </section>

      <p className="mt-8 text-sm font-semibold text-ink-soft" aria-live="polite">
        {products.length} {products.length === 1 ? "product" : "products"}
      </p>

      {products.length > 0 ? (
        <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id} className="h-full">
              <ProductCard product={p} headingLevel="h2" />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 flex flex-col items-center rounded-[2rem] bg-white p-12 text-center">
          <Mascot size={110} animate="wobble" decorative />
          <p className="mt-4 font-display text-2xl font-bold">No products match those filters.</p>
          <Link href="/shop" className="mt-3 font-bold text-saffron-deep underline">Clear filters</Link>
        </div>
      )}
    </main>
  );
}
