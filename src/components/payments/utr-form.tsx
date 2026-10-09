"use client";

import { useActionState } from "react";
import { Loader2, Send } from "lucide-react";
import { submitUtrAction, type UtrState } from "@/app/actions/payments";

export function UtrForm({ orderNumber, token }: { orderNumber: string; token: string | null }) {
  const [state, action, pending] = useActionState<UtrState, FormData>(submitUtrAction, {});
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="orderNumber" value={orderNumber} />
      {token && <input type="hidden" name="t" value={token} />}
      <label htmlFor="utr" className="block font-display text-lg font-bold">
        Paid? Enter the 12-digit UTR
      </label>
      <p id="utr-help" className="text-sm text-ink-soft">
        Find it in your UPI app under the payment&apos;s details. It may be called UTR, UPI Ref No. or UPI transaction ID.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="utr"
          name="utr"
          inputMode="numeric"
          autoComplete="off"
          maxLength={16}
          required
          placeholder="e.g. 4123 5678 9012"
          aria-describedby="utr-help utr-error"
          aria-invalid={!!state.error || undefined}
          className="w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 font-display text-xl font-bold tracking-widest outline-none focus:border-saffron"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-saffron px-6 font-display text-lg font-bold text-white shadow-[0_5px_0_0_var(--color-saffron-deep)] transition hover:bg-saffron-deep active:translate-y-1 active:shadow-none disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
          Submit
        </button>
      </div>
      {state.error && (
        <p id="utr-error" role="alert" className="font-semibold text-chekka">
          {state.error}
        </p>
      )}
    </form>
  );
}
