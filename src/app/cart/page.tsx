import type { Metadata } from "next";
import { CartPageView } from "@/components/cart/cart-page-view";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-5xl font-extrabold">Your cart</h1>
      <p className="mt-1 text-ink-soft">Everything you&apos;ve picked for breakfast.</p>
      <div className="mt-8">
        <CartPageView />
      </div>
    </main>
  );
}
