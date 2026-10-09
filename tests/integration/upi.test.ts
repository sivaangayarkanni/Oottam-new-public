import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hasTestDb, makeVariant, resetDb, testClient } from "../support/db";
import { placeOrder, releaseExpiredOrders } from "@/lib/orders";
import { createCart } from "@/lib/cart";
import { randomToken } from "@/lib/tokens";
import {
  buildUpiUri,
  confirmUpiPayment,
  parseUpiUri,
  rejectUpiPayment,
  submitUpiReference,
  UTR_LIMITS,
} from "@/lib/payments/upi";

const db = hasTestDb ? testClient() : (null as never);
const rule = { feeInPaise: 4900, freeAboveInPaise: 49900 };
const VPA = "shop.test@okhdfcbank";
const HOUR = 3_600_000;

async function upiOrder(opts: { stock?: number; qty?: number; dueInMs?: number; phone?: string; now?: Date } = {}) {
  const v = await makeVariant(db, { stock: opts.stock ?? 10, price: 12000 });
  const cartId = await createCart(db, { guestToken: randomToken(12) });
  await db.cartItem.create({ data: { cartId, variantId: v.id, quantity: opts.qty ?? 2 } });
  const now = opts.now ?? new Date();
  const placed = await placeOrder(db, {
    cartId,
    userId: null,
    idempotencyKey: randomToken(16),
    contact: { name: "Guest", phone: opts.phone ?? "+919876543210" },
    shippingAddress: { fullName: "Guest", phone: "9876543210", line1: "1 St", city: "Chennai", state: "Tamil Nadu", pincode: "600001", country: "IN" },
    paymentMethod: "UPI",
    upiVpa: VPA,
    paymentDueAt: new Date(now.getTime() + (opts.dueInMs ?? 24 * HOUR)),
    rule,
    now,
  });
  const order = await db.order.findUniqueOrThrow({ where: { id: placed.id }, include: { payments: true } });
  return { order, payment: order.payments[0], variant: v };
}

async function staff(role: "OWNER" | "STAFF" | "CUSTOMER" = "OWNER") {
  return db.user.create({ data: { phone: `+9190000${String(Math.floor(Math.random() * 1e5)).padStart(5, "0")}`, role, name: role } });
}

const stockOf = async (id: string) => (await db.productVariant.findUniqueOrThrow({ where: { id } })).stock;
let utrSeq = 100000000000;
const nextUtr = () => String(++utrSeq);

