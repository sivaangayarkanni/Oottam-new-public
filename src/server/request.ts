import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP (first X-Forwarded-For hop set by the hosting proxy). */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return ip ? ip.slice(0, 64) : null;
}

export async function userAgent(): Promise<string | null> {
  return (await headers()).get("user-agent");
}

export const secureCookies = process.env.NODE_ENV === "production";
