/**
 * DB-backed sessions. The cookie carries a random 256-bit token; only its SHA-256 hash is stored,
 * so a database leak does not leak usable sessions. Sessions can be revoked (logout / admin).
 */
import type { Db } from "./db";
import { randomToken, sha256 } from "./tokens";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export async function createSession(
  db: Db,
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt,
      ipAddress: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
    },
  });
  return { token, expiresAt };
}

export async function findSessionUser(db: Db, token: string | undefined | null) {
  if (!token || token.length > 100) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  const now = Date.now();
  if (!session || session.revokedAt || session.expiresAt.getTime() <= now || !session.user.isActive) return null;
  if (now - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date(now) } }).catch(() => {});
  }
  return { sessionId: session.id, user: session.user };
}

export async function revokeSession(db: Db, token: string | undefined | null) {
  if (!token) return;
  await db.session.updateMany({
    where: { tokenHash: sha256(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** For the admin module: sign a user out everywhere. */
export async function revokeAllSessions(db: Db, userId: string) {
  await db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}
