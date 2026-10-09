/**
 * Direct UPI payments with manual confirmation.
 *
 * Flow: order placed (Payment CREATED, provider "upi") → customer pays the exact amount by scanning a
 * per-order QR / tapping the upi:// link → enters the 12-digit UTR (Payment PENDING_VERIFICATION) →
 * OWNER/STAFF checks the bank app and confirms (Payment CAPTURED, Order CONFIRMED) or rejects
 * (Payment REJECTED; either a fresh CREATED attempt is opened or the order is cancelled and stock released).
 *
 * Each attempt is its own Payment row, so a rejected UTR stays on record (and can't be reused), and a
 * future Razorpay provider fits the same model.
 */
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "../db";
import { cancelAndReleaseStock, lockOrder } from "../orders";
import { notificationCopy, notifyStaff } from "../notifications";

export class PaymentError extends Error {
  constructor(
    readonly code:
      | "invalid_utr"
      | "duplicate_utr"
      | "rate_limited"
      | "not_awaiting"
      | "already_submitted"
      | "forbidden"
      | "not_found"
      | "invalid_reason",
    message: string,
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

// ── UPI link ──────────────────────────────────────────────

/** Paise → "539.00" (UPI `am` must be rupees with two decimals). */
export function upiAmount(paise: number): string {
  if (!Number.isInteger(paise) || paise <= 0) throw new Error("UPI amount must be a positive integer number of paise");
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`;
}

/** Build a `upi://pay` intent per NPCI's deep-link spec. Values are percent-encoded. */
export function buildUpiUri(opts: {
  vpa: string;
  payeeName: string;
  amountInPaise: number;
  orderNumber: string;
  includeTr?: boolean;
}): string {
  const params: [string, string][] = [
    ["pa", opts.vpa],
    ["pn", opts.payeeName],
    ["am", upiAmount(opts.amountInPaise)],
    ["cu", "INR"],
    ["tn", opts.orderNumber],
  ];
  if (opts.includeTr !== false) params.push(["tr", opts.orderNumber]);
  // encodeURIComponent turns '@' into %40, which some UPI apps reject in `pa`, so keep it literal.
  return `upi://pay?${params.map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%40/g, "@")}`).join("&")}`;
}

/** Parse a upi:// link back into its parameters (used by tests and the admin view). */
export function parseUpiUri(uri: string): Record<string, string> {
  const u = new URL(uri);
  return Object.fromEntries(u.searchParams.entries());
}

// ── Customer state ────────────────────────────────────────

export type PaymentView = "awaiting" | "verifying" | "paid" | "cod" | "cancelled" | "refunded";

/** One label the customer sees, derived from the order + its latest payment attempt. */
export function paymentView(order: {
  status: string;
  paymentMethod: string;
  payments: { status: string; createdAt: Date }[];
}): PaymentView {
  if (order.status === "CANCELLED") return "cancelled";
  if (order.status === "REFUNDED") return "refunded";
  if (order.paymentMethod === "COD") return "cod";
  const latest = [...order.payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (latest?.status === "CAPTURED" || latest?.status === "AUTHORIZED") return "paid";
  if (latest?.status === "PENDING_VERIFICATION") return "verifying";
  return order.status === "PENDING" ? "awaiting" : "paid";
}

// ── UTR submission ────────────────────────────────────────

export const UTR_RE = /^\d{12}$/;
export const UTR_LIMITS = { perOrderPerHour: 5, perIpPerHour: 15 } as const;

/** Accepts "1234 5678 9012" / "1234-5678-9012" and returns the 12 digits, or null. */
export function normalizeUtr(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  return UTR_RE.test(digits) ? digits : null;
}

function isUtrConflict(err: unknown) {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    JSON.stringify(err.meta ?? {}).includes("utr")
  );
}

/**
 * Record the customer's UTR on the order's open UPI attempt. Rate-limited per order and per IP
 * (attempts are logged to AuditLog, including failed ones), unique across all orders.
 */
export async function submitUpiReference(
  db: Db,
  opts: { orderId: string; utr: string; ip?: string | null; now?: Date },
) {
  const now = opts.now ?? new Date();
  const hourAgo = new Date(now.getTime() - 3_600_000);

  const [orderAttempts, ipAttempts] = await Promise.all([
    db.auditLog.count({ where: { action: "payment.utr_submit_attempt", entityId: opts.orderId, createdAt: { gte: hourAgo } } }),
    opts.ip
      ? db.auditLog.count({ where: { action: "payment.utr_submit_attempt", ipAddress: opts.ip, createdAt: { gte: hourAgo } } })
      : Promise.resolve(0),
  ]);
  if (orderAttempts >= UTR_LIMITS.perOrderPerHour || ipAttempts >= UTR_LIMITS.perIpPerHour) {
    throw new PaymentError("rate_limited", "Too many attempts. Please wait a while or message us on WhatsApp.");
  }
  await db.auditLog.create({
    data: { action: "payment.utr_submit_attempt", entityType: "Order", entityId: opts.orderId, ipAddress: opts.ip ?? null, createdAt: now },
  });

  const utr = normalizeUtr(opts.utr);
  if (!utr) throw new PaymentError("invalid_utr", "The UTR / UPI reference is 12 digits. Please check and try again.");

  try {
    return await db.$transaction(async (tx) => {
      await lockOrder(tx, opts.orderId);
      const order = await tx.order.findUnique({
        where: { id: opts.orderId },
        include: { payments: { orderBy: { createdAt: "desc" } } },
      });
      if (!order) throw new PaymentError("not_found", "Order not found.");
      if (order.status !== "PENDING" || order.paymentMethod !== "UPI" || order.stockReleasedAt) {
        throw new PaymentError("not_awaiting", "This order isn't waiting for a UPI payment.");
      }
      const latest = order.payments[0];
      if (latest?.status === "PENDING_VERIFICATION") {
        throw new PaymentError("already_submitted", "We already have a reference for this order and are verifying it.");
      }
      if (!latest || latest.status !== "CREATED" || latest.provider !== "upi") {
        throw new PaymentError("not_awaiting", "This order isn't waiting for a UPI payment.");
      }
      const reused = await tx.payment.findUnique({ where: { utr }, select: { id: true } });
      if (reused) throw new PaymentError("duplicate_utr", "This UTR has already been used for another payment.");

      const payment = await tx.payment.update({
        where: { id: latest.id },
        data: { utr, status: "PENDING_VERIFICATION", submittedAt: now, submittedIp: opts.ip ?? null },
      });
      await tx.auditLog.create({
        data: {
          action: "payment.utr_submitted",
          entityType: "Payment",
          entityId: payment.id,
          ipAddress: opts.ip ?? null,
          after: { orderNumber: order.orderNumber, utr, amountInPaise: payment.amountInPaise },
        },
      });
      await notifyStaff(tx, {
        ...notificationCopy.utrSubmitted({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          amountInPaise: payment.amountInPaise,
          utr,
        }),
        orderId: order.id,
        orderNumber: order.orderNumber,
      });
      return payment;
    });
  } catch (err) {
    if (isUtrConflict(err)) throw new PaymentError("duplicate_utr", "This UTR has already been used for another payment.");
    throw err;
  }
}

// ── Staff verification ────────────────────────────────────

async function requireVerifier(db: Db, actorId: string | null | undefined) {
  const actor = actorId ? await db.user.findUnique({ where: { id: actorId } }) : null;
  if (!actor || !actor.isActive || (actor.role !== "OWNER" && actor.role !== "STAFF")) {
    throw new PaymentError("forbidden", "Only the owner or staff can verify payments.");
  }
  return actor;
}

async function lockedPendingPayment(tx: Parameters<Parameters<Db["$transaction"]>[0]>[0], paymentId: string) {
  const ref = await tx.payment.findUnique({ where: { id: paymentId }, select: { orderId: true } });
  if (!ref) throw new PaymentError("not_found", "Payment not found.");
  await lockOrder(tx, ref.orderId);
  const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true } });
  if (payment.status !== "PENDING_VERIFICATION" || payment.order.status !== "PENDING") {
    throw new PaymentError("not_awaiting", "This payment was already handled.");
  }
  return payment;
}

/** OWNER/STAFF: the money is in the bank → mark paid and confirm the order. */
export async function confirmUpiPayment(db: Db, opts: { paymentId: string; actorId: string | null; now?: Date }) {
  const actor = await requireVerifier(db, opts.actorId);
  const now = opts.now ?? new Date();
  return db.$transaction(async (tx) => {
    const payment = await lockedPendingPayment(tx, opts.paymentId);
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "CAPTURED", capturedAt: now, verifiedAt: now, verifiedById: actor.id, method: "upi" },
    });
    await tx.order.update({ where: { id: payment.orderId }, data: { status: "CONFIRMED", confirmedAt: now } });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "payment.upi_confirmed",
        entityType: "Payment",
        entityId: payment.id,
        before: { status: "PENDING_VERIFICATION" },
        after: { status: "CAPTURED", orderNumber: payment.order.orderNumber, utr: payment.utr, amountInPaise: payment.amountInPaise },
      },
    });
    return { orderNumber: payment.order.orderNumber };
  });
}

/**
 * OWNER/STAFF: the UTR couldn't be matched. `retry` re-opens payment (new attempt, new due time);
 * `cancel` cancels the order and releases its stock.
 */
export async function rejectUpiPayment(
  db: Db,
  opts: { paymentId: string; actorId: string | null; reason: string; then: "retry" | "cancel"; windowMinutes: number; now?: Date },
) {
  const actor = await requireVerifier(db, opts.actorId);
  const reason = opts.reason.trim();
  if (reason.length < 3 || reason.length > 300) throw new PaymentError("invalid_reason", "Please give a short reason (3-300 characters).");
  const now = opts.now ?? new Date();
  return db.$transaction(async (tx) => {
    const payment = await lockedPendingPayment(tx, opts.paymentId);
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "REJECTED", rejectionReason: reason, verifiedAt: now, verifiedById: actor.id },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "payment.upi_rejected",
        entityType: "Payment",
        entityId: payment.id,
        before: { status: "PENDING_VERIFICATION" },
        after: { status: "REJECTED", reason, then: opts.then, orderNumber: payment.order.orderNumber, utr: payment.utr },
      },
    });
    if (opts.then === "cancel") {
      await cancelAndReleaseStock(tx, payment.orderId, {
        reason: `Payment not verified: ${reason}`,
        now,
        actorId: actor.id,
        auditAction: "order.cancelled_payment_rejected",
      });
    } else {
      await tx.payment.create({
        data: { orderId: payment.orderId, provider: "upi", status: "CREATED", amountInPaise: payment.amountInPaise, upiVpa: payment.upiVpa },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentDueAt: new Date(now.getTime() + opts.windowMinutes * 60_000) },
      });
    }
    return { orderNumber: payment.order.orderNumber };
  });
}
