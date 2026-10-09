import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ClipboardCheck, Hourglass, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPaise } from "@/lib/money";
import { requireStaff } from "@/server/auth";
import { Mascot, SpeechBubble } from "@/components/mascot";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
const ist = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

/** Minimal admin home (full admin panel comes in Module 5). */
export default async function AdminHome() {
  const staff = await requireStaff("/admin");
  const since = hoursAgo(24);
  const [toVerify, awaitingPay, unread, todayCount, recent] = await Promise.all([
    prisma.payment.count({ where: { status: "PENDING_VERIFICATION" } }),
    prisma.order.count({ where: { status: "PENDING", paymentMethod: "UPI", payments: { some: { status: "CREATED" } } } }),
    prisma.notification.count({ where: { readAt: null } }),
    prisma.order.count({ where: { placedAt: { gte: since } } }),
    prisma.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 8,
      select: { orderNumber: true, customerName: true, totalInPaise: true, status: true, paymentMethod: true, placedAt: true },
    }),
  ]);

  const cards = [
    { href: "/admin/payments", label: "UPI payments to check", value: toVerify, icon: ClipboardCheck, hot: toVerify > 0 },
    { href: "/admin/payments#awaiting-h", label: "Waiting for customer to pay", value: awaitingPay, icon: Hourglass, hot: false },
    { href: "/admin/notifications", label: "Unread notifications", value: unread, icon: Bell, hot: unread > 0 },
    { href: "/admin/payments", label: "Orders in the last 24 h", value: todayCount, icon: ShoppingBag, hot: false },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center gap-4">
        <Mascot size={90} animate="none" decorative />
        <SpeechBubble tail="left" className="text-base">
          Vanakkam, {staff.name ?? "Owner"}! {toVerify > 0 ? `${toVerify} UPI payment${toVerify === 1 ? "" : "s"} to check.` : "Nothing waiting on you right now."}
        </SpeechBubble>
      </div>
      <h1 className="mt-6 font-display text-5xl font-extrabold">Admin</h1>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label}>
            <Link
              href={c.href}
              className={`flex h-full flex-col gap-2 rounded-[2rem] bg-white p-5 ring-1 transition hover:-translate-y-0.5 ${c.hot ? "ring-2 ring-saffron" : "ring-ink/10"}`}
            >
              <c.icon className={`h-6 w-6 ${c.hot ? "text-saffron" : "text-leaf"}`} aria-hidden />
              <span className="font-display text-4xl font-extrabold">{c.value}</span>
              <span className="text-sm font-bold text-ink-soft">{c.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="recent-orders-h" className="mt-10 rounded-[2rem] bg-white p-6 ring-1 ring-ink/10">
        <h2 id="recent-orders-h" className="font-display text-2xl font-extrabold">Latest orders</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-ink-soft">No orders yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink/10">
            {recent.map((o) => (
              <li key={o.orderNumber} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <Link href={`/orders/${o.orderNumber}`} className="font-mono font-bold text-saffron underline">
                  {o.orderNumber}
                </Link>
                <span className="min-w-32 flex-1">{o.customerName}</span>
                <span>{o.paymentMethod}</span>
                <span className="font-bold">{o.status}</span>
                <span className="font-bold">{formatPaise(o.totalInPaise)}</span>
                <span className="text-ink-soft">{ist(o.placedAt)} IST</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
