"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { useCart } from "./cart-provider";
import { CartLines, FreeDeliveryMeter } from "./cart-lines";
import { EmptyCart } from "./empty-cart";

export function CartPageView() {
  const { cart, notice, delivery } = useCart();
  if (cart.lines.length === 0) return <EmptyCart />;
  const estShipping =
    delivery.freeAboveInPaise && cart.subtotalInPaise >= delivery.freeAboveInPaise ? 0 : delivery.feeInPaise;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section aria-labelledby="items-h" className="rounded-[2rem] bg-white p-5 ring-1 ring-ink/10 sm:p-7">
        <h2 id="items-h" className="sr-only">Items</h2>
        {notice && (
          <p role="status" className="mb-2 rounded-2xl bg-turmeric/30 px-4 py-2 text-sm font-semibold">
            {notice}
          </p>
        )}
        <CartLines lines={cart.lines} />
      </section>
      <aside aria-labelledby="summary-h" className="h-fit space-y-4 rounded-[2rem] border-2 border-ink bg-white p-6 shadow-[6px_6px_0_0_var(--color-ink)] lg:sticky lg:top-24">
        <h2 id="summary-h" className="font-display text-2xl font-extrabold">Summary</h2>
        <FreeDeliveryMeter subtotal={cart.subtotalInPaise} />
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Subtotal ({cart.count} {cart.count === 1 ? "pack" : "packs"})</dt>
            <dd className="font-bold">{formatPaise(cart.subtotalInPaise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Delivery (estimate)</dt>
            <dd className="font-bold">{estShipping === 0 ? "Free" : formatPaise(estShipping)}</dd>
          </div>
        </dl>
        <p className="text-xs text-ink-soft">Prices include taxes. Apply coupons at checkout; final totals are confirmed there.</p>
        <Link
          href="/checkout"
          aria-disabled={cart.hasIssues}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-saffron px-6 font-display text-lg font-bold text-white shadow-[0_6px_0_0_var(--color-saffron-deep)] transition hover:bg-saffron-deep active:translate-y-1 active:shadow-none aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Checkout <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
        {cart.hasIssues && <p className="text-sm font-semibold text-chekka">Fix the highlighted items to continue.</p>}
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <ShieldCheck className="h-4 w-4 text-leaf" aria-hidden /> Guest checkout available
        </p>
      </aside>
    </div>
  );
}
