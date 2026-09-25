"use client";

import { ShoppingBag } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useCart } from "./cart-provider";

export function CartButton() {
  const { cart, open } = useCart();
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      onClick={open}
      aria-haspopup="dialog"
      aria-label={`Open cart, ${cart.count} ${cart.count === 1 ? "item" : "items"}`}
      className="relative grid h-11 w-11 place-items-center rounded-full border-2 border-ink/15 text-ink transition hover:border-saffron hover:bg-saffron/10"
    >
      <ShoppingBag className="h-5 w-5" aria-hidden />
      <AnimatePresence>
        {cart.count > 0 && (
          <motion.span
            key={cart.count}
            initial={reduce ? false : { scale: 0.4 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-saffron px-1 text-[11px] font-extrabold text-white ring-2 ring-cream"
            aria-hidden
          >
            {cart.count > 99 ? "99+" : cart.count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
