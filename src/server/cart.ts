import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createCart, findGuestCartId, findUserCartId, loadCart, mergeGuestCart } from "@/lib/cart";
import { randomToken, signValue, unsignValue } from "@/lib/tokens";
import { getCurrentUser } from "./auth";
import { secureCookies } from "./request";

export const CART_COOKIE = "oottam_cart";
const CART_PURPOSE = "guest-cart";

async function guestToken(): Promise<string | null> {
  return unsignValue(CART_PURPOSE, (await cookies()).get(CART_COOKIE)?.value);
}

/** Read-only: safe to call while rendering. */
export async function currentCartId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (user) return findUserCartId(prisma, user.id);
  return findGuestCartId(prisma, await guestToken());
}

export async function getCartView() {
  return loadCart(prisma, await currentCartId());
}

/** Server Actions only (sets the guest cookie on first use). */
export async function ensureCartId(): Promise<string> {
  const user = await getCurrentUser();
  if (user) return (await findUserCartId(prisma, user.id)) ?? createCart(prisma, { userId: user.id });
  const existing = await findGuestCartId(prisma, await guestToken());
  if (existing) return existing;
  const token = randomToken(24);
  const id = await createCart(prisma, { guestToken: token });
  (await cookies()).set(CART_COOKIE, signValue(CART_PURPOSE, token), {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
  return id;
}

/** Called right after login: fold the guest cart into the user's cart and drop the cookie. */
export async function mergeGuestCartInto(userId: string) {
  const jar = await cookies();
  await mergeGuestCart(prisma, await guestToken(), userId);
  jar.delete(CART_COOKIE);
}
