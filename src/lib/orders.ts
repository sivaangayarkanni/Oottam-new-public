/**
 * Checkout quoting, order placement and stock release.
 *
 * placeOrder runs in ONE database transaction:
 *   1. re-reads the cart and live variant prices (client prices are never used),
 *   2. reserves stock with `UPDATE … SET stock = stock - q WHERE stock >= q` per line
 *      (row-locked, so concurrent checkouts can never oversell),
 *   3. validates + redeems the coupon with a guarded usedCount increment,
 *   4. snapshots address + item prices, allocates OTM-YYYY-NNNNNN from a sequence,
 *   5. creates the Order (PENDING), a Payment placeholder (CREATED, for module 4) and clears the cart.
 * An idempotency key (unique) makes double-submits return the first order instead of a new one.
 */
import { Prisma } from "@/generated/prisma/client";
import type { DeliveryRule } from "./config";
import type { Db, Tx } from "./db";
import { computeTotals, type CouponLike, type Totals } from "./pricing";
import { loadCart, type CartView } from "./cart";

export type AddressSnapshot = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  district?: string | null;
  state: string;
  pincode: string;
  country: "IN";
};

export class OrderError extends Error {
  constructor(
    readonly code: "empty_cart" | "stock" | "coupon" | "total_changed" | "idempotency_conflict",
    message: string,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

async function couponUsesByCustomer(
  db: Db | Tx,
  couponId: string,
  who: { userId?: string | null; phone?: string | null },
): Promise<number> {
  const or: Prisma.OrderWhereInput[] = [];
  if (who.userId) or.push({ userId: who.userId });
  if (who.phone) or.push({ customerPhone: who.phone });
  if (!or.length) return 0;
  return db.order.count({ where: { couponId, status: { not: "CANCELLED" }, OR: or } });
}

async function findCoupon(db: Db | Tx, code: string | null | undefined) {
  if (!code) return null;
  return db.coupon.findUnique({ where: { code: code.toUpperCase() } });
}

export type Quote = { cart: CartView; totals: Totals };

/** Server-side preview of totals for the checkout page (same maths as placeOrder). */
export async function quoteCheckout(
  db: Db,
  opts: { cartId: string | null; couponCode?: string | null; userId?: string | null; phone?: string | null; rule: DeliveryRule; now?: Date },
): Promise<Quote> {
  const cart = await loadCart(db, opts.cartId);
  const coupon = await findCoupon(db, opts.couponCode);
  const timesUsed = coupon ? await couponUsesByCustomer(db, coupon.id, opts) : 0;
  const totals = computeTotals({
    lines: cart.lines.map((l) => ({ unitPriceInPaise: l.unitPriceInPaise, quantity: l.issue ? 0 : l.quantity })),
    rule: opts.rule,
    coupon: coupon as CouponLike | null,
    couponCode: opts.couponCode,
    now: opts.now,
    timesUsedByCustomer: timesUsed,
  });
  return { cart, totals };
}

export type PlaceOrderInput = {
  cartId: string;
  userId: string | null;
  idempotencyKey: string;
  contact: { name: string; phone: string; email?: string | null };
  shippingAddress: AddressSnapshot;
  couponCode?: string | null;
  paymentMethod: "RAZORPAY" | "COD" | "UPI";
  /** UPI only: payee VPA snapshot stored on the Payment row. */
  upiVpa?: string | null;
  /** When an unpaid online order should release its stock (null = legacy TTL rule). */
  paymentDueAt?: Date | null;
  notes?: string | null;
  /** Total the customer saw; if prices changed meanwhile we stop and show the new total. */
  expectedTotalInPaise?: number;
  rule: DeliveryRule;
  now?: Date;
};

export type PlacedOrder = { id: string; orderNumber: string; totalInPaise: number; status: string; duplicate: boolean };

function isUniqueViolation(err: unknown, field: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return false;
  const target = JSON.stringify(err.meta ?? {});
  return target.includes(field);
}

async function existingForKey(db: Db, input: PlaceOrderInput): Promise<PlacedOrder | null> {
  const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (!existing) return null;
  const sameOwner = input.userId ? existing.userId === input.userId : existing.customerPhone === input.contact.phone;
  if (!sameOwner) throw new OrderError("idempotency_conflict", "This checkout was already used. Please refresh and try again.");
  return {
    id: existing.id,
    orderNumber: existing.orderNumber,
    totalInPaise: existing.totalInPaise,
    status: existing.status,
    duplicate: true,
  };
}

export function formatOrderNumber(year: number, seq: bigint | number): string {
  return `OTM-${year}-${String(seq).padStart(6, "0")}`;
}

export async function placeOrder(db: Db, input: PlaceOrderInput): Promise<PlacedOrder> {
  const now = input.now ?? new Date();
  const prior = await existingForKey(db, input);
  if (prior) return prior;

  try {
    return await db.$transaction(
      async (tx) => {
        const items = await tx.cartItem.findMany({ where: { cartId: input.cartId }, orderBy: { variantId: "asc" } });
        if (!items.length) throw new OrderError("empty_cart", "Your cart is empty.");

        // Reserve stock line by line (consistent order avoids deadlocks between concurrent checkouts).
        const lines = [];
        for (const item of items) {
          // Single guarded UPDATE: Postgres re-checks `stock >= q` after taking the row lock.
          const reserved = await tx.$executeRaw`
            UPDATE "ProductVariant" SET "stock" = "stock" - ${item.quantity}, "updatedAt" = now()
            WHERE id = ${item.variantId} AND "isActive" = true AND "stock" >= ${item.quantity}`;
          const v = await tx.productVariant.findUniqueOrThrow({
            where: { id: item.variantId },
            include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
          });
          if (!v.product.isActive) {
            throw new OrderError("stock", `${v.product.nameEn} is no longer available. Please remove it from your cart.`);
          }
          if (reserved !== 1) {
            throw new OrderError(
              "stock",
              v.stock > 0
                ? `Only ${v.stock} of ${v.product.nameEn} (${v.flavourEn}) left. Please update your cart.`
                : `${v.product.nameEn} (${v.flavourEn}) just sold out. Please remove it from your cart.`,
            );
          }
          lines.push({ item, v });
        }

        const coupon = await findCoupon(tx, input.couponCode);
        if (input.couponCode && !coupon) throw new OrderError("coupon", "That coupon code doesn't exist.");
        const timesUsed = coupon
          ? await couponUsesByCustomer(tx, coupon.id, { userId: input.userId, phone: input.contact.phone })
          : 0;
        const totals = computeTotals({
          lines: lines.map(({ item, v }) => ({ unitPriceInPaise: v.priceInPaise, quantity: item.quantity })),
          rule: input.rule,
          coupon: coupon as CouponLike | null,
          now,
          timesUsedByCustomer: timesUsed,
        });
        if (totals.coupon && !totals.coupon.ok) throw new OrderError("coupon", totals.coupon.message);
        if (coupon) {
          const redeemed = await tx.$executeRaw`
            UPDATE "Coupon" SET "usedCount" = "usedCount" + 1, "updatedAt" = now()
            WHERE id = ${coupon.id} AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
          if (redeemed !== 1) throw new OrderError("coupon", "This coupon has just been fully redeemed.");
        }
        if (input.expectedTotalInPaise !== undefined && input.expectedTotalInPaise !== totals.totalInPaise) {
          throw new OrderError("total_changed", "Prices or offers changed since you opened checkout. Please review the new total.");
        }

        const [{ seq }] = await tx.$queryRaw<{ seq: bigint }[]>`SELECT nextval('order_number_seq') AS seq`;
        const orderNumber = formatOrderNumber(now.getFullYear(), seq);
        const isCod = input.paymentMethod === "COD";

        const order = await tx.order.create({
          data: {
            orderNumber,
            idempotencyKey: input.idempotencyKey,
            userId: input.userId,
            status: isCod ? "CONFIRMED" : "PENDING",
            confirmedAt: isCod ? now : null,
            paymentMethod: input.paymentMethod,
            paymentDueAt: isCod ? null : (input.paymentDueAt ?? null),
            customerName: input.contact.name,
            customerPhone: input.contact.phone,
            customerEmail: input.contact.email ?? null,
            shippingAddress: input.shippingAddress,
            subtotalInPaise: totals.subtotalInPaise,
            discountInPaise: totals.discountInPaise,
            shippingInPaise: totals.shippingInPaise,
            taxInPaise: totals.taxInPaise,
            totalInPaise: totals.totalInPaise,
            couponId: coupon?.id ?? null,
            couponCode: coupon?.code ?? null,
            notes: input.notes ?? null,
            placedAt: now,
            items: {
              create: lines.map(({ item, v }) => ({
                variantId: v.id,
                productNameEn: v.product.nameEn,
                productNameTa: v.product.nameTa,
                flavourEn: v.flavourEn,
                flavourTa: v.flavourTa,
                sizeGrams: v.sizeGrams,
                sku: v.sku,
                imageUrl: v.product.images[0]?.url ?? null,
                unitPriceInPaise: v.priceInPaise,
                unitMrpInPaise: v.mrpInPaise,
                quantity: item.quantity,
                lineTotalInPaise: v.priceInPaise * item.quantity,
              })),
            },
            // One Payment row per attempt. Provider-specific data (UPI UTR, Razorpay ids) lives on it.
            payments: {
              create: {
                provider: isCod ? "cod" : input.paymentMethod === "UPI" ? "upi" : "razorpay",
                status: "CREATED",
                amountInPaise: totals.totalInPaise,
                upiVpa: input.paymentMethod === "UPI" ? (input.upiVpa ?? null) : null,
              },
            },
          },
        });

        await tx.cartItem.deleteMany({ where: { cartId: input.cartId } });
        await tx.cart.update({ where: { id: input.cartId }, data: { couponId: null } });

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          totalInPaise: order.totalInPaise,
          status: order.status,
          duplicate: false,
        };
      },
      { timeout: 15_000, maxWait: 10_000 },
    );
  } catch (err) {
    if (isUniqueViolation(err, "idempotencyKey")) {
      const again = await existingForKey(db, input);
      if (again) return again;
    }
    throw err;
  }
}

/** Payment states that mean "money may already have moved", so the order must never auto-cancel. */
export const PROTECTED_PAYMENT_STATUSES = ["PENDING_VERIFICATION", "AUTHORIZED", "CAPTURED"] as const;

/** Lock an order row for the rest of the transaction (serialises UTR submit / verify / expiry). */
export async function lockOrder(tx: Tx, orderId: string) {
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
}

/**
 * Cancel a PENDING order and give its stock + coupon use back. Caller must hold the order lock.
 * Returns false if the order was no longer PENDING / already released.
 */
export async function cancelAndReleaseStock(
  tx: Tx,
  orderId: string,
  opts: { reason: string; now: Date; actorId?: string | null; auditAction: string },
): Promise<boolean> {
  const claimed = await tx.order.updateMany({
    where: { id: orderId, status: "PENDING", stockReleasedAt: null },
    data: { status: "CANCELLED", cancelledAt: opts.now, cancelReason: opts.reason, stockReleasedAt: opts.now },
  });
  if (claimed.count !== 1) return false;
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  for (const item of order.items) {
    if (!item.variantId) continue;
    await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
  }
  if (order.couponId) {
    await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE id = ${order.couponId}`;
  }
  await tx.payment.updateMany({
    where: { orderId, status: "CREATED" },
    data: { status: "FAILED", errorCode: "EXPIRED", errorDescription: opts.reason },
  });
  await tx.auditLog.create({
    data: {
      actorId: opts.actorId ?? null,
      action: opts.auditAction,
      entityType: "Order",
      entityId: orderId,
      after: { status: "CANCELLED", reason: opts.reason },
    },
  });
  return true;
}

/**
 * Release stock held by unpaid online orders (Razorpay or UPI).
 *
 * An order expires when `paymentDueAt` has passed (set per provider at checkout; UPI gets a longer
 * window), or, for legacy rows without `paymentDueAt`, when it is older than `ttlMinutes`.
 * Orders with a submitted UPI reference (PENDING_VERIFICATION) or an authorised/captured payment
 * are NEVER auto-cancelled; staff decide those. Each order is re-checked under a row lock, so a
 * UTR submitted at the last second wins, and stock is returned exactly once even if several
 * schedulers run in parallel.
 */
export async function releaseExpiredOrders(
  db: Db,
  opts: { ttlMinutes: number; now?: Date; limit?: number },
): Promise<{ released: string[] }> {
  const now = opts.now ?? new Date();
  const legacyCutoff = new Date(now.getTime() - opts.ttlMinutes * 60_000);
  const candidates = await db.order.findMany({
    where: {
      status: "PENDING",
      paymentMethod: { in: ["RAZORPAY", "UPI"] },
      stockReleasedAt: null,
      OR: [{ paymentDueAt: { lt: now } }, { paymentDueAt: null, placedAt: { lt: legacyCutoff } }],
      payments: { none: { status: { in: [...PROTECTED_PAYMENT_STATUSES] } } },
    },
    select: { id: true, orderNumber: true },
    orderBy: { placedAt: "asc" },
    take: opts.limit ?? 200,
  });

  const released: string[] = [];
  for (const c of candidates) {
    const done = await db.$transaction(async (tx) => {
      await lockOrder(tx, c.id);
      const protectedPayment = await tx.payment.count({
        where: { orderId: c.id, status: { in: [...PROTECTED_PAYMENT_STATUSES] } },
      });
      if (protectedPayment > 0) return false;
      return cancelAndReleaseStock(tx, c.id, {
        reason: "Payment not received in time",
        now,
        auditAction: "order.expired_stock_released",
      });
    });
    if (done) released.push(c.orderNumber);
  }
  return { released };
}
