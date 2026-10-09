import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hasTestDb, makeVariant, resetDb, testClient } from "../support/db";
import { placeOrder, releaseExpiredOrders } from "@/lib/orders";
import { createCart } from "@/lib/cart";
import { randomToken } from "@/lib/tokens";
import { rejectUpiPayment, submitUpiReference } from "@/lib/payments/upi";
import {
  dispatchPendingAlerts,
  listNotifications,
  markNotificationsRead,
  unreadCount,
  type AlertChannel,
} from "@/lib/notifications";
import { ADMIN_LOGIN_LIMITS, adminPasswordLogin } from "@/lib/admin-login";

const db = hasTestDb ? testClient() : (null as never);
const rule = { feeInPaise: 4900, freeAboveInPaise: 49900 };
const HOUR = 3_600_000;
const PASSWORD = "correct-horse-battery-staple-42";

async function order(opts: { method?: "UPI" | "COD"; dueInMs?: number; now?: Date } = {}) {
  const v = await makeVariant(db, { stock: 10, price: 12000 });
  const cartId = await createCart(db, { guestToken: randomToken(12) });
  await db.cartItem.create({ data: { cartId, variantId: v.id, quantity: 3 } });
  const now = opts.now ?? new Date();
  const method = opts.method ?? "UPI";
  const placed = await placeOrder(db, {
    cartId,
    userId: null,
    idempotencyKey: randomToken(16),
    contact: { name: "Priya", phone: "+919876543210" },
    shippingAddress: { fullName: "Priya", phone: "9876543210", line1: "1 St", city: "Madurai", state: "Tamil Nadu", pincode: "625020", country: "IN" },
    paymentMethod: method,
    upiVpa: method === "UPI" ? "shop.test@okhdfcbank" : undefined,
    paymentDueAt: method === "UPI" ? new Date(now.getTime() + (opts.dueInMs ?? 24 * HOUR)) : undefined,
    rule,
    now,
  });
  return db.order.findUniqueOrThrow({ where: { id: placed.id }, include: { payments: true } });
}

const owner = () => db.user.create({ data: { phone: "+919245537575", role: "OWNER", name: "Owner" } });

describe.skipIf(!hasTestDb)("staff notifications (Postgres)", () => {
  beforeEach(() => resetDb(db));
  afterAll(() => db?.$disconnect());

  it("a new order creates one order.placed notification in the same transaction", async () => {
    const o = await order();
    const all = await db.notification.findMany();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ type: "order.placed", orderId: o.id, orderNumber: o.orderNumber, readAt: null });
    expect(all[0].title).toContain(o.orderNumber);
    expect(all[0].title).toContain("₹409"); // 3 × ₹120 + ₹49 delivery
    expect(all[0].body).toContain("3 packs");
    expect(await unreadCount(db)).toBe(1);
  });

  it("a UTR submission notifies staff; a rejected (duplicate) submission does not", async () => {
    const a = await order();
    const b = await order();
    await submitUpiReference(db, { orderId: a.id, utr: "512345678901" });
    await expect(submitUpiReference(db, { orderId: b.id, utr: "512345678901" })).rejects.toMatchObject({ code: "duplicate_utr" });
    const utrNotes = await db.notification.findMany({ where: { type: "payment.utr_submitted" } });
    expect(utrNotes).toHaveLength(1);
    expect(utrNotes[0]).toMatchObject({ orderId: a.id, orderNumber: a.orderNumber });
    expect(utrNotes[0].body).toContain("512345678901");
  });

  it("expired and staff-cancelled orders notify staff", async () => {
    const now = new Date();
    const stale = await order({ dueInMs: -60_000 });
    const r = await releaseExpiredOrders(db, { ttlMinutes: 30, now });
    expect(r.released).toEqual([stale.orderNumber]);
    expect(await db.notification.findFirst({ where: { type: "order.expired", orderId: stale.id } })).not.toBeNull();

    const o = await order();
    await submitUpiReference(db, { orderId: o.id, utr: "612345678901" });
    const boss = await owner();
    await rejectUpiPayment(db, { paymentId: o.payments[0].id, actorId: boss.id, reason: "No such payment", then: "cancel", windowMinutes: 60 });
    const cancelled = await db.notification.findFirstOrThrow({ where: { type: "order.cancelled", orderId: o.id } });
    expect(cancelled.body).toContain("No such payment");
  });

  it("mark read (one / all) is tracked per notification", async () => {
    const boss = await owner();
    await order();
    await order();
    const [first] = await listNotifications(db);
    expect(await markNotificationsRead(db, { ids: [first.id], actorId: boss.id })).toBe(1);
    expect(await unreadCount(db)).toBe(1);
    expect(await markNotificationsRead(db, { ids: [], actorId: boss.id })).toBe(0);
    expect(await markNotificationsRead(db, { all: true, actorId: boss.id })).toBe(1);
    expect(await unreadCount(db)).toBe(0);
    expect((await db.notification.findUniqueOrThrow({ where: { id: first.id } })).readById).toBe(boss.id);
  });

  it("outbound alerts: no-op without channels, sent exactly once, failures never throw", async () => {
    await order();
    expect(await dispatchPendingAlerts(db, { channels: [] })).toEqual({ sent: 0, failed: 0 });
    expect((await db.notification.findFirstOrThrow()).dispatchedAt).toBeNull();

    const sent: string[] = [];
    const good: AlertChannel = { name: "good", send: async (n) => void sent.push(n.title) };
    const bad: AlertChannel = { name: "bad", send: async () => { throw new Error("boom"); } };
    const [r1, r2] = await Promise.all([
      dispatchPendingAlerts(db, { channels: [good, bad] }),
      dispatchPendingAlerts(db, { channels: [good, bad] }),
    ]);
    expect(r1.sent + r2.sent).toBe(1);
    expect(r1.failed + r2.failed).toBe(1);
    expect(sent).toHaveLength(1);
    expect(await dispatchPendingAlerts(db, { channels: [good] })).toEqual({ sent: 0, failed: 0 });

    // Old, never-dispatched history isn't replayed when a channel is switched on later.
    await db.notification.create({ data: { type: "order.placed", title: "old", body: "old", createdAt: new Date(Date.now() - 3 * HOUR) } });
    expect(await dispatchPendingAlerts(db, { channels: [good] })).toEqual({ sent: 0, failed: 0 });
  });

  it("checkout still succeeds if alerting would fail (alerts run outside the order transaction)", async () => {
    const o = await order({ method: "COD" });
    expect(o.status).toBe("CONFIRMED");
    const r = await dispatchPendingAlerts(db, { channels: [{ name: "down", send: async () => { throw new Error("down"); } }] });
    expect(r).toEqual({ sent: 0, failed: 1 });
    expect(await db.order.count()).toBe(1);
  });
});

