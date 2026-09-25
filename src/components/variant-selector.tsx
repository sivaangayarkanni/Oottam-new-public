"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Check, Loader2, ShoppingBag } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { WhatsAppIcon } from "@/components/icons";
import { useCart } from "@/components/cart/cart-provider";
import { QuantityStepper } from "@/components/cart/quantity-stepper";

export type SelectorVariant = {
  id: string;
  sku: string;
  flavourEn: string;
  flavourTa: string | null;
  sizeGrams: number;
  priceInPaise: number;
  mrpInPaise: number;
  stock: number;
  lowStockThreshold: number;
};

type Props = {
  productName: string;
  color: string;
  variants: SelectorVariant[];
  whatsappUrl: string;
};

function stockLabel(v: SelectorVariant) {
  if (v.stock <= 0) return { text: "Out of stock", tone: "text-chekka" };
  if (v.stock <= v.lowStockThreshold) return { text: `Only ${v.stock} left`, tone: "text-saffron-deep" };
  return { text: "In stock", tone: "text-leaf" };
}

/** Flavour + size picker with live price / MRP / discount / stock, quantity and add-to-cart. */
export function VariantSelector({ productName, color, variants, whatsappUrl }: Props) {
  const flavours = useMemo(() => [...new Map(variants.map((v) => [v.flavourEn, v])).values()], [variants]);
  const [flavour, setFlavour] = useState(flavours[0]?.flavourEn);
  const sizes = variants.filter((v) => v.flavourEn === flavour);
  const [sizeGrams, setSizeGrams] = useState<number | undefined>(sizes[0]?.sizeGrams);
  const selected = sizes.find((v) => v.sizeGrams === sizeGrams) ?? sizes[0];
  const [qty, setQty] = useState(1);
  const { add, cart, pendingVariant } = useCart();

  if (!selected) return <p className="text-ink-soft">This product is currently unavailable.</p>;

  const discount = selected.mrpInPaise > selected.priceInPaise
    ? Math.round((1 - selected.priceInPaise / selected.mrpInPaise) * 100)
    : 0;
  const stock = stockLabel(selected);
  const waText = `Hi Oottam! I'd like to order ${productName} (${selected.flavourEn}, ${selected.sizeGrams}g). SKU ${selected.sku}`;

  return (
    <div className="space-y-6">
      {flavours.length > 1 && (
        <fieldset>
          <legend className="font-display text-lg font-bold">
            Flavour: <span className="font-sans font-semibold text-ink-soft">{flavour}</span>
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {flavours.map((f) => {
              const active = f.flavourEn === flavour;
              return (
                <label
                  key={f.flavourEn}
                  className={clsx(
                    "cursor-pointer rounded-2xl border-2 px-4 py-2 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-saffron",
                    active ? "border-transparent text-white" : "border-ink/15 bg-white hover:border-ink/40",
                  )}
                  style={active ? { backgroundColor: color } : undefined}
                >
                  <input
                    type="radio"
                    name="flavour"
                    value={f.flavourEn}
                    checked={active}
                    onChange={() => {
                      setFlavour(f.flavourEn);
                      const first = variants.find((v) => v.flavourEn === f.flavourEn);
                      setSizeGrams(first?.sizeGrams);
                    }}
                    className="sr-only"
                  />
                  <span className="block font-bold leading-tight">{f.flavourEn}</span>
                  {f.flavourTa && (
                    <span lang="ta" className={clsx("block font-tamil text-xs", active ? "text-white/85" : "text-ink-soft")}>
                      {f.flavourTa}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="font-display text-lg font-bold">Pack size</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {sizes.map((v) => {
            const active = v.sizeGrams === selected.sizeGrams;
            return (
              <label
                key={v.id}
                className={clsx(
                  "inline-flex cursor-pointer items-center gap-2 rounded-2xl border-2 px-4 py-2 font-bold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-saffron",
                  active ? "border-ink bg-ink text-white" : "border-ink/15 bg-white hover:border-ink/40",
                )}
              >
                <input
                  type="radio"
                  name="size"
                  value={v.sizeGrams}
                  checked={active}
                  onChange={() => setSizeGrams(v.sizeGrams)}
                  className="sr-only"
                />
                {active && <Check className="h-4 w-4" aria-hidden />}
                {v.sizeGrams >= 1000 ? `${v.sizeGrams / 1000} kg` : `${v.sizeGrams} g`}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="rounded-[1.75rem] bg-white p-5 ring-1 ring-ink/10" aria-live="polite">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-display text-4xl font-extrabold">{formatPaise(selected.priceInPaise)}</span>
          {discount > 0 && (
            <>
              <span className="text-ink-soft">
                MRP <s>{formatPaise(selected.mrpInPaise)}</s>
              </span>
              <span className="rounded-full bg-turmeric px-2.5 py-0.5 text-sm font-extrabold">{discount}% off</span>
            </>
          )}
        </div>
        <p className="mt-1 text-xs text-ink-soft">Inclusive of all taxes · SKU {selected.sku}</p>
        <p className={clsx("mt-3 flex items-center gap-2 font-bold", stock.tone)}>
          <span className="h-2.5 w-2.5 rounded-full bg-current" aria-hidden /> {stock.text}
        </p>
      </div>

      {(() => {
        const inCart = cart.lines.find((l) => l.variantId === selected.id)?.quantity ?? 0;
        const maxAdd = Math.max(Math.min(selected.stock, 10) - inCart, 0);
        const busy = pendingVariant === selected.id;
        const soldOut = selected.stock <= 0;
        const q = Math.min(Math.max(qty, 1), Math.max(maxAdd, 1));
        return (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {!soldOut && maxAdd > 0 && (
                <QuantityStepper value={q} max={maxAdd} onChange={setQty} label="Quantity" />
              )}
              <button
                type="button"
                disabled={soldOut || maxAdd === 0 || busy}
                onClick={() => {
                  add(selected.id, q);
                  setQty(1);
                }}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-saffron px-6 py-3 font-display text-lg font-bold text-white shadow-[0_6px_0_0_var(--color-saffron-deep)] transition hover:bg-saffron-deep active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink/60 disabled:shadow-none"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ShoppingBag className="h-5 w-5" aria-hidden />}
                {soldOut ? "Sold out" : maxAdd === 0 ? "Max in cart" : busy ? "Adding…" : "Add to cart"}
              </button>
            </div>
            {inCart > 0 && (
              <p className="text-sm font-semibold text-leaf">
                {inCart} already in your cart{maxAdd === 0 ? ` (limit ${Math.min(selected.stock, 10)} per pack)` : ""}.
              </p>
            )}
            <a
              href={`${whatsappUrl}?text=${encodeURIComponent(waText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-[#1f8f4e] px-6 py-3 font-display text-lg font-bold text-[#146236] transition hover:bg-[#1f8f4e] hover:text-white"
            >
              <WhatsAppIcon /> Prefer WhatsApp? Order there
            </a>
          </>
        );
      })()}
    </div>
  );
}
