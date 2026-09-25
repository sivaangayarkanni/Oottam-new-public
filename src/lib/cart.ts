/**
 * Cart service. Prices always come from the database at read time; the cart only stores
 * variant ids and quantities. Quantities are clamped to live stock and MAX_QTY_PER_LINE.
 */
import { MAX_QTY_PER_LINE } from "./config";
import type { Db } from "./db";

export type CartIssue = "out_of_stock" | "exceeds_stock" | "unavailable";

export type CartLine = {
  variantId: string;
  sku: string;
  productSlug: string;
  productName: string;
  productNameTa: string | null;
  flavourEn: string;
  sizeGrams: number;
  imageUrl: string | null;
  color: string;
  unitPriceInPaise: number;
  unitMrpInPaise: number;
  quantity: number;
  stock: number;
  maxQuantity: number;
  lineTotalInPaise: number;
  isSampleData: boolean;
  issue: CartIssue | null;
};

export type CartView = {
  id: string | null;
  lines: CartLine[];
  count: number;
  subtotalInPaise: number;
  hasIssues: boolean;
};

export const EMPTY_CART: CartView = { id: null, lines: [], count: 0, subtotalInPaise: 0, hasIssues: false };

const lineInclude = {
  variant: {
    include: {
      product: {
        include: { images: { orderBy: { sortOrder: "asc" as const }, take: 1 }, category: { select: { isActive: true } } },
      },
    },
  },
} as const;

export async function loadCart(db: Db, cartId: string | null | undefined): Promise<CartView> {
  if (!cartId) return EMPTY_CART;
  const items = await db.cartItem.findMany({
    where: { cartId },
    orderBy: { createdAt: "asc" },
    include: lineInclude,
  });
  const lines: CartLine[] = items.map(({ variant: v, quantity }) => {
    const available = v.isActive && v.product.isActive && v.product.category.isActive;
    const issue: CartIssue | null = !available
      ? "unavailable"
      : v.stock <= 0
        ? "out_of_stock"
        : quantity > v.stock
          ? "exceeds_stock"
          : null;
    const payable = issue === null ? quantity : 0;
    return {
      variantId: v.id,
      sku: v.sku,
      productSlug: v.product.slug,
      productName: v.product.nameEn,
      productNameTa: v.product.nameTa,
      flavourEn: v.flavourEn,
      sizeGrams: v.sizeGrams,
      imageUrl: v.product.images[0]?.url ?? null,
      color: v.product.familyColor ?? "#f57c00",
      unitPriceInPaise: v.priceInPaise,
      unitMrpInPaise: v.mrpInPaise,
      quantity,
      stock: Math.max(v.stock, 0),
      maxQuantity: Math.max(Math.min(v.stock, MAX_QTY_PER_LINE), 0),
      lineTotalInPaise: v.priceInPaise * payable,
      isSampleData: v.isSampleData,
      issue,
    };
  });
  return {
    id: cartId,
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotalInPaise: lines.reduce((n, l) => n + l.lineTotalInPaise, 0),
    hasIssues: lines.some((l) => l.issue !== null),
  };
}

export async function findUserCartId(db: Db, userId: string): Promise<string | null> {
  const cart = await db.cart.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { id: true } });
  return cart?.id ?? null;
}

export async function findGuestCartId(db: Db, guestToken: string | null): Promise<string | null> {
  if (!guestToken) return null;
  const cart = await db.cart.findUnique({ where: { guestToken }, select: { id: true, userId: true } });
  return cart && !cart.userId ? cart.id : null;
}

export async function createCart(db: Db, owner: { userId: string } | { guestToken: string }) {
  const expiresAt = "guestToken" in owner ? new Date(Date.now() + 30 * 24 * 3600 * 1000) : null;
  const cart = await db.cart.create({ data: { ...owner, expiresAt }, select: { id: true } });
  return cart.id;
}

export type CartChange = { cart: CartView; notice: string | null };

/**
 * Add (`mode: "add"`) or set (`mode: "set"`) a line's quantity. 0 removes the line.
 * Returns a friendly notice when the quantity had to be limited by stock.
 */
export async function changeCartItem(
  db: Db,
  cartId: string,
  variantId: string,
  quantity: number,
  mode: "add" | "set",
): Promise<CartChange> {
  const variant = await db.productVariant.findFirst({
    where: { id: variantId, isActive: true, product: { isActive: true, category: { isActive: true } } },
    select: { id: true, stock: true },
  });
  let notice: string | null = null;
  if (!variant) {
    await db.cartItem.deleteMany({ where: { cartId, variantId } });
    return { cart: await loadCart(db, cartId), notice: "Sorry, that item is no longer available." };
  }
  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } });
  const wanted = mode === "add" ? (existing?.quantity ?? 0) + quantity : quantity;
  const cap = Math.min(variant.stock, MAX_QTY_PER_LINE);
  const next = Math.max(Math.min(wanted, cap), 0);
  if (wanted > cap) {
    notice =
      variant.stock <= 0
        ? "Sorry, that pack just sold out."
        : variant.stock < MAX_QTY_PER_LINE
          ? `Only ${variant.stock} in stock, so we've set your quantity to ${next}.`
          : `You can add up to ${MAX_QTY_PER_LINE} of each pack.`;
  }
  if (next <= 0) {
    await db.cartItem.deleteMany({ where: { cartId, variantId } });
  } else {
    await db.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      update: { quantity: next },
      create: { cartId, variantId, quantity: next },
    });
  }
  await db.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
  return { cart: await loadCart(db, cartId), notice };
}

/**
 * On login: move the guest cart's lines into the user's cart (summing quantities, clamped to
 * stock), then delete the guest cart. If the user has no cart, the guest cart is simply adopted.
 */
export async function mergeGuestCart(db: Db, guestToken: string | null, userId: string): Promise<string | null> {
  const guestCartId = await findGuestCartId(db, guestToken);
  const userCartId = await findUserCartId(db, userId);
  if (!guestCartId) return userCartId;
  if (!userCartId) {
    await db.cart.update({ where: { id: guestCartId }, data: { userId, guestToken: null, expiresAt: null } });
    return guestCartId;
  }
  await db.$transaction(async (tx) => {
    const guestItems = await tx.cartItem.findMany({
      where: { cartId: guestCartId },
      include: { variant: { select: { stock: true } } },
    });
    for (const item of guestItems) {
      const current = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId: userCartId, variantId: item.variantId } },
      });
      const qty = Math.min((current?.quantity ?? 0) + item.quantity, item.variant.stock, MAX_QTY_PER_LINE);
      if (qty <= 0) continue;
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCartId, variantId: item.variantId } },
        update: { quantity: qty },
        create: { cartId: userCartId, variantId: item.variantId, quantity: qty },
      });
    }
    await tx.cart.delete({ where: { id: guestCartId } });
    await tx.cart.update({ where: { id: userCartId }, data: { updatedAt: new Date() } });
  });
  return userCartId;
}
