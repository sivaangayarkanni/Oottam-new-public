export const SITE = {
  name: "Oottam",
  nameTa: "ஊட்டம்",
  tagline: "Instant and Healthy",
  description:
    "Oottam (ஊட்டம்) makes instant South Indian breakfast mixes from traditional recipes: Natural, No Preservative, No Added Colors.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  fssai: "22425571000318",
  whatsappDisplay: "+91 92455 37575",
  whatsappUrl: "https://wa.me/919245537575",
  whatsappCatalogueUrl: "https://wa.me/c/919245537575",
  claims: ["Natural", "No Preservative", "No Added Colors"] as const,
};

export function whatsappOrderUrl(text?: string) {
  return text ? `${SITE.whatsappUrl}?text=${encodeURIComponent(text)}` : SITE.whatsappUrl;
}

export const CATEGORY_FILTERS = [
  { slug: "rava-dosa-mix", label: "Rava Dosa" },
  { slug: "adai-mix", label: "Adai" },
  { slug: "pongal-mix", label: "Pongal" },
  { slug: "paarambariyam", label: "Paarambariyam" },
] as const;

export const TAG_FILTERS = [
  { slug: "millet", label: "Millet" },
  { slug: "greens", label: "Greens" },
  { slug: "traditional", label: "Traditional" },
] as const;

export const POLICY_PAGES = [
  { slug: "privacy", title: "Privacy Policy" },
  { slug: "terms", title: "Terms of Service" },
  { slug: "refunds", title: "Refund & Cancellation Policy" },
  { slug: "shipping", title: "Shipping Policy" },
] as const;
