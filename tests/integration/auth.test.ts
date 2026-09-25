import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hasTestDb, makeVariant, resetDb, testClient } from "../support/db";
import { OTP_TTL_MS, requestOtp, verifyOtp } from "@/lib/otp";
import type { SmsProvider } from "@/lib/sms";
import { createSession, findSessionUser, revokeSession } from "@/lib/session";
import { createCart, findUserCartId, loadCart, mergeGuestCart } from "@/lib/cart";

const db = hasTestDb ? testClient() : (null as never);
const phone = "+919876543210";

class CapturingSms implements SmsProvider {
  readonly name = "test";
  codes: string[] = [];
  async sendOtp(_p: string, code: string) {
    this.codes.push(code);
  }
}

describe.skipIf(!hasTestDb)("phone OTP (Postgres)", () => {
  beforeEach(() => resetDb(db));
  afterAll(() => db?.$disconnect());

  it("stores only a hash and verifies once", async () => {
    const sms = new CapturingSms();
    const t0 = new Date();
    expect((await requestOtp(db, { phone, ip: "1.1.1.1", sms, now: t0 })).ok).toBe(true);
    const code = sms.codes[0];
    const row = await db.otpCode.findFirstOrThrow({ where: { phone } });
    expect(row.codeHash).not.toContain(code);
    expect(await verifyOtp(db, { phone, code })).toEqual({ ok: true });
    expect((await verifyOtp(db, { phone, code })).ok).toBe(false); // single use
  });

  it("expires after 5 minutes", async () => {
    const sms = new CapturingSms();
    const t0 = new Date();
    await requestOtp(db, { phone, sms, now: t0 });
    const res = await verifyOtp(db, { phone, code: sms.codes[0], now: new Date(t0.getTime() + OTP_TTL_MS + 1) });
    expect(res).toEqual({ ok: false, error: "expired" });
  });

  it("locks the code after 5 wrong attempts, even if the right code follows", async () => {
    const sms = new CapturingSms();
    await requestOtp(db, { phone, sms });
    const wrong = sms.codes[0] === "000000" ? "111111" : "000000";
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await verifyOtp(db, { phone, code: wrong }));
    expect(results[0]).toEqual({ ok: false, error: "invalid", attemptsLeft: 4 });
    expect(results[4]).toEqual({ ok: false, error: "too_many_attempts" });
    expect(await verifyOtp(db, { phone, code: sms.codes[0] })).toEqual({ ok: false, error: "too_many_attempts" });
  });

  it("parallel wrong guesses cannot exceed the attempt limit", async () => {
    const sms = new CapturingSms();
    await requestOtp(db, { phone, sms });
    const wrong = sms.codes[0] === "000000" ? "111111" : "000000";
    await Promise.all(Array.from({ length: 20 }, () => verifyOtp(db, { phone, code: wrong })));
    expect((await db.otpCode.findFirstOrThrow({ where: { phone } })).attempts).toBe(5);
  });

  it("rate-limits sends per phone (30 s cooldown, 5/hour) and per IP", async () => {
    const sms = new CapturingSms();
    const t0 = new Date();
    expect((await requestOtp(db, { phone, sms, now: t0 })).ok).toBe(true);
    const again = await requestOtp(db, { phone, sms, now: new Date(t0.getTime() + 5_000) });
    expect(again).toMatchObject({ ok: false, error: "rate_limited", retryAfterSeconds: 25 });
    for (let i = 1; i < 5; i++) {
      expect((await requestOtp(db, { phone, sms, now: new Date(t0.getTime() + i * 31_000) })).ok).toBe(true);
    }
    const sixth = await requestOtp(db, { phone, sms, now: new Date(t0.getTime() + 5 * 31_000) });
    expect(sixth).toMatchObject({ ok: false, error: "rate_limited" });

    // IP: 10/hour across different phones.
    const t1 = new Date(t0.getTime() + 10 * 60_000);
    for (let i = 0; i < 10; i++) {
      const r = await requestOtp(db, { phone: `+91900000000${i}`, ip: "9.9.9.9", sms, now: new Date(t1.getTime() + i * 11_000) });
      expect(r.ok).toBe(true);
    }
    const ipBlocked = await requestOtp(db, { phone: "+919111111111", ip: "9.9.9.9", sms, now: new Date(t1.getTime() + 200_000) });
    expect(ipBlocked).toMatchObject({ ok: false, error: "rate_limited" });
  });

  it("a new code replaces the previous one", async () => {
    const sms = new CapturingSms();
    const t0 = new Date();
    await requestOtp(db, { phone, sms, now: t0 });
    await requestOtp(db, { phone, sms, now: new Date(t0.getTime() + 31_000) });
    const [oldCode, newCode] = sms.codes;
    if (oldCode !== newCode) expect((await verifyOtp(db, { phone, code: oldCode })).ok).toBe(false);
    expect((await verifyOtp(db, { phone, code: newCode })).ok).toBe(true);
  });
});

describe.skipIf(!hasTestDb)("sessions & cart merge (Postgres)", () => {
  beforeEach(() => resetDb(db));

  it("stores only a token hash and supports revocation", async () => {
    const user = await db.user.create({ data: { phone } });
    const { token } = await createSession(db, user.id);
    expect(await db.session.count({ where: { tokenHash: token } })).toBe(0);
    expect((await findSessionUser(db, token))?.user.id).toBe(user.id);
    await revokeSession(db, token);
    expect(await findSessionUser(db, token)).toBeNull();
    expect(await findSessionUser(db, "garbage")).toBeNull();
  });

  it("merges the guest cart into the user's cart on login, clamped to stock", async () => {
    const user = await db.user.create({ data: { phone } });
    const a = await makeVariant(db, { stock: 4 });
    const b = await makeVariant(db, { stock: 10 });
    const userCart = await createCart(db, { userId: user.id });
    await db.cartItem.create({ data: { cartId: userCart, variantId: a.id, quantity: 3 } });
    const guestCart = await createCart(db, { guestToken: "guest-token-1" });
    await db.cartItem.createMany({ data: [{ cartId: guestCart, variantId: a.id, quantity: 3 }, { cartId: guestCart, variantId: b.id, quantity: 2 }] });

    const merged = await mergeGuestCart(db, "guest-token-1", user.id);
    expect(merged).toBe(userCart);
    const view = await loadCart(db, userCart);
    expect(Object.fromEntries(view.lines.map((l) => [l.variantId, l.quantity]))).toEqual({ [a.id]: 4, [b.id]: 2 });
    expect(await db.cart.findUnique({ where: { id: guestCart } })).toBeNull();
  });

  it("adopts the guest cart when the user has none", async () => {
    const user = await db.user.create({ data: { phone } });
    const a = await makeVariant(db, { stock: 4 });
    const guestCart = await createCart(db, { guestToken: "guest-token-2" });
    await db.cartItem.create({ data: { cartId: guestCart, variantId: a.id, quantity: 1 } });
    await mergeGuestCart(db, "guest-token-2", user.id);
    expect(await findUserCartId(db, user.id)).toBe(guestCart);
  });
});
