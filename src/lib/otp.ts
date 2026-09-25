/**
 * Phone OTP: generation, hashing, rate limiting and verification.
 *
 * - Only an HMAC-SHA256(OTP_HASH_SECRET, "phone:code") is stored, never the code.
 * - Codes expire after 5 minutes and allow 5 wrong attempts.
 * - Sending a new code invalidates older unused codes for that phone.
 * - Rate limits (from OtpCode rows, serialised per phone/IP with a Postgres advisory lock):
 *     per phone: 1 per 30 s, 5 per hour
 *     per IP:    1 per 10 s, 10 per hour
 * - Comparison uses crypto.timingSafeEqual.
 */
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { getSecret } from "./config";
import type { Db } from "./db";
import type { SmsProvider } from "./sms";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_LIMITS = {
  phoneCooldownMs: 30_000,
  phonePerHour: 5,
  ipCooldownMs: 10_000,
  ipPerHour: 10,
} as const;

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtp(phone: string, code: string, secret = getSecret("OTP_HASH_SECRET")): string {
  return createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
}

export function otpMatches(phone: string, code: string, storedHash: string, secret?: string): boolean {
  const a = Buffer.from(hashOtp(phone, code, secret), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type RequestOtpResult =
  | { ok: true; resendAfterSeconds: number }
  | { ok: false; error: "rate_limited"; retryAfterSeconds: number }
  | { ok: false; error: "send_failed" };

export async function requestOtp(
  db: Db,
  opts: { phone: string; ip?: string | null; sms: SmsProvider; now?: Date },
): Promise<RequestOtpResult> {
  const now = opts.now ?? new Date();
  const hourAgo = new Date(now.getTime() - 3_600_000);
  const code = generateOtp();

  const outcome = await db.$transaction(async (tx) => {
    // Serialise concurrent requests for the same phone / IP so limits can't be raced.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"otp:" + opts.phone}))`;
    if (opts.ip) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"otp-ip:" + opts.ip}))`;

    const recent = await tx.otpCode.findMany({
      where: { phone: opts.phone, createdAt: { gte: hourAgo } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const retryPhone = retryAfter(recent, now, OTP_LIMITS.phoneCooldownMs, OTP_LIMITS.phonePerHour);
    let retryIp = 0;
    if (opts.ip) {
      const recentIp = await tx.otpCode.findMany({
        where: { ipAddress: opts.ip, createdAt: { gte: hourAgo } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      retryIp = retryAfter(recentIp, now, OTP_LIMITS.ipCooldownMs, OTP_LIMITS.ipPerHour);
    }
    const wait = Math.max(retryPhone, retryIp);
    if (wait > 0) return { kind: "limited" as const, wait };

    await tx.otpCode.updateMany({
      where: { phone: opts.phone, consumedAt: null },
      data: { consumedAt: now },
    });
    const row = await tx.otpCode.create({
      data: {
        phone: opts.phone,
        codeHash: hashOtp(opts.phone, code),
        purpose: "LOGIN",
        maxAttempts: OTP_MAX_ATTEMPTS,
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
        ipAddress: opts.ip ?? null,
        createdAt: now,
      },
    });
    return { kind: "created" as const, id: row.id };
  });

  if (outcome.kind === "limited") return { ok: false, error: "rate_limited", retryAfterSeconds: outcome.wait };

  try {
    await opts.sms.sendOtp(opts.phone, code);
  } catch (err) {
    console.error("[otp] SMS send failed:", err instanceof Error ? err.message : err);
    // Keep the row (it still counts towards rate limits) but make it unusable.
    await db.otpCode.update({ where: { id: outcome.id }, data: { consumedAt: now } });
    return { ok: false, error: "send_failed" };
  }
  return { ok: true, resendAfterSeconds: OTP_LIMITS.phoneCooldownMs / 1000 };
}

/** Seconds until another send is allowed given recent sends (newest first). 0 = allowed. */
export function retryAfter(recent: { createdAt: Date }[], now: Date, cooldownMs: number, perHour: number): number {
  let waitMs = 0;
  if (recent[0]) waitMs = Math.max(waitMs, recent[0].createdAt.getTime() + cooldownMs - now.getTime());
  if (recent.length >= perHour) {
    const oldestInWindow = recent[perHour - 1];
    waitMs = Math.max(waitMs, oldestInWindow.createdAt.getTime() + 3_600_000 - now.getTime());
  }
  return waitMs > 0 ? Math.ceil(waitMs / 1000) : 0;
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "expired" | "too_many_attempts" }
  | { ok: false; error: "invalid"; attemptsLeft: number };

export async function verifyOtp(db: Db, opts: { phone: string; code: string; now?: Date }): Promise<VerifyOtpResult> {
  const now = opts.now ?? new Date();
  const otp = await db.otpCode.findFirst({
    where: { phone: opts.phone, purpose: "LOGIN", consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { ok: false, error: "not_found" };
  if (otp.expiresAt <= now) return { ok: false, error: "expired" };

  // Count the attempt atomically before comparing, so parallel guesses can't exceed the limit.
  const counted = await db.otpCode.updateMany({
    where: { id: otp.id, consumedAt: null, attempts: { lt: otp.maxAttempts } },
    data: { attempts: { increment: 1 } },
  });
  if (counted.count === 0) return { ok: false, error: "too_many_attempts" };

  if (!/^\d{6}$/.test(opts.code) || !otpMatches(opts.phone, opts.code, otp.codeHash)) {
    const attemptsLeft = Math.max(otp.maxAttempts - (otp.attempts + 1), 0);
    return attemptsLeft === 0 ? { ok: false, error: "too_many_attempts" } : { ok: false, error: "invalid", attemptsLeft };
  }

  // Single use: only one concurrent verifier can consume the code.
  const consumed = await db.otpCode.updateMany({
    where: { id: otp.id, consumedAt: null },
    data: { consumedAt: now },
  });
  return consumed.count === 1 ? { ok: true } : { ok: false, error: "not_found" };
}