describe.skipIf(!hasTestDb)("UPI manual payments (Postgres)", () => {
  beforeEach(() => resetDb(db));
  afterAll(() => db?.$disconnect());

  it("creates a UPI payment attempt whose QR amount equals the server total", async () => {
    const { order, payment } = await upiOrder({ qty: 2 });
    expect(order).toMatchObject({ paymentMethod: "UPI", status: "PENDING", totalInPaise: 28900 });
    expect(payment).toMatchObject({ provider: "upi", status: "CREATED", amountInPaise: 28900, upiVpa: VPA });
    const p = parseUpiUri(buildUpiUri({ vpa: VPA, payeeName: "Shop", amountInPaise: order.totalInPaise, orderNumber: order.orderNumber }));
    expect(p.am).toBe("289.00");
    expect(p.tn).toBe(order.orderNumber);
  });

  it("awaiting → verifying → paid, audited with the verifier", async () => {
    const { order, payment } = await upiOrder();
    const owner = await staff("OWNER");
    const utr = nextUtr();
    await submitUpiReference(db, { orderId: order.id, utr: `${utr.slice(0, 4)} ${utr.slice(4, 8)} ${utr.slice(8)}`, ip: "1.2.3.4" });
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "PENDING_VERIFICATION", utr });

    await expect(submitUpiReference(db, { orderId: order.id, utr: nextUtr() })).rejects.toMatchObject({ code: "already_submitted" });

    await confirmUpiPayment(db, { paymentId: payment.id, actorId: owner.id });
    const after = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    expect(after.status).toBe("CONFIRMED");
    expect(after.confirmedAt).not.toBeNull();
    expect(after.payments[0]).toMatchObject({ status: "CAPTURED", verifiedById: owner.id });
    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "payment.upi_confirmed" } });
    expect(audit).toMatchObject({ actorId: owner.id, entityId: payment.id });

    // Double confirm (two staff clicking at once) is a no-op error, not a second state change.
    await expect(confirmUpiPayment(db, { paymentId: payment.id, actorId: owner.id })).rejects.toMatchObject({ code: "not_awaiting" });
  });

  it("rejects malformed UTRs and refuses a UTR already used on another order", async () => {
    const a = await upiOrder();
    const b = await upiOrder({ phone: "+919111111111" });
    await expect(submitUpiReference(db, { orderId: a.order.id, utr: "12345" })).rejects.toMatchObject({ code: "invalid_utr" });
    const utr = nextUtr();
    await submitUpiReference(db, { orderId: a.order.id, utr });
    await expect(submitUpiReference(db, { orderId: b.order.id, utr })).rejects.toMatchObject({ code: "duplicate_utr" });
    expect((await db.payment.findUniqueOrThrow({ where: { id: b.payment.id } })).status).toBe("CREATED");
  });

  it("concurrent submissions of the same UTR to two orders: exactly one wins", async () => {
    const a = await upiOrder();
    const b = await upiOrder({ phone: "+919222222222" });
    const utr = nextUtr();
    const results = await Promise.allSettled([
      submitUpiReference(db, { orderId: a.order.id, utr }),
      submitUpiReference(db, { orderId: b.order.id, utr }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected")!;
    expect(failed.reason.code).toBe("duplicate_utr");
  });

  it("rate-limits UTR submissions per order", async () => {
    const { order } = await upiOrder();
    for (let i = 0; i < UTR_LIMITS.perOrderPerHour; i++) {
      await expect(submitUpiReference(db, { orderId: order.id, utr: "bad" })).rejects.toMatchObject({ code: "invalid_utr" });
    }
    await expect(submitUpiReference(db, { orderId: order.id, utr: nextUtr() })).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("only OWNER/STAFF can confirm or reject", async () => {
    const { order, payment } = await upiOrder();
    await submitUpiReference(db, { orderId: order.id, utr: nextUtr() });
    const customer = await staff("CUSTOMER");
    await expect(confirmUpiPayment(db, { paymentId: payment.id, actorId: customer.id })).rejects.toMatchObject({ code: "forbidden" });
    await expect(confirmUpiPayment(db, { paymentId: payment.id, actorId: null })).rejects.toMatchObject({ code: "forbidden" });
    const disabled = await db.user.create({ data: { phone: "+919333333333", role: "STAFF", isActive: false } });
    await expect(confirmUpiPayment(db, { paymentId: payment.id, actorId: disabled.id })).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      rejectUpiPayment(db, { paymentId: payment.id, actorId: customer.id, reason: "nope", then: "cancel", windowMinutes: 60 }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING");
    const staffUser = await staff("STAFF");
    await confirmUpiPayment(db, { paymentId: payment.id, actorId: staffUser.id });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CONFIRMED");
  });

  it("reject → retry opens a new attempt; the rejected UTR stays blocked", async () => {
    const { order, payment } = await upiOrder();
    const owner = await staff();
    const utr = nextUtr();
    await submitUpiReference(db, { orderId: order.id, utr });
    const now = new Date();
    await rejectUpiPayment(db, { paymentId: payment.id, actorId: owner.id, reason: "Not in bank statement", then: "retry", windowMinutes: 60, now });

    const after = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: { orderBy: { createdAt: "asc" } } } });
    expect(after.status).toBe("PENDING");
    expect(after.payments.map((p) => p.status)).toEqual(["REJECTED", "CREATED"]);
    expect(after.payments[0]).toMatchObject({ rejectionReason: "Not in bank statement", verifiedById: owner.id });
    expect(after.paymentDueAt!.getTime()).toBe(now.getTime() + 60 * 60_000);

    await expect(submitUpiReference(db, { orderId: order.id, utr })).rejects.toMatchObject({ code: "duplicate_utr" });
    await submitUpiReference(db, { orderId: order.id, utr: nextUtr() });
    expect(await db.payment.count({ where: { orderId: order.id, status: "PENDING_VERIFICATION" } })).toBe(1);
  });

  it("reject → cancel releases stock and coupon use", async () => {
    const { order, payment, variant } = await upiOrder({ stock: 10, qty: 3 });
    expect(await stockOf(variant.id)).toBe(7);
    const owner = await staff();
    await submitUpiReference(db, { orderId: order.id, utr: nextUtr() });
    await rejectUpiPayment(db, { paymentId: payment.id, actorId: owner.id, reason: "Amount mismatch", then: "cancel", windowMinutes: 60 });
    const after = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("CANCELLED");
    expect(after.stockReleasedAt).not.toBeNull();
    expect(await stockOf(variant.id)).toBe(10);
    await expect(submitUpiReference(db, { orderId: order.id, utr: nextUtr() })).rejects.toMatchObject({ code: "not_awaiting" });
  });

  it("expiry: unpaid UPI orders are released after their window; submitted ones never auto-cancel", async () => {
    const t0 = new Date(Date.now() - 30 * HOUR);
    const unpaid = await upiOrder({ now: t0, dueInMs: 24 * HOUR, qty: 1 });
    const submitted = await upiOrder({ now: t0, dueInMs: 24 * HOUR, qty: 1, phone: "+919444444444" });
    const fresh = await upiOrder({ qty: 1, phone: "+919555555555" }); // due in 24 h from now
    await submitUpiReference(db, { orderId: submitted.order.id, utr: nextUtr() });

    const { released } = await releaseExpiredOrders(db, { ttlMinutes: 30 });
    expect(released).toEqual([unpaid.order.orderNumber]);
    expect((await db.order.findUniqueOrThrow({ where: { id: unpaid.order.id } })).status).toBe("CANCELLED");
    expect(await stockOf(unpaid.variant.id)).toBe(10);
    expect((await db.order.findUniqueOrThrow({ where: { id: submitted.order.id } })).status).toBe("PENDING");
    expect(await stockOf(submitted.variant.id)).toBe(9);
    expect((await db.order.findUniqueOrThrow({ where: { id: fresh.order.id } })).status).toBe("PENDING");

    // Even far in the future the submitted order stays for staff to decide.
    const later = await releaseExpiredOrders(db, { ttlMinutes: 30, now: new Date(Date.now() + 30 * 24 * HOUR) });
    expect(later.released).toEqual([fresh.order.orderNumber]);
    expect((await db.order.findUniqueOrThrow({ where: { id: submitted.order.id } })).status).toBe("PENDING");
  });

  it("a UTR submitted at the last moment beats the expiry job", async () => {
    const t0 = new Date(Date.now() - 2 * HOUR);
    const { order } = await upiOrder({ now: t0, dueInMs: HOUR });
    const [, rel] = await Promise.all([
      submitUpiReference(db, { orderId: order.id, utr: nextUtr() }).catch((e) => e),
      releaseExpiredOrders(db, { ttlMinutes: 30 }),
    ]);
    const after = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    // Either the UTR landed first (order kept) or the expiry did (UTR refused). Never both.
    if (after.status === "PENDING") {
      expect(after.payments[0].status).toBe("PENDING_VERIFICATION");
      expect(rel.released).toEqual([]);
    } else {
      expect(after.status).toBe("CANCELLED");
      expect(after.payments[0].utr).toBeNull();
    }
  });

  it("an expired-then-cancelled order cannot be confirmed", async () => {
    const t0 = new Date(Date.now() - 2 * HOUR);
    const { order, payment } = await upiOrder({ now: t0, dueInMs: HOUR });
    await releaseExpiredOrders(db, { ttlMinutes: 30 });
    const owner = await staff();
    await expect(submitUpiReference(db, { orderId: order.id, utr: nextUtr() })).rejects.toMatchObject({ code: "not_awaiting" });
    await expect(confirmUpiPayment(db, { paymentId: payment.id, actorId: owner.id })).rejects.toMatchObject({ code: "not_awaiting" });
  });
});
