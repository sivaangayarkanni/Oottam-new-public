import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreditCard, MapPin, Package, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPaise } from "@/lib/money";
import { formatIndianMobile } from "@/lib/phone";
import { verifyOrderAccessToken } from "@/lib/tokens";
import { pendingOrderTtlMinutes } from "@/lib/config";
import type { AddressSnapshot } from "@/lib/orders";
import { getCurrentUser } from "@/server/auth";
import { Mascot, SpeechBubble } from "@/components/mascot";
import { Confetti } from "@/components/confetti";
import { OrderStatusBadge } from "@/components/account/order-status";
import { ButtonLink } from "@/components/button-link";

// The guest access token lives in the URL, so never leak it via Referer to other sites.
export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false }, referrer: "same-origin" };

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[orderNumber]">) {
  const { orderNumber } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : null;
  const placed = sp.placed === "1";
  if (!/^OTM-\d{4}-\d{6,}$/.test(orderNumber)) notFound();

  const [order, user] = await Promise.all([
    prisma.order.findUnique({ where: { orderNumber }, include: { items: true, payments: true } }),
    getCurrentUser(),
  ]);
  // Owner, staff, or a guest holding the signed link. Anyone else gets a 404 (no existence leak).
  const allowed =
    !!order &&
    ((user && order.userId === user.id) ||
      (user && (user.role === "OWNER" || user.role === "STAFF")) ||
      verifyOrderAccessToken(order.orderNumber, token));
  if (!order || !allowed) notFound();

  const addr = order.shippingAddress as unknown as AddressSnapshot;
  const awaitingPayment = order.status === "PENDING" && order.paymentMethod === "RAZORPAY";
  const guestLink = !user && token;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      {placed && <Confetti />}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-saffron px-6 py-10 text-white sm:px-10">
        <div aria-hidden className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-turmeric/40 blur-2xl" />
        <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="font-display text-xl font-bold text-turmeric">{placed ? "Order placed!" : "Order details"}</p>
            <h1 className="mt-1 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              {placed ? "Nandri! Breakfast is on its way to being sorted." : `Order ${order.orderNumber}`}
            </h1>
            <p className="mt-3 text-lg text-white/90">
              Order number <b className="rounded-lg bg-white/20 px-2 py-0.5 font-display tracking-wide">{order.orderNumber}</b>
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <OrderStatusBadge status={order.status} className="bg-white text-ink" />
              <span className="text-sm text-white/85">
                Placed {order.placedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} IST
              </span>
            </div>
          </div>
          <div className="hidden flex-col items-center sm:flex">
            <SpeechBubble tail="bottom" className="max-w-52 text-base">
              {placed ? "Woohoo! நன்றி! I'll get the pans ready." : "Here's your order!"}
            </SpeechBubble>
            <Mascot size={150} animate="wobble" shadow={false} className="mt-3" />
          </div>
        </div>
      </section>

      {awaitingPayment && (
        <section aria-labelledby="pay-h" className="mt-6 flex flex-col gap-4 rounded-[2rem] border-2 border-dashed border-saffron bg-white p-6 sm:flex-row sm:items-center">
          <CreditCard className="h-10 w-10 shrink-0 text-saffron" aria-hidden />
          <div className="flex-1">
            <h2 id="pay-h" className="font-display text-2xl font-extrabold">Payment: awaiting</h2>
            <p className="text-ink-soft">
              Online payment connects in the next step. Your packs are reserved for {pendingOrderTtlMinutes()} minutes. Meanwhile
              you can confirm this order with us on WhatsApp.
            </p>
          </div>
          <button type="button" disabled className="min-h-12 cursor-not-allowed rounded-full bg-ink/15 px-6 font-display text-lg font-bold text-ink/60">
            Pay {formatPaise(order.totalInPaise)} (soon)
          </button>
        </section>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="items-h" className="rounded-[2rem] bg-white p-6 ring-1 ring-ink/10">
          <h2 id="items-h" className="flex items-center gap-2 font-display text-2xl font-extrabold">
            <Package className="h-6 w-6 text-saffron" aria-hidden /> Items
          </h2>
          <ul className="mt-4 divide-y divide-ink/10">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 py-3">
                <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-cream-deep">
                  {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="48px" className="object-cover object-top" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{i.productNameEn}</span>
                  <span className="block text-sm text-ink-soft">
                    {i.flavourEn} · {i.sizeGrams} g · {formatPaise(i.unitPriceInPaise)} × {i.quantity}
                  </span>
                </span>
                <span className="font-bold">{formatPaise(i.lineTotalInPaise)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-ink/10 pt-4">
            <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{formatPaise(order.subtotalInPaise)}</dd></div>
            {order.discountInPaise > 0 && (
              <div className="flex justify-between text-leaf-deep"><dt>Discount ({order.couponCode})</dt><dd>−{formatPaise(order.discountInPaise)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-ink-soft">Delivery</dt><dd>{order.shippingInPaise ? formatPaise(order.shippingInPaise) : "Free"}</dd></div>
            <div className="flex justify-between pt-2 font-display text-2xl font-extrabold"><dt>Total</dt><dd>{formatPaise(order.totalInPaise)}</dd></div>
          </dl>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="ship-h" className="rounded-[2rem] bg-white p-6 ring-1 ring-ink/10">
            <h2 id="ship-h" className="flex items-center gap-2 font-display text-xl font-extrabold">
              <MapPin className="h-5 w-5 text-saffron" aria-hidden /> Delivering to
            </h2>
            <p className="mt-2 font-bold">{addr.fullName}</p>
            <p className="text-ink-soft">
              {[addr.line1, addr.line2, addr.landmark, addr.city, addr.district, addr.state].filter(Boolean).join(", ")} – {addr.pincode}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm"><Phone className="h-4 w-4" aria-hidden /> {formatIndianMobile(order.customerPhone)}</p>
          </section>
          <section className="rounded-[2rem] bg-white p-6 ring-1 ring-ink/10">
            <h2 className="font-display text-xl font-extrabold">What happens next?</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-soft">
              <li>{awaitingPayment ? "Complete payment (coming soon)." : "We confirm your order."}</li>
              <li>We pack your mixes fresh.</li>
              <li>You get tracking details once it ships.</li>
            </ol>
          </section>
          {guestLink && (
            <p className="rounded-2xl bg-turmeric/25 p-4 text-sm">
              <b>Bookmark this page</b> to check your order later, or{" "}
              <Link href="/login" className="font-bold underline">log in with {formatIndianMobile(order.customerPhone)}</Link> to see all your orders.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/shop">Keep shopping</ButtonLink>
            {user && <ButtonLink href="/account" variant="ghost">My orders</ButtonLink>}
          </div>
        </div>
      </div>
    </main>
  );
}