describe.skipIf(!hasTestDb)("owner password sign-in (Postgres)", () => {
  beforeEach(() => resetDb(db));

  it("is disabled without a strong password configured", async () => {
    await owner();
    for (const expected of [undefined, "", "short-password"]) {
      await expect(adminPasswordLogin(db, { password: "short-password", expected, ip: "1.1.1.1" })).rejects.toMatchObject({ code: "disabled" });
    }
  });

  it("signs in the active OWNER with the right password and audits it", async () => {
    const boss = await owner();
    await db.user.create({ data: { phone: "+919000000001", role: "STAFF", name: "Staff" } });
    const u = await adminPasswordLogin(db, { password: PASSWORD, expected: PASSWORD, ip: "1.1.1.1", ownerPhone: "+919245537575" });
    expect(u.id).toBe(boss.id);
    expect(await db.auditLog.count({ where: { action: "admin.password_login", actorId: boss.id } })).toBe(1);
  });

  it("rejects wrong passwords and rate limits per IP, even for the right password afterwards", async () => {
    await owner();
    for (let i = 0; i < ADMIN_LOGIN_LIMITS.perIpPer15Min; i++) {
      await expect(adminPasswordLogin(db, { password: `${PASSWORD}x`, expected: PASSWORD, ip: "6.6.6.6" })).rejects.toMatchObject({ code: "invalid" });
    }
    await expect(adminPasswordLogin(db, { password: PASSWORD, expected: PASSWORD, ip: "6.6.6.6" })).rejects.toMatchObject({ code: "rate_limited" });
    // Another IP is unaffected.
    await expect(adminPasswordLogin(db, { password: PASSWORD, expected: PASSWORD, ip: "7.7.7.7" })).resolves.toBeTruthy();
  });

  it("has a site-wide brake against distributed guessing", async () => {
    await owner();
    await db.auditLog.createMany({
      data: Array.from({ length: ADMIN_LOGIN_LIMITS.globalPerHour }, (_, i) => ({ action: "admin.password_login_failed", entityType: "User", ipAddress: `10.0.0.${i}` })),
    });
    await expect(adminPasswordLogin(db, { password: PASSWORD, expected: PASSWORD, ip: "8.8.8.8" })).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("refuses inactive owners / no owner", async () => {
    await db.user.create({ data: { phone: "+919245537575", role: "OWNER", isActive: false } });
    await expect(adminPasswordLogin(db, { password: PASSWORD, expected: PASSWORD, ip: "1.1.1.1" })).rejects.toMatchObject({ code: "no_owner" });
  });
});
