"use client";

import { useActionState, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import clsx from "clsx";
import { confirmPaymentAction, rejectPaymentAction, type VerifyState } from "@/app/actions/payments";

/** Confirm / reject controls for one UPI payment awaiting verification. */
export function VerifyControls({ paymentId, amount, utr }: { paymentId: string; amount: string; utr: string }) {
  const [confirmState, confirm, confirming] = useActionState<VerifyState, FormData>(confirmPaymentAction, {});
  const [rejectState, reject, rejecting] = useActionState<VerifyState, FormData>(rejectPaymentAction, {});
  const [mode, setMode] = useState<"idle" | "reject">("idle");
  const done = confirmState.done ?? rejectState.done;
  if (done) return <p role="status" className="rounded-2xl bg-leaf/10 px-4 py-3 font-bold text-leaf-deep">{done}</p>;

  return (
    <div className="space-y-3">
      {mode === "idle" ? (
        <form action={confirm} className="space-y-3">
          <input type="hidden" name="paymentId" value={paymentId} />
          <label className="flex items-start gap-3 text-sm font-semibold">
            <input type="checkbox" name="checked" className="mt-0.5 h-5 w-5 shrink-0 accent-leaf" />
            I found <b>₹{amount}</b> with UTR <span className="font-mono">{utr}</span> in the bank account.
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={confirming}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-leaf px-5 font-display text-lg font-bold text-white shadow-[0_4px_0_0_var(--color-leaf-deep)] transition hover:bg-leaf-deep active:translate-y-1 active:shadow-none disabled:opacity-60"
            >
              {confirming ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Check className="h-5 w-5" aria-hidden />}
              Confirm payment
            </button>
            <button
              type="button"
              onClick={() => setMode("reject")}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-chekka px-5 font-display text-lg font-bold text-chekka transition hover:bg-chekka hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden /> Reject
            </button>
          </div>
          {confirmState.error && <p role="alert" className="text-sm font-semibold text-chekka">{confirmState.error}</p>}
        </form>
      ) : (
        <form action={reject} className="space-y-3 rounded-2xl bg-chekka/5 p-4">
          <input type="hidden" name="paymentId" value={paymentId} />
          <label className="block text-sm font-bold" htmlFor={`reason-${paymentId}`}>
            Reason (shown to the customer)
          </label>
          <input
            id={`reason-${paymentId}`}
            name="reason"
            required
            minLength={3}
            maxLength={300}
            placeholder="e.g. No payment with this UTR in the bank account"
            className="w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-2.5 outline-none focus:border-chekka"
          />
          <fieldset className="space-y-1 text-sm">
            <legend className="font-bold">Then</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="then" value="retry" defaultChecked className="accent-saffron" /> Ask the customer to pay / re-enter the UTR (order stays open)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="then" value="cancel" className="accent-chekka" /> Cancel the order and release the stock
            </label>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={rejecting}
              className={clsx("inline-flex min-h-11 items-center gap-2 rounded-full bg-chekka px-5 font-bold text-white disabled:opacity-60")}
            >
              {rejecting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Reject payment
            </button>
            <button type="button" onClick={() => setMode("idle")} className="min-h-11 rounded-full px-4 font-bold text-ink-soft">
              Back
            </button>
          </div>
          {rejectState.error && <p role="alert" className="text-sm font-semibold text-chekka">{rejectState.error}</p>}
        </form>
      )}
    </div>
  );
}
