"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard blocked: the value is visible for manual copy */
        }
      }}
      className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border-2 border-ink/15 bg-white px-3 text-sm font-bold transition hover:border-ink"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
    >
      {copied ? <Check className="h-4 w-4 text-leaf" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
