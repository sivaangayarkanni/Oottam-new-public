/**
 * In-app notifications for OWNER/STAFF, plus optional outbound alerts (email via Resend, Telegram).
 *
 * - `notifyStaff` is called with the transaction client, so a notification exists iff the event committed.
 * - `dispatchPendingAlerts` sends outbound alerts for undispatched notifications. Each one is claimed atomically
 *   (dispatchedAt), so it's sent at most once even if two servers run it. Channels are no-ops unless their env
 *   vars are set, and failures are logged, never thrown, so checkout can't break because of an alert.
 */
import type { Db, Tx } from "../db";
import { formatPaise } from "../money";

export const NOTIFICATION_TYPES = ["order.placed", "payment.utr_submitted", "order.cancelled", "order.expired"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NewNotification = {
  type: NotificationType;
  title: string;
  body: string;
  orderId?: string | null;
  orderNumber?: string | null;
};

export async function notifyStaff(tx: Tx | Db, n: NewNotification) {
  return tx.notification.create({
    data: {
      type: n.type,
      title: n.title.slice(0, 200),
      body: n.body.slice(0, 1000),
      orderId: n.orderId ?? null,
      orderNumber: n.orderNumber ?? null,
    },
  });
}

const METHOD_LABEL: Record<string, string> = { UPI: "UPI", COD: "Cash on delivery", RAZORPAY: "Online" };

/** Copy for each event (kept here so tests and all call sites agree). */
export const notificationCopy = {
  orderPlaced(o: { orderNumber: string; customerName: string; totalInPaise: number; paymentMethod: string; itemCount: number }) {
    return {
      type: "order.placed" as const,
      title: `New order ${o.orderNumber} · ${formatPaise(o.totalInPaise)}`,
      body: `${o.customerName} ordered ${o.itemCount} pack${o.itemCount === 1 ? "" : "s"}. Payment: ${METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod}${o.paymentMethod === "UPI" ? " (waiting for the customer to pay)" : ""}.`,
    };
  },
  utrSubmitted(o: { orderNumber: string; customerName: string; amountInPaise: number; utr: string }) {
    return {
      type: "payment.utr_submitted" as const,
      title: `Check UPI payment for ${o.orderNumber}`,
      body: `${o.customerName} says they paid ${formatPaise(o.amountInPaise)} with UTR ${o.utr}. Match it in the bank app, then confirm or reject.`,
    };
  },
  orderCancelled(o: { orderNumber: string; reason: string; expired: boolean }) {
    return {
      type: (o.expired ? "order.expired" : "order.cancelled") as NotificationType,
      title: o.expired ? `Order ${o.orderNumber} expired (unpaid)` : `Order ${o.orderNumber} cancelled`,
      body: `${o.reason}. Stock has been released.`,
    };
  },
};

export async function unreadCount(db: Db) {
  return db.notification.count({ where: { readAt: null } });
}

export async function listNotifications(db: Db, opts: { take?: number; unreadOnly?: boolean } = {}) {
  return db.notification.findMany({
    where: opts.unreadOnly ? { readAt: null } : undefined,
    orderBy: { createdAt: "desc" },
    take: Math.min(opts.take ?? 50, 200),
    include: { readBy: { select: { name: true, phone: true } } },
  });
}

/** Mark specific notifications (or all unread ones) as read. Returns how many changed. */
export async function markNotificationsRead(db: Db, opts: { ids?: string[]; all?: boolean; actorId: string; now?: Date }) {
  const now = opts.now ?? new Date();
  if (!opts.all && (!opts.ids || opts.ids.length === 0)) return 0;
  const r = await db.notification.updateMany({
    where: { readAt: null, ...(opts.all ? {} : { id: { in: opts.ids!.slice(0, 200) } }) },
    data: { readAt: now, readById: opts.actorId },
  });
  return r.count;
}

// ── Outbound alerts ────────────────────────────────────────────────────────────

type Fetch = typeof fetch;
type Sendable = { title: string; body: string; orderNumber: string | null };

export type AlertChannel = { name: string; send: (n: Sendable, f: Fetch) => Promise<void> };

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function ok(res: Response, channel: string) {
  if (!res.ok) throw new Error(`${channel} responded ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
}

/** Channels enabled by env vars. Empty list = outbound alerts off (in-app notifications still work). */
export function alertChannels(env: NodeJS.ProcessEnv = process.env): AlertChannel[] {
  const channels: AlertChannel[] = [];
  const site = (env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const adminUrl = site ? `${site}/admin/notifications` : "";

  if (env.RESEND_API_KEY && env.ADMIN_ALERT_EMAIL) {
    const to = env.ADMIN_ALERT_EMAIL.split(",").map((s) => s.trim()).filter(Boolean);
    const from = env.ALERT_EMAIL_FROM || "Oottam alerts <onboarding@resend.dev>";
    channels.push({
      name: "email",
      async send(n, f) {
        const url = adminUrl;
        const res = await f("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to,
            subject: `[Oottam] ${n.title}`,
            text: `${n.body}${url ? `\n\nOpen: ${url}` : ""}`,
            html: `<p><b>${escapeHtml(n.title)}</b></p><p>${escapeHtml(n.body)}</p>${url ? `<p><a href="${escapeHtml(url)}">Open admin</a></p>` : ""}`,
          }),
          signal: AbortSignal.timeout(8000),
        });
        await ok(res, "Resend");
      },
    });
  }
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    channels.push({
      name: "telegram",
      async send(n, f) {
        const url = adminUrl;
        const res = await f(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: env.TELEGRAM_CHAT_ID,
            text: `🔔 ${n.title}\n${n.body}${url ? `\n${url}` : ""}`,
            disable_web_page_preview: true,
          }),
          signal: AbortSignal.timeout(8000),
        });
        await ok(res, "Telegram");
      },
    });
  }
  return channels;
}

/**
 * Send outbound alerts for notifications not yet dispatched (only the last `maxAgeMinutes`, so enabling a channel
 * later doesn't replay old history). Never throws.
 */
export async function dispatchPendingAlerts(
  db: Db,
  opts: { channels?: AlertChannel[]; fetch?: Fetch; now?: Date; maxAgeMinutes?: number; limit?: number } = {},
) {
  const channels = opts.channels ?? alertChannels();
  const result = { sent: 0, failed: 0 };
  if (channels.length === 0) return result;
  const now = opts.now ?? new Date();
  const f = opts.fetch ?? fetch;
  try {
    const pending = await db.notification.findMany({
      where: { dispatchedAt: null, createdAt: { gte: new Date(now.getTime() - (opts.maxAgeMinutes ?? 60) * 60_000) } },
      orderBy: { createdAt: "asc" },
      take: opts.limit ?? 20,
    });
    for (const n of pending) {
      const claimed = await db.notification.updateMany({ where: { id: n.id, dispatchedAt: null }, data: { dispatchedAt: now } });
      if (claimed.count !== 1) continue;
      for (const ch of channels) {
        try {
          await ch.send(n, f);
          result.sent++;
        } catch (err) {
          result.failed++;
          console.error(`[alerts] ${ch.name} failed for ${n.id}:`, err instanceof Error ? err.message : err);
        }
      }
    }
  } catch (err) {
    console.error("[alerts] dispatch failed:", err instanceof Error ? err.message : err);
  }
  return result;
}
