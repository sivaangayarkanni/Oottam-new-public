import { describe, expect, it } from "vitest";
import { computeTotals, deliveryFee, evaluateCoupon, subtotalOf, type CouponLike } from "@/lib/pricing";

const rule = { feeInPaise: 4900, freeAboveInPaise: 49900 };
const now = new Date("2026-09-25T10:00:00Z");

function coupon(over: Partial<CouponLike> = {}): CouponLike {
  return {
    code: "TEST",
    type: "PERCENT",
    value: 10,
    maxDiscountInPaise: null,
    minOrderInPaise: 0,
    usageLimit: null,
    perUserLimit: null,
    usedCount: 0,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    ...over,
  };
}

describe("subtotal & delivery", () => {
  it("sums integer paise", () => {
    expect(subtotalOf([{ unitPriceInPaise: 12000, quantity: 2 }, { unitPriceInPaise: 13050, quantity: 1 }])).toBe(37050);
  });

  it("charges the fee below the threshold and is free at/above it", () => {
    expect(deliveryFee(49899, rule, true)).toBe(4900);
    expect(deliveryFee(49900, rule, true)).toBe(0);
    expect(deliveryFee(0, rule, false)).toBe(0);
    expect(deliveryFee(100, { feeInPaise: 4900, freeAboveInPaise: 0 }, true)).toBe(0);
  });

  it("applies the threshold after the discount", () => {
    const t = computeTotals({
      lines: [{ unitPriceInPaise: 25000, quantity: 2 }], // ₹500
      rule,
      coupon: coupon({ type: "FLAT", value: 5000 }), // −₹50 → ₹450 < ₹499
      now,
    });
    expect(t).toMatchObject({ subtotalInPaise: 50000, discountInPaise: 5000, shippingInPaise: 4900, totalInPaise: 49900, taxInPaise: 0 });
    expect(t.freeDeliveryGapInPaise).toBe(4900);
  });

  it("returns zero totals for an empty cart", () => {
    const t = computeTotals({ lines: [], rule, now });
    expect(t.totalInPaise).toBe(0);
    expect(t.shippingInPaise).toBe(0);
  });
});

describe("coupons", () => {
  it("percent discount floors to whole paise and respects the cap", () => {
    expect(evaluateCoupon(coupon({ value: 10 }), 12345, { now })).toMatchObject({ ok: true, discountInPaise: 1234 });
    expect(evaluateCoupon(coupon({ value: 10, maxDiscountInPaise: 5000 }), 100000, { now })).toMatchObject({ ok: true, discountInPaise: 5000 });
  });

  it("flat discount never exceeds the subtotal", () => {
    expect(evaluateCoupon(coupon({ type: "FLAT", value: 50000 }), 12000, { now })).toMatchObject({ ok: true, discountInPaise: 12000 });
  });

  it.each([
    ["inactive", { isActive: false }],
    ["not_started", { startsAt: new Date("2026-10-01T00:00:00Z") }],
    ["expired", { expiresAt: new Date("2026-09-25T09:59:59Z") }],
    ["usage_limit", { usageLimit: 5, usedCount: 5 }],
    ["min_order", { minOrderInPaise: 49900 }],
  ] as const)("rejects when %s", (reason, over) => {
    const r = evaluateCoupon(coupon(over), 20000, { now });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe(reason);
      expect(r.message.length).toBeGreaterThan(5);
    }
  });

  it("enforces the per-customer limit", () => {
    expect(evaluateCoupon(coupon({ perUserLimit: 1 }), 20000, { now, timesUsedByCustomer: 1 })).toMatchObject({
      ok: false,
      reason: "per_user_limit",
    });
    expect(evaluateCoupon(coupon({ perUserLimit: 1 }), 20000, { now, timesUsedByCustomer: 0 }).ok).toBe(true);
  });

  it("reports unknown codes and applies no discount", () => {
    const t = computeTotals({ lines: [{ unitPriceInPaise: 12000, quantity: 1 }], rule, couponCode: "nope", now });
    expect(t.coupon).toMatchObject({ ok: false, reason: "not_found", code: "NOPE" });
    expect(t.discountInPaise).toBe(0);
    expect(t.totalInPaise).toBe(16900);
  });
});
