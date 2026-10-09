import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Ban, Bell, CheckCheck, ClipboardCheck, ShoppingBag } from "lucide-react";
import clsx from "clsx";
import { prisma } from "@/lib/prisma";
import { listNotifications } from "@/lib/notifications";
import { requireStaff } from "@/server/auth";
import { markNotificationsReadAction } from "@/app/actions/admin";
import { Mascot, SpeechBubble } from "@/components/mascot";

export const metadata: Metadata = { title: "Notifications", robots: { index: false, follow: false } };

const ist = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
const ICON: Record<string, typeof Bell> = {
  "order.placed": ShoppingBag,
  "payment.utr_submitted": ClipboardCheck,
  "order.cancelled": Ban,
  "order.expired": Ban,
};

export default async function NotificationsPage({ searchParams }: PageProps<"/admin/notifications">) {
  await requireStaff("/admin/notifications");
  const { show } = await searchParams;
  const unreadOnly = show === "unread";
  const [items, unread] = await Promise.all([
    listNotifications(prisma, { take: 100, unreadOnly }),
    prisma.notification.count({ where: { readAt: null } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl font-extrabold">Notifications</h1>
          <p className="mt-1 text-ink-soft">
            New orders, UPI payments to check, and cancelled or expired orders. This page updates every 20 seconds.
          </p>
        </div>
        {unread > 0 && (
          <form action={markNotificationsReadAction}>
            <input type="hidden" name="all" value="1" />
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-leaf px-5 font-bold text-white hover:bg-leaf-deep">
              <CheckCheck className="h-5 w-5" aria-hidden /> Mark all read ({unread})
            </button>
          </form>
        )}
      </div>

      <nav aria-label="Filter" className="mt-6 flex gap-2 text-sm font-bold">
        <Link href="/admin/notifications" aria-current={!unreadOnly ? "page" : undefined} className={clsx("rounded-full px-4 py-1.5 ring-1 ring-ink/15", !unreadOnly && "bg-ink text-cream")}>
          All
        </Link>
        <Link href="/admin/notifications?show=unread" aria-current={unreadOnly ? "page" : undefined} className={clsx("rounded-full px-4 py-1.5 ring-1 ring-ink/15", unreadOnly && "bg-ink text-cream")}>
          Unread ({unread})
        </Link>
      </nav>

      {items.length === 0 ? (
        <div className="mt-6 flex items-center gap-4 rounded-[2rem] bg-white p-6 ring-1 ring-ink/10">
          <Mascot size={80} animate="none" decorative />
          <SpeechBubble tail="left" className="text-base">
            {unreadOnly ? "All read. Nice and tidy!" : "No notifications yet. New orders will show up here."}
          </SpeechBubble>
        </div>
      ) : (
        <ul className="mt-6 space-y-3" data-testid="notification-list">
          {items.map((n) => {
            const Icon = ICON[n.type] ?? Bell;
            const isUnread = !n.readAt;
            return (
              <li
                key={n.id}
                className={clsx(
                  "flex gap-4 rounded-[1.5rem] bg-white p-4 ring-1 sm:p-5",
                  isUnread ? "ring-2 ring-saffron" : "ring-ink/10 opacity-80",
                )}
              >
                <span className={clsx("mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full", isUnread ? "bg-saffron text-white" : "bg-cream-deep text-ink-soft")}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {isUnread && <span className="mr-2 rounded-full bg-saffron/15 px-2 py-0.5 text-xs font-extrabold uppercase text-saffron">New</span>}
                    {n.title}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">{n.body}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
                    <span>{ist(n.createdAt)} IST</span>
                    {n.orderNumber && (
                      <Link href={n.type === "payment.utr_submitted" ? "/admin/payments" : `/orders/${n.orderNumber}`} className="font-bold text-saffron underline">
                        {n.type === "payment.utr_submitted" ? "Verify payment" : `Open ${n.orderNumber}`}
                      </Link>
                    )}
                    {n.readAt && (
                      <span className="inline-flex items-center gap-1">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Read {n.readBy?.name ? `by ${n.readBy.name}` : ""}
                      </span>
                    )}
                  </p>
                </div>
                {isUnread && (
                  <form action={markNotificationsReadAction} className="shrink-0">
                    <input type="hidden" name="id" value={n.id} />
                    <button className="min-h-9 rounded-full px-3 text-sm font-bold text-leaf-deep ring-1 ring-leaf/40 hover:bg-leaf/10">Mark read</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
