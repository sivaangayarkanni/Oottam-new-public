"use server";

import { prisma } from "@/lib/prisma";
import { changeCartItem, EMPTY_CART, type CartChange } from "@/lib/cart";
import { cartMutationSchema } from "@/lib/validation";
import { currentCartId, ensureCartId, getCartView } from "@/server/cart";

// Server Actions are POST-only and Next.js rejects requests whose Origin doesn't match the
// Host, which is our CSRF protection for every mutation below.

export async function addToCart(variantId: string, quantity = 1): Promise<CartChange> {
  const input = cartMutationSchema.safeParse({ variantId, quantity });
  if (!input.success || input.data.quantity < 1) return { cart: await getCartView(), notice: "Couldn't add that item." };
  const cartId = await ensureCartId();
  return changeCartItem(prisma, cartId, input.data.variantId, input.data.quantity, "add");
}

export async function setCartQuantity(variantId: string, quantity: number): Promise<CartChange> {
  const input = cartMutationSchema.safeParse({ variantId, quantity });
  if (!input.success) return { cart: await getCartView(), notice: "Couldn't update that item." };
  const cartId = await currentCartId();
  if (!cartId) return { cart: EMPTY_CART, notice: null };
  return changeCartItem(prisma, cartId, input.data.variantId, input.data.quantity, "set");
}

export async function removeFromCart(variantId: string): Promise<CartChange> {
  return setCartQuantity(variantId, 0);
}

export async function refreshCart(): Promise<CartChange> {
  return { cart: await getCartView(), notice: null };
}
