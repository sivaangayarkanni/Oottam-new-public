import { describe, expect, it } from "vitest";
import { buildUpiUri, normalizeUtr, parseUpiUri, paymentView, upiAmount } from "@/lib/payments/upi";
import { getUpiConfig, onlinePaymentProvider } from "@/lib/config";
import { computeTotals } from "@/lib/pricing";

describe("UPI link", () => {
  it("formats paise as rupees with two decimals", () => {
    expect(upiAmount(53900)).toBe("539.00");
    expect(upiAmount(12345)).toBe("123.45");
    expect(upiAmount(5)).toBe("0.05");
    expect(() => upiAmount(0)).toThrow();
    expect(() => upiAmount(10.5)).toThrow();
  });

  it("builds a upi://pay intent with the exact server total and the order number", () => {
    const totals = computeTotals({
      lines: [{ unitPriceInPaise: 12000, quantity: 2 }, { unitPriceInPaise: 15000, quantity: 2 }],
      rule: { feeInPaise: 4900, freeAboveInPaise: 49900 },
      coupon: {
        code: "WELCOME10", type: "PERCENT", value: 10, maxDiscountInPaise: 5000, minOrderInPaise: 0,
        usageLimit: null, perUserLimit: null, usedCount: 0, startsAt: null, expiresAt: null, isActive: true,
      },
    });
    const uri = buildUpiUri({
      vpa: "shrisaitraders.prosper@okhdfcbank",
      payeeName: "kirthigha premchand",
      amountInPaise: totals.totalInPaise,
      orderNumber: "OTM-2026-000123",
    });
    expect(uri.startsWith("upi://pay?pa=shrisaitraders.prosper@okhdfcbank&")).toBe(true);
    expect(uri).toContain("pn=kirthigha%20premchand");
    const p = parseUpiUri(uri);
    expect(p).toEqual({
      pa: "shrisaitraders.prosper@okhdfcbank",
      pn: "kirthigha premchand",
      am: "539.00",
      cu: "INR",
      tn: "OTM-2026-000123",
      tr: "OTM-2026-000123",
    });
    expect(Math.round(Number(p.am) * 100)).toBe(totals.totalInPaise);
  });

  it("can omit tr for picky apps", () => {
    const p = parseUpiUri(buildUpiUri({ vpa: "a@b", payeeName: "X", amountInPaise: 100, orderNumber: "OTM-1", includeTr: false }));
    expect(p.tr).toBeUndefined();
  });
});

describe("UTR", () => {
  it.each([
    ["412345678901", "412345678901"],
    ["4123 4567 8901", "412345678901"],
    ["4123-4567-8901", "412345678901"],
    ["41234567890", null],
    ["4123456789012", null],
    ["41234567890a", null],
    ["", null],
  ])("normalises %j", (input, out) => expect(normalizeUtr(input)).toBe(out));
});

describe("customer-facing payment state", () => {
  const t = (m: number) => new Date(2026, 9, 9, 10, m);
  it("derives Awaiting / Verifying / Paid from the latest attempt", () => {
    expect(paymentView({ status: "PENDING", paymentMethod: "UPI", payments: [{ status: "CREATED", createdAt: t(0) }] })).toBe("awaiting");
    expect(paymentView({ status: "PENDING", paymentMethod: "UPI", payments: [{ status: "PENDING_VERIFICATION", createdAt: t(0) }] })).toBe("verifying");
    expect(paymentView({ status: "CONFIRMED", paymentMethod: "UPI", payments: [{ status: "CAPTURED", createdAt: t(0) }] })).toBe("paid");
    expect(
      paymentView({
        status: "PENDING",
        paymentMethod: "UPI",
        payments: [{ status: "REJECTED", createdAt: t(0) }, { status: "CREATED", createdAt: t(5) }],
      }),
    ).toBe("awaiting");
    expect(paymentView({ status: "CANCELLED", paymentMethod: "UPI", payments: [] })).toBe("cancelled");
    expect(paymentView({ status: "CONFIRMED", paymentMethod: "COD", payments: [] })).toBe("cod");
  });
});

describe("payment config", () => {
  it("reads UPI details from env, not code", () => {
    const env = { UPI_VPA: "shop.name@okhdfcbank", UPI_PAYEE_NAME: "Shop", UPI_VPA_ALT: "shop.name@okicici" } as unknown as NodeJS.ProcessEnv;
    expect(getUpiConfig(env)).toEqual({
      vpa: "shop.name@okhdfcbank",
      altVpa: "shop.name@okicici",
      payeeName: "Shop",
      windowMinutes: 1440,
      includeTr: true,
    });
    expect(getUpiConfig({} as NodeJS.ProcessEnv)).toBeNull();
    expect(() => getUpiConfig({ UPI_VPA: "not a vpa", UPI_PAYEE_NAME: "x" } as unknown as NodeJS.ProcessEnv)).toThrow();
    expect(onlinePaymentProvider({} as NodeJS.ProcessEnv)).toBe("upi");
    expect(onlinePaymentProvider({ ONLINE_PAYMENT_PROVIDER: "razorpay" } as unknown as NodeJS.ProcessEnv)).toBe("razorpay");
  });
});
