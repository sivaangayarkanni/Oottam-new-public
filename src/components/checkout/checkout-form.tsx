"use client";

import { startTransition, useActionState, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { BadgePercent, Banknote, CreditCard, Loader2, Lock, MapPin, Phone, Plus, Tag, X } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { formatIndianMobile } from "@/lib/phone";
import { placeOrderAction, quoteAction, type PlaceOrderState, type QuoteResult } from "@/app/actions/checkout";
import { AddressFields, Field } from "@/components/account/address-fields";

type SavedAddress = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

type Props = {
  initialQuote: QuoteResult;
  user: { name: string | null; phone: string | null; email: string | null } | null;
  addresses: SavedAddress[];
  codEnabled: boolean;
  idempotencyKey: string;
};

const section = "rounded-[2rem] bg-white p-6 ring-1 ring-ink/10 sm:p-8";
const h2 = "flex items-center gap-3 font-display text-2xl font-extrabold";
const step = "grid h-9 w-9 place-items-center rounded-full bg-saffron font-display text-lg text-white";

export function CheckoutForm({ initialQuote, user, addresses, codEnabled, idempotencyKey }: Props) {
  const [state, formAction, placing] = useActionState<PlaceOrderState, FormData>(placeOrderAction, {});
  const [quoteSrc, setQuoteSrc] = useState({ prop: initialQuote, st: state, quote: initialQuote });
  let quote = quoteSrc.quote;
  if (quoteSrc.prop !== initialQuote || quoteSrc.st !== state) {
    // New server render (cart changed) → its quote; new action result → its quote if it sent one.
    const next = quoteSrc.prop !== initialQuote ? initialQuote : (state.quote ?? quoteSrc.quote);
    setQuoteSrc({ prop: initialQuote, st: state, quote: next });
    quote = next;
  }
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applying, startApply] = useTransition();
  const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [mode, setMode] = useState<"saved" | "new">(defaultAddr ? "saved" : "new");
  const [addressId, setAddressId] = useState(defaultAddr?.id ?? "");
  const [payment, setPayment] = useState<"ONLINE" | "COD">("ONLINE");
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.errors ?? {};
  const t = quote.totals;

  function applyCoupon(code: string | null) {
    startApply(async () => {
      const phone = formRef.current ? String(new FormData(formRef.current).get("contactPhone") ?? "") : "";
      const res = await quoteAction(code, phone || null);
      setQuoteSrc((s) => ({ ...s, quote: res }));
      if (code && res.couponError) {
        setCouponError(res.couponError);
        setAppliedCoupon(null);
      } else {
        setCouponError(null);
        setAppliedCoupon(code ? code.toUpperCase() : null);
      }
    });
  }

  return (
    <form
      ref={formRef}
      noValidate
      className="grid gap-8 lg:grid-cols-[1fr_24rem]"
      onSubmit={(e) => {
        // Submit manually so React doesn't reset the typed address when validation fails.
        e.preventDefault();
        if (placing) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="expectedTotal" value={t.totalInPaise} />
      <input type="hidden" name="couponCode" value={appliedCoupon ?? ""} />
      <input type="hidden" name="addressMode" value={mode} />

      <div className="space-y-6">
        {/* 1. Contact */}
        <section aria-labelledby="contact-h" className={section}>
          <h2 id="contact-h" className={h2}>
            <span className={step} aria-hidden>1</span> Contact
          </h2>
          {user?.phone ? (
            <p className="mt-4 flex items-center gap-2 font-semibold">
              <Phone className="h-4 w-4 text-leaf" aria-hidden /> {formatIndianMobile(user.phone)}
              <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-xs font-bold text-leaf-deep">verified</span>
            </p>
          ) : (
            <>
              <p className="mt-2 text-ink-soft">
                Checking out as a guest.{" "}
                <Link href="/login?next=/checkout" className="font-bold text-saffron-deep underline underline-offset-2">
                  Log in
                </Link>{" "}
                to use saved addresses.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  name="contactPhone"
                  label="Mobile number (for delivery updates)"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  maxLength={14}
                  required
                  error={errors.contactPhone}
                />
                <Field name="email" label="Email" type="email" optional autoComplete="email" error={errors.email} />
              </div>
            </>
          )}
          {user && (
            <div className="mt-4 max-w-sm">
              <Field name="email" label="Email for receipt" type="email" optional defaultValue={user.email ?? ""} error={errors.email} />
            </div>
          )}
        </section>

        {/* 2. Address */}
        <section aria-labelledby="addr-h" className={section}>
          <h2 id="addr-h" className={h2}>
            <span className={step} aria-hidden>2</span> Delivery address
          </h2>
          {addresses.length > 0 && (
            <fieldset className="mt-5">
              <legend className="sr-only">Choose a saved address</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((a) => {
                  const active = mode === "saved" && addressId === a.id;
                  return (
                    <label
                      key={a.id}
                      className={clsx(
                        "cursor-pointer rounded-2xl border-2 p-4 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-saffron",
                        active ? "border-saffron bg-saffron/5" : "border-ink/10 hover:border-ink/30",
                      )}
                    >
                      <input
                        type="radio"
                        name="addressId"
                        value={a.id}
                        checked={active}
                        onChange={() => {
                          setMode("saved");
                          setAddressId(a.id);
                        }}
                        className="sr-only"
                      />
                      <span className="flex items-center gap-2 font-bold">
                        <MapPin className={clsx("h-4 w-4", active ? "text-saffron" : "text-ink-soft")} aria-hidden />
                        {a.fullName} {a.label && <span className="rounded-full bg-cream-deep px-2 text-xs">{a.label}</span>}
                      </span>
                      <span className="mt-1 block text-sm text-ink-soft">
                        {[a.line1, a.line2, a.city, a.state].filter(Boolean).join(", ")} – {a.pincode}
                      </span>
                    </label>
                  );
                })}
                <label
                  className={clsx(
                    "flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 font-bold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-saffron",
                    mode === "new" ? "border-saffron bg-saffron/5 text-saffron-deep" : "border-ink/20 text-ink-soft hover:border-ink/40",
                  )}
                >
                  <input type="radio" name="addressChoice" checked={mode === "new"} onChange={() => setMode("new")} className="sr-only" />
                  <Plus className="h-4 w-4" aria-hidden /> New address
                </label>
              </div>
              {errors.addressId && <p className="mt-2 font-semibold text-chekka">{errors.addressId}</p>}
            </fieldset>
          )}
          {mode === "new" && (
            <div className="mt-5 space-y-4">
              <AddressFields
                errors={errors}
                showLabel={!!user}
                defaults={{ fullName: user?.name ?? "", phone: user?.phone?.replace(/^\+91/, "") ?? "" }}
              />
              {user && (
                <label className="flex items-center gap-3 font-semibold">
                  <input type="checkbox" name="saveAddress" defaultChecked className="h-5 w-5 accent-saffron" /> Save this address to my account
                </label>
              )}
            </div>
          )}
          <div className="mt-5">
            <label htmlFor="f-notes" className="text-sm font-bold">
              Delivery notes <span className="font-normal text-ink-soft">(optional)</span>
            </label>
            <textarea
              id="f-notes"
              name="notes"
              rows={2}
              maxLength={300}
              className="mt-1.5 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-2.5 outline-none focus:border-saffron"
              placeholder="Gate code, best time to deliver…"
            />
          </div>
        </section>

        {/* 3. Payment */}
        <section aria-labelledby="pay-h" className={section}>
          <h2 id="pay-h" className={h2}>
            <span className={step} aria-hidden>3</span> Payment
          </h2>
          <fieldset className="mt-5 space-y-3">
            <legend className="sr-only">Payment method</legend>
            <label
              className={clsx(
                "flex cursor-pointer gap-4 rounded-2xl border-2 p-4 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-saffron",
                payment === "ONLINE" ? "border-saffron bg-saffron/5" : "border-ink/10",
              )}
            >
              <input type="radio" name="paymentMethod" value="ONLINE" checked={payment === "ONLINE"} onChange={() => setPayment("ONLINE")} className="sr-only" />
              <CreditCard className="mt-0.5 h-6 w-6 shrink-0 text-saffron" aria-hidden />
              <span>
                <span className="block font-bold">Pay online · UPI, cards, netbanking</span>
                <span className="mt-1 block text-sm text-ink-soft">
                  Online payment connects in the next step. We&apos;ll save your order as <b>awaiting payment</b> and hold your packs for a short while.
                </span>
              </span>
            </label>
            {codEnabled && (
              <label
                className={clsx(
                  "flex cursor-pointer gap-4 rounded-2xl border-2 p-4 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-saffron",
                  payment === "COD" ? "border-saffron bg-saffron/5" : "border-ink/10",
                )}
              >
                <input type="radio" name="paymentMethod" value="COD" checked={payment === "COD"} onChange={() => setPayment("COD")} className="sr-only" />
                <Banknote className="mt-0.5 h-6 w-6 shrink-0 text-leaf" aria-hidden />
                <span>
                  <span className="block font-bold">Cash on delivery</span>
                  <span className="mt-1 block text-sm text-ink-soft">Pay when your order arrives.</span>
                </span>
              </label>
            )}
          </fieldset>
        </section>
      </div>

      {/* Summary */}
      <aside aria-labelledby="sum-h" className="h-fit space-y-5 rounded-[2rem] border-2 border-ink bg-white p-6 shadow-[6px_6px_0_0_var(--color-ink)] lg:sticky lg:top-24">
        <h2 id="sum-h" className="font-display text-2xl font-extrabold">Order summary</h2>
        <ul className="space-y-3">
          {quote.cart.lines.map((l) => (
            <li key={l.variantId} className="flex items-center gap-3">
              <span className="relative h-14 w-11 shrink-0 overflow-hidden rounded-xl" style={{ backgroundColor: l.color }}>
                {l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="44px" className="object-cover object-top" />}
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] font-bold text-white">
                  {l.quantity}
                </span>
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block truncate font-bold">{l.productName}</span>
                <span className="block text-ink-soft">{l.flavourEn} · {l.sizeGrams} g</span>
                {l.issue && <span className="block font-semibold text-chekka">Needs attention in cart</span>}
              </span>
              <span className="font-bold">{formatPaise(l.unitPriceInPaise * l.quantity)}</span>
            </li>
          ))}
        </ul>

        <div>
          <label htmlFor="coupon" className="flex items-center gap-2 text-sm font-bold">
            <Tag className="h-4 w-4 text-saffron" aria-hidden /> Coupon code
          </label>
          {appliedCoupon ? (
            <p className="mt-1.5 flex items-center justify-between rounded-2xl bg-leaf/10 px-4 py-2.5 font-bold text-leaf-deep">
              <span className="flex items-center gap-2">
                <BadgePercent className="h-4 w-4" aria-hidden /> {appliedCoupon} applied
              </span>
              <button
                type="button"
                onClick={() => {
                  setCouponInput("");
                  applyCoupon(null);
                }}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-white"
                aria-label="Remove coupon"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </p>
          ) : (
            <div className="mt-1.5 flex gap-2">
              <input
                id="coupon"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (couponInput.trim()) applyCoupon(couponInput);
                  }
                }}
                placeholder="WELCOME10"
                maxLength={30}
                aria-invalid={!!(couponError || errors.couponCode)}
                aria-describedby="coupon-err"
                className="w-full min-w-0 rounded-2xl border-2 border-ink/15 px-4 py-2.5 font-bold uppercase outline-none focus:border-saffron"
              />
              <button
                type="button"
                disabled={applying || !couponInput.trim()}
                onClick={() => applyCoupon(couponInput)}
                className="inline-flex min-h-11 items-center rounded-2xl bg-ink px-4 font-bold text-white disabled:opacity-50"
              >
                {applying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Apply"}
              </button>
            </div>
          )}
          {(couponError || errors.couponCode) && (
            <p id="coupon-err" role="alert" className="mt-1.5 text-sm font-semibold text-chekka">
              {couponError ?? errors.couponCode}
            </p>
          )}
        </div>

        <dl className="space-y-2 border-t border-ink/10 pt-4">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="font-bold">{formatPaise(t.subtotalInPaise)}</dd>
          </div>
          {t.discountInPaise > 0 && (
            <div className="flex justify-between text-leaf-deep">
              <dt>Discount {appliedCoupon && `(${appliedCoupon})`}</dt>
              <dd className="font-bold">−{formatPaise(t.discountInPaise)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-soft">Delivery</dt>
            <dd className="font-bold">{t.shippingInPaise === 0 ? "Free" : formatPaise(t.shippingInPaise)}</dd>
          </div>
          {t.freeDeliveryGapInPaise > 0 && (
            <p className="text-xs font-semibold text-leaf-deep">Add {formatPaise(t.freeDeliveryGapInPaise)} more for free delivery.</p>
          )}
          <div className="flex items-baseline justify-between border-t border-ink/10 pt-3">
            <dt className="font-display text-xl font-bold">Total</dt>
            <dd className="font-display text-3xl font-extrabold">{formatPaise(t.totalInPaise)}</dd>
          </div>
          <p className="text-xs text-ink-soft">Inclusive of all taxes.</p>
        </dl>

        {state.message && (
          <p role="alert" className="rounded-2xl bg-chekka/10 px-4 py-3 text-sm font-semibold text-chekka">
            {state.message}
          </p>
        )}
        <button
          type="submit"
          disabled={placing || quote.cart.hasIssues || quote.cart.lines.length === 0}
          className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-saffron px-6 font-display text-xl font-bold text-white shadow-[0_6px_0_0_var(--color-saffron-deep)] transition hover:bg-saffron-deep active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {placing ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />}
          {placing ? "Placing order…" : `Place order · ${formatPaise(t.totalInPaise)}`}
        </button>
        {quote.cart.hasIssues && (
          <p className="text-sm font-semibold text-chekka">
            Some items changed. <Link href="/cart" className="underline">Review your cart</Link>.
          </p>
        )}
      </aside>
    </form>
  );
}
