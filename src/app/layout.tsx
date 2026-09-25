import type { Metadata, Viewport } from "next";
import { Baloo_Thambi_2, Nunito, Noto_Sans_Tamil } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SampleBanner } from "@/components/sample-banner";
import { SITE } from "@/lib/site";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { getDeliveryRule } from "@/lib/config";
import { getCurrentUser } from "@/server/auth";
import { getCartView } from "@/server/cart";
import "./globals.css";

// Playful rounded display face with Tamil support
const display = Baloo_Thambi_2({ variable: "--nf-display", subsets: ["latin", "tamil"] });
const body = Nunito({ variable: "--nf-body", subsets: ["latin"] });
// Tamil script support for bilingual (EN/TA) content
const tamil = Noto_Sans_Tamil({ variable: "--nf-tamil", subsets: ["tamil"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} (${SITE.nameTa}) | ${SITE.tagline} South Indian breakfast mixes`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_IN",
    images: [{ url: "/images/posters/rava-dosa-mix-green.jpg", width: 1076, height: 1600 }],
  },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#f57c00",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [user, cart] = await Promise.all([getCurrentUser(), getCartView()]);
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${tamil.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <MotionProvider>
          <CartProvider initial={cart} delivery={getDeliveryRule()}>
            <SampleBanner />
            <SiteHeader user={user ? { name: user.name } : null} />
            <div id="main" className="flex flex-1 flex-col">
              {children}
            </div>
            <SiteFooter />
            <CartDrawer />
          </CartProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
