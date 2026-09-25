import { describe, expect, it } from "vitest";
import { generateOtp, hashOtp, otpMatches, retryAfter } from "@/lib/otp";
import { getSmsProvider } from "@/lib/sms";
import { normalizeIndianMobile } from "@/lib/phone";
import { addressSchema, safeNextPath } from "@/lib/validation";

describe("OTP hashing", () => {
  it("generates 6-digit numeric codes", () => {
    for (let i = 0; i < 200; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it("stores a keyed hash, not the code, bound to the phone", () => {
    const h = hashOtp("+919876543210", "123456", "s".repeat(32));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("123456");
    expect(otpMatches("+919876543210", "123456", h, "s".repeat(32))).toBe(true);
    expect(otpMatches("+919876543210", "123457", h, "s".repeat(32))).toBe(false);
    expect(otpMatches("+919876543211", "123456", h, "s".repeat(32))).toBe(false);
    expect(otpMatches("+919876543210", "123456", h, "t".repeat(32))).toBe(false);
    expect(otpMatches("+919876543210", "123456", "abc", "s".repeat(32))).toBe(false);
  });
});

describe("rate-limit window maths", () => {
  const now = new Date("2026-09-25T10:00:00Z");
  const ago = (s: number) => ({ createdAt: new Date(now.getTime() - s * 1000) });

  it("enforces the cooldown since the last send", () => {
    expect(retryAfter([ago(10)], now, 30_000, 5)).toBe(20);
    expect(retryAfter([ago(31)], now, 30_000, 5)).toBe(0);
    expect(retryAfter([], now, 30_000, 5)).toBe(0);
  });

  it("enforces the hourly cap until the oldest send leaves the window", () => {
    const five = [ago(60), ago(600), ago(1200), ago(1800), ago(3000)];
    expect(retryAfter(five, now, 30_000, 5)).toBe(600);
    expect(retryAfter(five.slice(0, 4), now, 30_000, 5)).toBe(0);
  });
});

describe("SMS provider guard", () => {
  it("uses the console provider in development", () => {
    expect(getSmsProvider({ NODE_ENV: "development" } as NodeJS.ProcessEnv).name).toBe("dev");
  });
  it("refuses the dev provider in production without the explicit flag", () => {
    expect(() => getSmsProvider({ NODE_ENV: "production", SMS_PROVIDER: "dev" } as NodeJS.ProcessEnv)).toThrow(/not allowed in production/);
    expect(() => getSmsProvider({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toThrow();
    expect(
      getSmsProvider({ NODE_ENV: "production", SMS_PROVIDER: "dev", ALLOW_DEV_SMS_IN_PRODUCTION: "true" } as NodeJS.ProcessEnv).name,
    ).toBe("dev");
  });
  it("unconfigured real providers fail loudly instead of pretending to send", async () => {
    await expect(getSmsProvider({ NODE_ENV: "production", SMS_PROVIDER: "msg91" } as NodeJS.ProcessEnv).sendOtp("+919876543210", "123456")).rejects.toThrow(/not configured/);
  });
});

describe("input validation", () => {
  it.each([
    ["9876543210", "+919876543210"],
    ["+91 98765 43210", "+919876543210"],
    ["09876543210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["5876543210", null],
    ["98765", null],
    ["+1 415 555 0100", null],
  ])("normalises %s", (input, expected) => {
    expect(normalizeIndianMobile(input)).toBe(expected);
  });

  const good = {
    fullName: "Priya R",
    phone: "9876543210",
    line1: "12, Gandhi Street",
    city: "Madurai",
    state: "Tamil Nadu",
    pincode: "625001",
  };
  it("accepts a valid address", () => expect(addressSchema.safeParse(good).success).toBe(true));
  it.each([
    ["pincode", { pincode: "62500" }],
    ["pincode", { pincode: "025001" }],
    ["phone", { phone: "12345" }],
    ["state", { state: "Atlantis" }],
    ["line1", { line1: " " }],
    ["fullName", { fullName: "<script>" }],
  ])("rejects bad %s", (field, over) => {
    const r = addressSchema.safeParse({ ...good, ...over });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path[0]).toBe(field);
  });

  it("only allows same-site redirects", () => {
    expect(safeNextPath("/checkout")).toBe("/checkout");
    expect(safeNextPath("//evil.com")).toBe("/account");
    expect(safeNextPath("https://evil.com")).toBe("/account");
    expect(safeNextPath("/\\evil.com")).toBe("/account");
  });
});
