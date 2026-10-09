import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredOrders } from "@/lib/orders";
import { pendingOrderTtlMinutes } from "@/lib/config";
import { dispatchPendingAlerts } from "@/lib/notifications";

const RELEASE_EVERY_MS = 2 * 60_000;
let lastRelease = 0;

/** Release unpaid orders past their payment window. Throttled per server instance; safe to run concurrently. */
export async function releaseExpiredNow(force = false) {
  const now = Date.now();
  if (!force && now - lastRelease < RELEASE_EVERY_MS) return { released: [] as string[] };
  lastRelease = now;
  return releaseExpiredOrders(prisma, { ttlMinutes: pendingOrderTtlMinutes() });
}

/**
 * Run housekeeping after the response is sent: lazy expiry (Vercel Hobby crons only run daily) and outbound alerts.
 * Never throws into the request.
 */
export function scheduleBackgroundJobs(opts: { release?: boolean } = {}) {
  after(async () => {
    try {
      if (opts.release !== false) {
        const r = await releaseExpiredNow();
        if (r.released.length) console.log(`[expiry] released ${r.released.length} order(s)`);
      }
      await dispatchPendingAlerts(prisma);
    } catch (err) {
      console.error("[background] failed:", err instanceof Error ? err.message : err);
    }
  });
}
