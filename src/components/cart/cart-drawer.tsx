"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, ShoppingBag, X } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { useCart } from "./cart-provider";
import { CartLines, FreeDeliveryMeter } from "./cart-lines";
import { EmptyCart } from "./empty-cart";
import { Mascot, SpeechBubble } from "@/components/mascot";

/**
 * Slide-out cart built on the native <dialog>: modal focus trapping, Esc to close and an
 * inert background come for free. The slide-in is CSS-only and disabled for reduced motion.
 */
export function CartDrawer() {
  const { cart, isOpen, close, notice, clearNotice } = useCart();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="cart-drawer-title"
      onClose={() => {
        close();
        clearNotice();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close(); // click on the backdrop
      }}
      className="cart-drawer fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-md bg-cream p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <h2 id="cart-drawer-title" className="flex items-center gap-2 font-display text-2xl font-extrabold">
            <ShoppingBag className="h-6 w-6 text-saffron" aria-hidden /> Your cart
            {cart.count > 0 && (
              <span className="rounded-full bg-saffron px-2.5 text-base text-white">{cart.count}</span>
            )}
          </h2>
          <button
            type="button"
            onClick={close}
            className="grid h-11 w-11 place-items-center rounded-full border-2 border-ink/15 transition hover:bg-ink hover:text-white"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        {notice && (
          <p role="status" className="mx-5 mt-4 rounded-2xl bg-turmeric/30 px-4 py-2 text-sm font-semibold">
            {notice}
          </p>
        )}

        {cart.lines.length === 0 ? (
          <div className="flex-1 overflow-y-auto px-5">
            <EmptyCart onNavigate={close} compact />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              <CartLines lines={cart.lines} compact onNavigate={close} />
              <div className="flex items-end justify-center gap-2 pb-6 pt-4" aria-hidden>
                <Mascot size={78} animate="float" decorative />
                <SpeechBubble tail="left" className="mb-8 text-base">
                  {cart.count > 2 ? "Now that's a breakfast plan!" : "Great pick! Hungry for more?"}
                </SpeechBubble>
              </div>
            </div>
            <footer className="space-y-3 border-t border-ink/10 bg-white px-5 py-4">
              <FreeDeliveryMeter subtotal={cart.subtotalInPaise} />
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-ink-soft">Subtotal</span>
                <span className="font-display text-2xl font-extrabold">{formatPaise(cart.subtotalInPaise)}</span>
              </div>
              <p className="text-xs text-ink-soft">Inclusive of taxes. Delivery and coupons at checkout.</p>
              {cart.hasIssues && (
                <p className="text-sm font-semibold text-chekka">Some items need attention before checkout.</p>
              )}
              <div className="flex gap-2">
                <Link
                  href="/cart"
                  onClick={close}
                  className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border-2 border-ink px-4 font-display text-lg font-bold transition hover:bg-ink hover:text-white"
                >
                  View cart
                </Link>
                <Link
                  href="/checkout"
                  onClick={close}
                  aria-disabled={cart.hasIssues}
                  className="inline-flex min-h-12 flex-[1.4] items-center justify-center gap-2 rounded-full bg-saffron px-4 font-display text-lg font-bold text-white shadow-[0_5px_0_0_var(--color-saffron-deep)] transition hover:bg-saffron-deep active:translate-y-1 active:shadow-none aria-disabled:pointer-events-none aria-disabled:opacity-50"
                >
                  Checkout <ArrowRight className="h-5 w-5" aria-hidden />
                </Link>
              </div>
            </footer>
          </>
        )}
      </div>
    </dialog>
  );
}
