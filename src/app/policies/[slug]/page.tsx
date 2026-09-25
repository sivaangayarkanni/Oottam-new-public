import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mascot } from "@/components/mascot";
import { POLICY_PAGES, SITE } from "@/lib/site";

export function generateStaticParams() {
  return POLICY_PAGES.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = POLICY_PAGES.find((p) => p.slug === slug);
  return { title: page?.title ?? "Policy", robots: { index: false } };
}

// TODO(module 7): replace with real, legally reviewed policy content before launch.
export default async function PolicyPage({ params }: PageProps<"/policies/[slug]">) {
  const { slug } = await params;
  const page = POLICY_PAGES.find((p) => p.slug === slug);
  if (!page) notFound();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-5xl font-extrabold">{page.title}</h1>
      <div className="mt-8 flex items-center gap-5 rounded-[2rem] border-2 border-dashed border-saffron/50 bg-white p-6">
        <Mascot size={80} animate="none" decorative />
        <div>
          <p className="font-display text-2xl font-bold">Content coming soon</p>
          <p className="mt-1 text-ink-soft">
            We’re finalising this policy. For any questions in the meantime, message us on{" "}
            <a className="font-bold text-saffron-deep underline" href={SITE.whatsappUrl} target="_blank" rel="noopener noreferrer">
              WhatsApp ({SITE.whatsappDisplay})
            </a>
            .
          </p>
        </div>
      </div>
      <Link href="/" className="mt-8 inline-block font-bold text-saffron-deep underline">← Back to home</Link>
    </main>
  );
}
