import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, findSessionUser, revokeSession, SESSION_TTL_MS } from "@/lib/session";
import { clientIp, secureCookies, userAgent } from "./request";

export const SESSION_COOKIE = "oottam_session";

/** Current signed-in user (deduplicated per request). */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const found = await findSessionUser(prisma, token);
  return found?.user ?? null;
});

/** For protected pages: the proxy redirects optimistically, this is the authoritative check. */
export async function requireUser(nextPath: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Start a fresh session (old session token, if any, is revoked – rotation on login). */
export async function startSession(userId: string) {
  const jar = await cookies();
  await revokeSession(prisma, jar.get(SESSION_COOKIE)?.value);
  const { token } = await createSession(prisma, userId, { ip: await clientIp(), userAgent: await userAgent() });
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function endSession() {
  const jar = await cookies();
  await revokeSession(prisma, jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
}
