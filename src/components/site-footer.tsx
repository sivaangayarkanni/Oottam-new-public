import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { WhatsAppIcon } from "@/components/icons";
import { CATEGORY_FILTERS, POLICY_PAGES, SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-4">
            <Mascot size={72} animate="none" decorative shadow={false} />
            <div>
              <p className="font-display text-3xl font-extrabold text-saffron">{SITE.name}</p>
              <p className="font-tamil text-lg text-turmeric">{SITE.nameTa}</p>
            </div>
          </div>
          <p className="mt-4 max-w-md text-cream/75">
            {SITE.tagline}. Traditional South Indian breakfasts made instant. {SITE.claims.join(" · ")}.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
            <BadgeCheck className="h-4 w-4 text-turmeric" aria-hidden />
            FSSAI Lic. No. {SITE.fssai}
          </p>
        </div>

        <nav aria-label="Shop">
          <h2 className="font-display text-lg font-bold text-turmeric">Shop</h2>
          <ul className="mt-3 space-y-2 text-cream/80">
            <li><Link className="hover:text-white hover:underline" href="/shop">All products</Link></li>
            {CATEGORY_FILTERS.map((c) => (
              <li key={c.slug}>
                <Link className="hover:text-white hover:underline" href={`/shop?category=${c.slug}`}>
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-lg font-bold text-turmeric">Help</h2>
          <ul className="mt-3 space-y-2 text-cream/80">
            <li>
              <a className="inline-flex items-center gap-2 hover:text-white hover:underline" href={SITE.whatsappUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="h-4 w-4" /> {SITE.whatsappDisplay}
              </a>
            </li>
            <li>
              <a className="hover:text-white hover:underline" href={SITE.whatsappCatalogueUrl} target="_blank" rel="noopener noreferrer">
                WhatsApp catalogue
              </a>
            </li>
            {POLICY_PAGES.map((p) => (
              <li key={p.slug}>
                <Link className="hover:text-white hover:underline" href={`/policies/${p.slug}`}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-sm text-cream/60">
        © {new Date().getFullYear()} {SITE.name}. Traditional recipes, made instant.
      </div>
    </footer>
  );
}
