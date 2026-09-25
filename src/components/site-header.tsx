import Image from "next/image";
import Link from "next/link";
import { Menu, ShoppingBag } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons";
import { SITE } from "@/lib/site";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?category=paarambariyam", label: "Paarambariyam" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#why-oottam", label: "Why Oottam" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Oottam home">
          <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-saffron/15 ring-2 ring-saffron/40">
            <Image
              src="/images/mascot/oottam-chef.png"
              alt=""
              width={225}
              height={296}
              className="mt-5 w-9"
              loading="eager"
            />
          </span>
          <span className="leading-none">
            <span className="block font-display text-2xl font-extrabold text-saffron-deep">{SITE.name}</span>
            <span className="block font-tamil text-xs font-semibold text-leaf">{SITE.nameTa}</span>
          </span>
        </Link>

        <nav aria-label="Main" className="ml-6 hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="rounded-full px-3 py-2 font-semibold text-ink-soft transition hover:bg-saffron/10 hover:text-ink"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={SITE.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-full bg-[#1f8f4e] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#146236] sm:inline-flex"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Order on WhatsApp
          </a>
          <span
            role="img"
            aria-label="Cart (coming soon)"
            title="Cart coming soon"
            className="relative grid h-11 w-11 cursor-not-allowed place-items-center rounded-full border-2 border-ink/15 text-ink/50"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden />
            <span className="absolute -right-1 -top-1 rounded-full bg-turmeric px-1.5 text-[10px] font-bold text-ink">
              soon
            </span>
          </span>

          {/* Mobile menu: native <details> keeps it keyboard-accessible without client JS */}
          <details className="group relative md:hidden">
            <summary className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-full border-2 border-ink/15 [&::-webkit-details-marker]:hidden">
              <Menu className="h-5 w-5" aria-hidden />
              <span className="sr-only">Open menu</span>
            </summary>
            <nav
              aria-label="Mobile"
              className="absolute right-0 top-14 w-60 rounded-3xl border border-ink/10 bg-white p-3 shadow-xl"
            >
              <ul className="flex flex-col">
                {NAV.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="block rounded-2xl px-4 py-3 font-semibold hover:bg-cream">
                      {n.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <a
                    href={SITE.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-2 rounded-2xl bg-[#1f8f4e] px-4 py-3 font-bold text-white"
                  >
                    <WhatsAppIcon className="h-4 w-4" /> Order on WhatsApp
                  </a>
                </li>
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
