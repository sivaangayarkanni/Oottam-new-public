import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hasTestDb, makeVariant, resetDb, testClient } from "../support/db";
import { OrderError, placeOrder, releaseExpiredOrders, type PlaceOrderInput } from "@/lib/orders";
import { changeCartItem, createCart } from "@/lib/cart";
import { randomToken } from "@/lib/tokens";

const db = hasTestDb ? testClient() : (null as never);
const rule = { feeInPaise: 4900, freeAboveInPaise: 49900 };
const address = {
  fullName: "Test Customer",
  phone: "9876543210",
  line1: "1 Test Street",
  city: "Chennai",
  state: "Tamil Nadu",
  pincode: "600001",
  country: "IN" as const,
};

async function cartWith(variantId: string, qty: number) {
  const cartId = await createCart(db, { guestToken: randomToken(12) });
  await db.cartItem.create({ data: { cartId, variantId, quantity: qty } });
  return cartId;
}

function input(cartId: string, over: Partial<PlaceOrderInput> = {}): PlaceOrderInput {
  return {
    cartId,
    userId: null,
    idempotencyKey: randomToken(16),
    contact: { name: "Test Customer", phone: "+919876543210" },
    shippingAddress: address,
    paymentMethod: "RAZORPAY",
    rule,
    ...over,
  };
}

