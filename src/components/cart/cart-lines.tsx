"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { Trash2 } from "lucide-react";
import { formatPaise } from "@/lib/money";
import type { CartLine } from "@/lib/cart";
import { useCart } from "./cart-provider";
import { QuantityStepper } from "./quantity-stepper";

function issueText(line: CartLine) {
  if (line.issue === "unavailable") return "No longer available. Please remove it.";
  if (line.issue === "out_of_stock") return "Sold out. Please remove it.";
  if (line.issue === "exceeds_stock") return `Only ${line.stock} left. Reduce the quantity to continue.`;
  if (line.stock <= 10) return `Only ${line.stock} left in stock`;
  return null;
}

export function CartLines({ lines, compact, onNavigate }: { lines: CartLine[]; compact?: boolean; onNavigate?: () => void }) {
  const { setQuantity, remove, pendingVariant } = useCart();
  return (
    <ul className="divide-y divide-ink/10">
      {lines.map((line) => {
        const note = issueText(line);
        const busy = pendingVariant === line.variantId;
        return (
          <li key={line.variantId} className={clsx("flex gap-4 py-4", busy && "opacity-60")}>
            <Link
              href={`/products/${line.productSlug}`}
              onClick={onNavigate}
              className={clsx("relative shrink-0 overflow-hidden rounded-2xl", compact ? "h-24 w-20" : "h-32 w-24")}
              style={{ backgroundColor: line.color }}
            >
              {line.imageUrl && (
                <Image src={line.imageUrl} alt="" fill sizes="96px" className="object-cover object-top" />
              )}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/products/${line.productSlug}`}
                    onClick={onNavigate}
                    className="font-display text-lg font-bold leading-tight hover:underline"
                  >
                    {line.productName}
                  </Link>
                  <p className="text-sm text-ink-soft">
                    {line.flavourEn} · {line.sizeGrams} g
                  </p>
                </div>
                <p className="shrink-0 text-right font-display text-lg font-bold">
                  {formatPaise(line.unitPriceInPaise * line.quantity)}
                  {line.quantity > 1 && (
                    <span className="block font-sans text-xs font-normal text-ink-soft">
                      {formatPaise(line.unitPriceInPaise)} each
                    </span>
                  )}
                </p>
              </div>
              {note && (
                <p className={clsx("mt-1 text-sm font-semibold", line.issue ? "text-chekka" : "text-saffron-deep")}>{note}</p>
              )}
              <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                {line.issue === "unavailable" || line.issue === "out_of_stock" ? (
                  <span />
                ) : (
                  <QuantityStepper
                    size="sm"
                    value={line.quantity}
                    max={line.maxQuantity}
                    disabled={busy}
                    label={`Quantity of ${line.productName} ${line.flavourEn}`}
                    onChange={(q) => setQuantity(line.variantId, q)}
                  />
                )}
                <button
                  type="button"
                  onClick={() => remove(line.variantId)}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-soft transition hover:bg-chekka/10 hover:text-chekka"
                >
                  <Trash2 className="h-4 w-4" aria-hidden /> Remove
                  <span className="sr-only">
                    {line.productName} {line.flavourEn}
                  </span>
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function FreeDeliveryMeter({ subtotal }: { subtotal: number }) {
  const { delivery } = useCart();
  if (!delivery.freeAboveInPaise || subtotal <= 0) return null;
  const gap = delivery.freeAboveInPaise - subtotal;
  const pct = Math.min(100, Math.round((subtotal / delivery.freeAboveInPaise) * 100));
  return (
    <div className="rounded-2xl bg-leaf/10 p-3">
      <p className="text-sm font-semibold text-leaf-deep">
        {gap > 0 ? (
          <>Add {formatPaise(gap)} more for <b>free delivery</b> 🚚</>
        ) : (
          <>Yay! Your order ships free 🎉</>
        )}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" aria-hidden>
        <div className="h-full rounded-full bg-leaf transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
