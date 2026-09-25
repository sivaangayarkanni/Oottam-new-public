"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CartChange, CartView } from "@/lib/cart";
import { addToCart, removeFromCart, setCartQuantity } from "@/app/actions/cart";

type DeliveryHint = { feeInPaise: number; freeAboveInPaise: number };

type CartContextValue = {
  cart: CartView;
  delivery: DeliveryHint;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  notice: string | null;
  clearNotice: () => void;
  pendingVariant: string | null;
  isPending: boolean;
  add: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Client cart state. The server renders the initial cart in the root layout; every change goes
 * through a Server Action that returns the freshly re-priced cart from the database.
 */
export function CartProvider({
  initial,
  delivery,
  children,
}: {
  initial: CartView;
  delivery: DeliveryHint;
  children: React.ReactNode;
}) {
  // Re-sync when the server sends a new cart (navigation / revalidation) without an effect.
  const [synced, setSynced] = useState({ src: initial, cart: initial });
  let cart = synced.cart;
  if (synced.src !== initial) {
    setSynced({ src: initial, cart: initial });
    cart = initial;
  }
  const [isOpen, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingVariant, setPendingVariant] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const run = useCallback(
    (variantId: string, action: () => Promise<CartChange>, openAfter = false) => {
      setPendingVariant(variantId);
      startTransition(async () => {
        try {
          const res = await action();
          setSynced((s) => ({ ...s, cart: res.cart }));
          setNotice(res.notice);
          if (openAfter) setOpen(true);
          // Checkout totals are server-rendered; refresh them when the cart changes there.
          if (pathname.startsWith("/checkout")) router.refresh();
        } catch {
          setNotice("Something went wrong. Please try again.");
        } finally {
          setPendingVariant(null);
        }
      });
    },
    [pathname, router],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      delivery,
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      notice,
      clearNotice: () => setNotice(null),
      pendingVariant,
      isPending,
      add: (id, q = 1) => run(id, () => addToCart(id, q), true),
      setQuantity: (id, q) => run(id, () => setCartQuantity(id, q)),
      remove: (id) => run(id, () => removeFromCart(id)),
    }),
    [cart, delivery, isOpen, notice, pendingVariant, isPending, run],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