describe.skipIf(!hasTestDb)("order placement (Postgres)", () => {
  beforeEach(() => resetDb(db));
  afterAll(() => db?.$disconnect());

  it("prices from the DB, decrements stock, snapshots items and clears the cart", async () => {
    const v = await makeVariant(db, { stock: 10, price: 12000 });
    const cartId = await cartWith(v.id, 3);
    const order = await placeOrder(db, input(cartId));

    expect(order.orderNumber).toMatch(/^OTM-\d{4}-\d{6}$/);
    expect(order.status).toBe("PENDING");
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true, payments: true } });
    expect(saved).toMatchObject({ subtotalInPaise: 36000, shippingInPaise: 4900, totalInPaise: 40900 });
    expect(saved.items[0]).toMatchObject({ unitPriceInPaise: 12000, quantity: 3, lineTotalInPaise: 36000, sku: v.sku });
    expect(saved.payments[0]).toMatchObject({ provider: "razorpay", status: "CREATED", amountInPaise: 40900 });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(7);
    expect(await db.cartItem.count({ where: { cartId } })).toBe(0);

    // A later price change doesn't alter the snapshot.
    await db.productVariant.update({ where: { id: v.id }, data: { priceInPaise: 99900 } });
    expect((await db.orderItem.findFirstOrThrow({ where: { orderId: order.id } })).unitPriceInPaise).toBe(12000);
  });

  it("never oversells under concurrent checkouts", async () => {
    const v = await makeVariant(db, { stock: 5 });
    const carts = await Promise.all(Array.from({ length: 12 }, () => cartWith(v.id, 1)));
    const results = await Promise.allSettled(carts.map((c) => placeOrder(db, input(c))));

    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(ok).toHaveLength(5);
    expect(failed).toHaveLength(7);
    for (const f of failed) expect((f.reason as OrderError).code).toBe("stock");
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(0);
    expect(await db.order.count()).toBe(5);
    // Order numbers are unique and sequential-ish.
    const numbers = new Set((await db.order.findMany()).map((o) => o.orderNumber));
    expect(numbers.size).toBe(5);
  });

  it("rejects when a line exceeds stock and leaves stock untouched", async () => {
    const a = await makeVariant(db, { stock: 5 });
    const b = await makeVariant(db, { stock: 1 });
    const cartId = await createCart(db, { guestToken: randomToken(12) });
    await db.cartItem.createMany({ data: [{ cartId, variantId: a.id, quantity: 2 }, { cartId, variantId: b.id, quantity: 2 }] });
    await expect(placeOrder(db, input(cartId))).rejects.toMatchObject({ code: "stock" });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: a.id } })).stock).toBe(5); // rolled back
    expect(await db.order.count()).toBe(0);
    expect(await db.cartItem.count({ where: { cartId } })).toBe(2);
  });

  it("is idempotent: a double-submit (even concurrent) creates one order", async () => {
    const v = await makeVariant(db, { stock: 10 });
    const cartId = await cartWith(v.id, 2);
    const key = randomToken(16);
    const [first, second] = await Promise.all([
      placeOrder(db, input(cartId, { idempotencyKey: key })),
      placeOrder(db, input(cartId, { idempotencyKey: key })),
    ]);
    expect(first.orderNumber).toBe(second.orderNumber);
    expect([first.duplicate, second.duplicate].sort()).toEqual([false, true]);
    const third = await placeOrder(db, input(cartId, { idempotencyKey: key }));
    expect(third).toMatchObject({ orderNumber: first.orderNumber, duplicate: true });
    expect(await db.order.count()).toBe(1);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(8);
  });

  it("refuses to reveal another customer's order via a reused key", async () => {
    const v = await makeVariant(db, { stock: 10 });
    const key = randomToken(16);
    await placeOrder(db, input(await cartWith(v.id, 1), { idempotencyKey: key }));
    await expect(
      placeOrder(db, input(await cartWith(v.id, 1), { idempotencyKey: key, contact: { name: "X", phone: "+919000000000" } })),
    ).rejects.toMatchObject({ code: "idempotency_conflict" });
  });

  it("applies and redeems a coupon with usage limits", async () => {
    const v = await makeVariant(db, { stock: 10, price: 30000 });
    await db.coupon.create({ data: { code: "ONCE", type: "PERCENT", value: 10, usageLimit: 1 } });
    const order = await placeOrder(db, input(await cartWith(v.id, 2), { couponCode: "once" }));
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved).toMatchObject({ subtotalInPaise: 60000, discountInPaise: 6000, shippingInPaise: 0, totalInPaise: 54000, couponCode: "ONCE" });
    expect((await db.coupon.findUniqueOrThrow({ where: { code: "ONCE" } })).usedCount).toBe(1);

    const cart2 = await cartWith(v.id, 2);
    await expect(placeOrder(db, input(cart2, { couponCode: "ONCE", contact: { name: "B", phone: "+919111111111" } }))).rejects.toMatchObject({
      code: "coupon",
    });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(8);
  });

  it("stops when the total the customer saw is stale", async () => {
    const v = await makeVariant(db, { stock: 10, price: 12000 });
    await expect(placeOrder(db, input(await cartWith(v.id, 1), { expectedTotalInPaise: 100 }))).rejects.toMatchObject({
      code: "total_changed",
    });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(10);
  });

  it("releases stock for unpaid orders after the timeout, exactly once", async () => {
    const v = await makeVariant(db, { stock: 10 });
    const placedAt = new Date(Date.now() - 45 * 60_000);
    const old = await placeOrder(db, input(await cartWith(v.id, 3), { now: placedAt }));
    const fresh = await placeOrder(db, input(await cartWith(v.id, 2)));
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(5);

    const [r1, r2] = await Promise.all([
      releaseExpiredOrders(db, { ttlMinutes: 30 }),
      releaseExpiredOrders(db, { ttlMinutes: 30 }),
    ]);
    expect([...r1.released, ...r2.released]).toEqual([old.orderNumber]);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(8);
    const o = await db.order.findUniqueOrThrow({ where: { id: old.id }, include: { payments: true } });
    expect(o.status).toBe("CANCELLED");
    expect(o.stockReleasedAt).not.toBeNull();
    expect(o.payments[0].status).toBe("FAILED");
    expect((await db.order.findUniqueOrThrow({ where: { id: fresh.id } })).status).toBe("PENDING");
    expect((await releaseExpiredOrders(db, { ttlMinutes: 30 })).released).toEqual([]);
  });

  it("clamps cart quantities to stock", async () => {
    const v = await makeVariant(db, { stock: 3 });
    const cartId = await createCart(db, { guestToken: randomToken(12) });
    const res = await changeCartItem(db, cartId, v.id, 5, "add");
    expect(res.cart.lines[0].quantity).toBe(3);
    expect(res.notice).toMatch(/Only 3 in stock/);
    expect(res.cart.subtotalInPaise).toBe(36000);
  });
});
