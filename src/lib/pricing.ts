/**
 * Pure price / coupon / delivery-fee maths. All amounts are integer paise.
 * Prices on the store are GST-inclusive, so tax is reported as 0 (included).
 * The server always recomputes these from DB prices; client values are never trusted.
 */
import type { DeliveryRule } from "./config";

export type PricedLine = { unitPriceInPaise: number; quantity: number };

export type CouponLike = {
  code: string;
  type: "PERCENT" | "FLAT";
  value: number;
  maxDiscountInPaise: number | null;
  minOrderInPaise: number;
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
};

export type CouponRejection =
  | "inactive"
  | "not_started"
  | "expired"
  | "min_order"
  | "usage_limit"
  | "per_user_limit"
  | "not_found";

export type CouponResult =
  | { ok: true; code: string; discountInPaise: number }
  | { ok: false; code: string; reason: CouponRejection; message: string };

export function subtotalOf(lines: PricedLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPriceInPaise * l.quantity, 0);
}

function rupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function couponMessage(reason: CouponRejection, coupon?: Pick<CouponLike, "minOrderInPaise">): string {
  switch (reason) {
    case "not_found":
      return "That code doesn't exist. Check the spelling?";
    case "inactive":
      return "This coupon is no longer active.";
    case "not_started":
      return "This coupon isn't active yet.";
    case "expired":
      return "This coupon has expired.";
    case "min_order":
      return `Add items worth ${rupees(coupon?.minOrderInPaise ?? 0)} or more to use this coupon.`;
    case "usage_limit":
      return "This coupon has been fully redeemed.";
    case "per_user_limit":
      return "You've already used this coupon.";
  }
}

/**
 * Validate a coupon against a subtotal. `timesUsedByCustomer` is the number of existing
 * (non-cancelled) orders by this customer with the coupon.
 */
export function evaluateCoupon(
  coupon: CouponLike,
  subtotalInPaise: number,
  ctx: { now: Date; timesUsedByCustomer?: number },
): CouponResult {
  const reject = (reason: CouponRejection): CouponResult => ({
    ok: false,
    code: coupon.code,
    reason,
    message: couponMessage(reason, coupon),
  });
  if (!coupon.isActive) return reject("inactive");
  if (coupon.startsAt && ctx.now < coupon.startsAt) return reject("not_started");
  if (coupon.expiresAt && ctx.now >= coupon.expiresAt) return reject("expired");
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return reject("usage_limit");
  if (coupon.perUserLimit !== null && (ctx.timesUsedByCustomer ?? 0) >= coupon.perUserLimit) {
    return reject("per_user_limit");
  }
  if (subtotalInPaise <= 0 || subtotalInPaise < coupon.minOrderInPaise) return reject("min_order");

  let discount: number;
  if (coupon.type === "PERCENT") {
    const pct = Math.min(Math.max(coupon.value, 0), 100);
    discount = Math.floor((subtotalInPaise * pct) / 100);
    if (coupon.maxDiscountInPaise !== null) discount = Math.min(discount, coupon.maxDiscountInPaise);
  } else {
    discount = Math.max(coupon.value, 0);
  }
  discount = Math.min(discount, subtotalInPaise);
  return { ok: true, code: coupon.code, discountInPaise: discount };
}

export function deliveryFee(amountAfterDiscount: number, rule: DeliveryRule, hasItems: boolean): number {
  if (!hasItems) return 0;
  if (rule.freeAboveInPaise === 0 || amountAfterDiscount >= rule.freeAboveInPaise) return 0;
  return rule.feeInPaise;
}

export type Totals = {
  subtotalInPaise: number;
  discountInPaise: number;
  shippingInPaise: number;
  taxInPaise: number;
  totalInPaise: number;
  /** Paise still needed for free delivery (0 if already free). */
  freeDeliveryGapInPaise: number;
  coupon: CouponResult | null;
};

export function computeTotals(input: {
  lines: PricedLine[];
  rule: DeliveryRule;
  coupon?: CouponLike | null;
  couponCode?: string | null;
  now?: Date;
  timesUsedByCustomer?: number;
}): Totals {
  const subtotal = subtotalOf(input.lines);
  let couponResult: CouponResult | null = null;
  if (input.coupon) {
    couponResult = evaluateCoupon(input.coupon, subtotal, {
      now: input.now ?? new Date(),
      timesUsedByCustomer: input.timesUsedByCustomer,
    });
  } else if (input.couponCode) {
    const code = input.couponCode.toUpperCase();
    couponResult = { ok: false, code, reason: "not_found", message: couponMessage("not_found") };
  }
  const discount = couponResult?.ok ? couponResult.discountInPaise : 0;
  const afterDiscount = subtotal - discount;
  const hasItems = input.lines.some((l) => l.quantity > 0);
  const shipping = deliveryFee(afterDiscount, input.rule, hasItems);
  const gap = hasItems && shipping > 0 ? input.rule.freeAboveInPaise - afterDiscount : 0;
  return {
    subtotalInPaise: subtotal,
    discountInPaise: discount,
    shippingInPaise: shipping,
    taxInPaise: 0,
    totalInPaise: afterDiscount + shipping,
    freeDeliveryGapInPaise: Math.max(gap, 0),
    coupon: couponResult,
  };
}
