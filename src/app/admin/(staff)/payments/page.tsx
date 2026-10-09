import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPaise } from "@/lib/money";
import { formatIndianMobile } from "@/lib/phone";
import { upiAmount } from "@/lib/payments/upi";
import { getUpiConfig } from "@/lib/config";
import { requireStaff } from "@/server/auth";
import { VerifyControls } from "@/components/admin/verify-card";
import { CopyButton } from "@/components/payments/copy-button";
import { Mascot, SpeechBubble } from "@/components/mascot";

export const metadata: Metadata = { title: "Verify UPI payments", robots: { index: false, follow: false } };

const ist = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

function age(from: Date) {
  const mins = Math.round((Date.now() - from.getTime()) / 60_000);
  return mins < 60 ? `${mins} min ago` : mins < 48 * 60 ? `${Math.round(mins / 60)} h ago` : `${Math.round(mins / 1440)} days ago`;
}

/** Minimal OWNER/STAFF screen for manual UPI verification (full admin comes in Module 5). */
const DONE_COPY = {
  confirmed: "marked as paid. The customer's order page now shows Paid.",
  rejected: "rejected and sent back to the customer to pay / re-enter the UTR.",
  cancelled: "rejected; the order was cancelled and its stock released.",
} as const;

export default async function AdminPaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  const sp = await searchParams;
  const doneKey = typeof sp.done === "string" && sp.done in DONE_COPY ? (sp.done as keyof typeof DONE_COPY) : null;
  const doneOrder = typeof sp.order === "string" && /^[A-Z0-9-]{4,32}$/.test(sp.order) ? sp.order : null;
  const staff = await requireStaff("/admin/payments");
  const upi = getUpiConfig();
  const [pending, awaiting, recent] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "PENDING_VERIFICATION" },
      orderBy: { submittedAt: "asc" },
      include: { order: { include: { items: { select: { productNameEn: true, flavourEn: true, quantity: true } } } } },
    }),
    prisma.order.findMany({
      where: { status: "PENDING", paymentMethod: "UPI", payments: { some: { status: "CREATED" } } },
      orderBy: { placedAt: "desc" },
      take: 20,
      select: { orderNumber: true, customerName: true, customerPhone: true, totalInPaise: true, placedAt: true, paymentDueAt: true },
    }),
    prisma.payment.findMany({
      where: { provider: "upi", status: { in: ["CAPTURED", "REJECTED"] }, verifiedAt: { not: null } },
      orderBy: { verifiedAt: "desc" },
      take: 10,
      include: { order: { select: { orderNumber: true, customerName: true } }, verifiedBy: { select: { name: true, phone: true } } },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-bold text-leaf"><ShieldCheck className="h-5 w-5" aria-hidden /> Staff only · {staff.name ?? "Owner"}</p>
          <h1 className="font-display text-5xl font-extrabold">UPI payments</h1>
          <p className="mt-1 text-ink-soft">
            Check each amount + UTR in the bank app for <b>{upi?.vpa ?? "the shop UPI ID"}</b>, then confirm or reject.
          </p>
        </div>
      </div>

      {doneKey && doneOrder && (
        <p role="status" className="mt-6 flex items-center gap-2 rounded-2xl bg-leaf/10 px-4 py-3 font-bold text-leaf-deep">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden /> {doneOrder} {DONE_COPY[doneKey]}
        </p>
      )}

      <section aria-labelledby="pending-h" className="mt-8">
        <h2 id="pending-h" className="font-display text-2xl font-extrabold">
          Awaiting verification <span className="ml-1 rounded-full bg-saffron px-2.5 text-lg text-white">{pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <div className="mt-4 flex items-center gap-4 rounded-[2rem] bg-white p-6 ring-1 ring-ink/10">
            <Mascot size={80} animate="none" decorative />
            <SpeechBubble tail="left" className="text-base">All caught up! No payments to check.</SpeechBubble>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 lg:grid-cols-2">
            {pending.map((p) => (
              <li key={p.id} className="rounded-[2rem] border-2 border-ink bg-white p-6 shadow-[5px_5px_0_0_var(--color-ink)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/orders/${p.order.orderNumber}`} className="font-display text-xl font-bold hover:underline">
                      {p.order.orderNumber}
                    </Link>
                    <p className="text-sm text-ink-soft">
                      {p.order.customerName} · {formatIndianMobile(p.order.customerPhone)}
                    </p>
                  </div>
                  <p className="font-display text-4xl font-extrabold">₹{upiAmount(p.amountInPaise)}</p>
                </div>
                <dl className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
                  <dt className="text-ink-soft">UTR</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-lg font-bold tracking-wider">{p.utr}</span>
                    {p.utr && <CopyButton value={p.utr} label="UTR" />}
                  </dd>
                  <dt className="text-ink-soft">Submitted</dt>
                  <dd>{p.submittedAt ? `${ist(p.submittedAt)} IST (${age(p.submittedAt)})` : "–"}</dd>
                  <dt className="text-ink-soft">Paid to</dt>
                  <dd className="font-mono">{p.upiVpa ?? "–"}</dd>
                  <dt className="text-ink-soft">Items</dt>
                  <dd>{p.order.items.map((i) => `${i.productNameEn} (${i.flavourEn}) ×${i.quantity}`).join(", ")}</dd>
                </dl>
                <div className="mt-5">
                  <VerifyControls paymentId={p.id} amount={upiAmount(p.amountInPaise)} utr={p.utr ?? ""} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="awaiting-h" className="rounded-[2rem] bg-white p-6 ring-1 ring-ink/10">
          <h2 id="awaiting-h" className="font-display text-xl font-extrabold">Waiting for the customer to pay ({awaiting.length})</h2>
          {awaiting.length === 0 ? (
            <p className="mt-2 text-ink-soft">None.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/10 text-sm">
              {awaiting.map((o) => (
                <li key={o.orderNumber} className="flex flex-wrap justify-between gap-2 py-2">
                  <Link href={`/orders/${o.orderNumber}`} className="font-bold hover:underline">{o.orderNumber}</Link>
                  <span>{o.customerName}</span>
                  <span className="font-bold">{formatPaise(o.totalInPaise)}</span>
                  <span className="w-full text-ink-soft">
                    Placed {ist(o.placedAt)} · stock held until {o.paymentDueAt ? ist(o.paymentDueAt) : "–"} IST
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="recent-h" className="rounded-[2rem] bg-white p-6 ring-1 ring-ink/10">
          <h2 id="recent-h" className="font-display text-xl font-extrabold">Recently verified</h2>
          {recent.length === 0 ? (
            <p className="mt-2 text-ink-soft">Nothing yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/10 text-sm">
              {recent.map((p) => (
                <li key={p.id} className="py-2">
                  <span className={p.status === "CAPTURED" ? "font-bold text-leaf-deep" : "font-bold text-chekka"}>
                    {p.status === "CAPTURED" ? "Confirmed" : "Rejected"}
                  </span>{" "}
                  {p.order.orderNumber} · ₹{upiAmount(p.amountInPaise)} · UTR <span className="font-mono">{p.utr}</span>
                  <span className="block text-ink-soft">
                    by {p.verifiedBy?.name ?? p.verifiedBy?.phone ?? "unknown"} · {p.verifiedAt ? ist(p.verifiedAt) : ""} IST
                    {p.rejectionReason ? ` · “${p.rejectionReason}”` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
