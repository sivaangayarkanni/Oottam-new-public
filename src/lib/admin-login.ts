/**
 * Owner password sign-in for /admin while no SMS provider is configured (phone OTP can't reach phones yet).
 *
 * - Disabled unless ADMIN_ACCESS_PASSWORD is set and at least 16 characters long.
 * - Constant-time comparison of SHA-256 digests (no length leak, no early exit).
 * - Rate limited from AuditLog: 5 failures per IP per 15 min, and 30 failures site-wide per hour
 *   (a global brake against distributed guessing). Every attempt is audited.
 * - Only signs in an active OWNER (preferably the one with SEED_OWNER_PHONE). STAFF keep using phone OTP.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import type { Db } from "./db";

export const ADMIN_LOGIN_LIMITS = { perIpPer15Min: 5, globalPerHour: 30, minPasswordLength: 16 } as const;

export class AdminLoginError extends Error {
  constructor(
    public code: "disabled" | "rate_limited" | "invalid" | "no_owner",
    message: string,
  ) {
    super(message);
  }
}

export function adminPasswordEnabled(expected: string | undefined | null): expected is string {
  return !!expected && expected.length >= ADMIN_LOGIN_LIMITS.minPasswordLength;
}

export function checkAdminPassword(input: string, expected: string | undefined | null): boolean {
  if (!adminPasswordEnabled(expected)) return false;
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b) && input.length === expected.length;
}

export async function adminPasswordLogin(
  db: Db,
  opts: { password: string; expected: string | undefined | null; ip: string | null; ownerPhone?: string | null; now?: Date },
) {
  if (!adminPasswordEnabled(opts.expected)) {
    throw new AdminLoginError("disabled", "Password sign-in is turned off. Use your phone number on the login page.");
  }
  const now = opts.now ?? new Date();
  const [ipFails, globalFails] = await Promise.all([
    opts.ip
      ? db.auditLog.count({
          where: { action: "admin.password_login_failed", ipAddress: opts.ip, createdAt: { gte: new Date(now.getTime() - 15 * 60_000) } },
        })
      : Promise.resolve(0),
    db.auditLog.count({ where: { action: "admin.password_login_failed", createdAt: { gte: new Date(now.getTime() - 60 * 60_000) } } }),
  ]);
  if (ipFails >= ADMIN_LOGIN_LIMITS.perIpPer15Min || globalFails >= ADMIN_LOGIN_LIMITS.globalPerHour) {
    throw new AdminLoginError("rate_limited", "Too many attempts. Please wait 15 minutes and try again.");
  }

  const password = opts.password.slice(0, 200);
  if (!checkAdminPassword(password, opts.expected)) {
    await db.auditLog.create({
      data: { action: "admin.password_login_failed", entityType: "User", ipAddress: opts.ip, createdAt: now },
    });
    throw new AdminLoginError("invalid", "That password isn't right.");
  }

  const owner =
    (opts.ownerPhone
      ? await db.user.findFirst({ where: { phone: opts.ownerPhone, role: "OWNER", isActive: true } })
      : null) ?? (await db.user.findFirst({ where: { role: "OWNER", isActive: true }, orderBy: { createdAt: "asc" } }));
  if (!owner) throw new AdminLoginError("no_owner", "No active owner account exists. Run the seed first.");

  await db.auditLog.create({
    data: { actorId: owner.id, action: "admin.password_login", entityType: "User", entityId: owner.id, ipAddress: opts.ip, createdAt: now },
  });
  return owner;
}
