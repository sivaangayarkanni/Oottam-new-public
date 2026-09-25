"use client";

import clsx from "clsx";
import { Minus, Plus } from "lucide-react";

export function QuantityStepper({
  value,
  max,
  onChange,
  disabled,
  label,
  size = "md",
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  label: string;
  size?: "sm" | "md";
}) {
  const btn = clsx(
    "grid place-items-center rounded-full transition hover:bg-saffron/15 disabled:cursor-not-allowed disabled:opacity-40",
    size === "sm" ? "h-9 w-9" : "h-11 w-11",
  );
  return (
    <div role="group" aria-label={label} className="inline-flex items-center rounded-full border-2 border-ink/15 bg-white">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= 1} aria-label="Decrease quantity">
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <output aria-live="polite" className={clsx("min-w-8 text-center font-display font-bold", size === "sm" ? "text-base" : "text-lg")}>
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Increase quantity">
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
