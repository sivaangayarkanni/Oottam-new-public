import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, MapPin, Package, Pencil, Plus, Star, Trash2, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPaise } from "@/lib/money";
import { formatIndianMobile } from "@/lib/phone";
import { requireUser } from "@/server/auth";
import { logoutAction } from "@/app/actions/auth";
import { deleteAddressAction, setDefaultAddressAction } from "@/app/actions/address";
import { ProfileForm } from "@/components/account/profile-form";
import { OrderStatusBadge } from "@/components/account/order-status";
import { Mascot, SpeechBubble } from "@/components/mascot";
import { ButtonLink } from "@/components/button-link";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

const card = "rounded-[2rem] bg-white p-6 ring-1 ring-ink/10 sm:p-8";

export default async function AccountPage() {
  const user = await requireUser("/account");
  const [addresses, orders] = await Promise.all([
    prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { placedAt: "desc" },
      take: 20,
      include: { _count: { select: { items: true } }, items: { take: 3, select: { productNameEn: true, quantity: true } } },
    }),
  ]);
  const firstName = user.name?.split(" ")[0];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-end gap-4">
          <Mascot size={96} animate="float" decorative className="hidden sm:block" />
          <div>
            <p className="font-display text-lg font-bold text-saffron-deep">
              Vanakkam{firstName ? `, ${firstName}` : ""}! <span lang="ta" className="font-tamil">வணக்கம்</span>
            </p>
            <h1 className="font-display text-5xl font-extrabold">My account</h1>
          </div>
        </div>
        <form action={logoutAction}>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink px-5 font-bold transition hover:bg-ink hover:text-white">
            <LogOut className="h-4 w-4" aria-hidden /> Log out
          </button>
        </form>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.35fr]">
        <div className="space-y-8">
          <section aria-labelledby="profile-h" className={card}>
            <h2 id="profile-h" className="flex items-center gap-2 font-display text-2xl font-extrabold">
              <UserRound className="h-6 w-6 text-saffron" aria-hidden /> Profile
            </h2>
            <p className="mt-2 text-ink-soft">
              Mobile: <b className="text-ink">{user.phone ? formatIndianMobile(user.phone) : "Not set"}</b>
              {user.phoneVerifiedAt && <span className="ml-2 rounded-full bg-leaf/15 px-2 py-0.5 text-xs font-bold text-leaf-deep">verified</span>}
            </p>
            <div className="mt-5">
              <ProfileForm name={user.name} email={user.email} />
            </div>
          </section>

          <section id="addresses" aria-labelledby="addr-h" className={card}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="addr-h" className="flex items-center gap-2 font-display text-2xl font-extrabold">
                <MapPin className="h-6 w-6 text-saffron" aria-hidden /> Addresses
              </h2>
              <Link
                href="/account/addresses/new"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-saffron/10 px-4 font-bold text-saffron-deep transition hover:bg-saffron hover:text-white"
              >
                <Plus className="h-4 w-4" aria-hidden /> Add
              </Link>
            </div>
            {addresses.length === 0 ? (
              <p className="mt-4 text-ink-soft">No saved addresses yet. Add one to check out in a tap.</p>
            ) : (
              <ul className="mt-5 space-y-3">
                {addresses.map((a) => (
                  <li key={a.id} className="rounded-2xl border-2 border-ink/10 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{a.fullName}</p>
                      {a.label && <span className="rounded-full bg-cream-deep px-2 py-0.5 text-xs font-bold">{a.label}</span>}
                      {a.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-turmeric px-2 py-0.5 text-xs font-bold">
                          <Star className="h-3 w-3" aria-hidden /> Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">
                      {[a.line1, a.line2, a.landmark, a.city, a.district, a.state].filter(Boolean).join(", ")} – {a.pincode}
                      <br />
                      📞 {a.phone}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <Link href={`/account/addresses/${a.id}`} className="inline-flex min-h-9 items-center gap-1 rounded-full border-2 border-ink/15 px-3 font-semibold hover:border-ink">
                        <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                      </Link>
                      {!a.isDefault && (
                        <form action={setDefaultAddressAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <button className="inline-flex min-h-9 items-center gap-1 rounded-full border-2 border-ink/15 px-3 font-semibold hover:border-ink">
                            <Star className="h-3.5 w-3.5" aria-hidden /> Make default
                          </button>
                        </form>
                      )}
                      <form action={deleteAddressAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="inline-flex min-h-9 items-center gap-1 rounded-full border-2 border-ink/15 px-3 font-semibold text-chekka hover:border-chekka">
                          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete<span className="sr-only"> address for {a.fullName}</span>
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section aria-labelledby="orders-h" className={card}>
          <h2 id="orders-h" className="flex items-center gap-2 font-display text-2xl font-extrabold">
            <Package className="h-6 w-6 text-saffron" aria-hidden /> My orders
          </h2>
          {orders.length === 0 ? (
            <div className="mt-6 flex flex-col items-center text-center">
              <SpeechBubble tail="bottom">No orders yet. Shall we fix breakfast?</SpeechBubble>
              <Mascot size={120} animate="wobble" decorative className="mt-3" />
              <ButtonLink href="/shop" className="mt-5">Shop the mixes</ButtonLink>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.orderNumber}`}
                    className="block rounded-2xl border-2 border-ink/10 p-4 transition hover:border-saffron hover:bg-cream"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display text-lg font-bold">{o.orderNumber}</p>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">
                      {o.placedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })} ·{" "}
                      {o.items.map((i) => `${i.productNameEn} ×${i.quantity}`).join(", ")}
                      {o._count.items > 3 ? ` +${o._count.items - 3} more` : ""}
                    </p>
                    <p className="mt-1 font-bold">{formatPaise(o.totalInPaise)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
