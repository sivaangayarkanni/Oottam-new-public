"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, MessageSquareText, Pencil } from "lucide-react";
import { requestOtpAction, verifyOtpAction, type OtpRequestState } from "@/app/actions/auth";
import { formatIndianMobile } from "@/lib/phone";

const input =
  "w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 text-lg font-semibold outline-none transition focus:border-saffron focus-visible:outline-none";
const primary =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-saffron px-6 py-3 font-display text-lg font-bold text-white shadow-[0_6px_0_0_var(--color-saffron-deep)] transition hover:bg-saffron-deep active:translate-y-1 active:shadow-none disabled:cursor-wait disabled:opacity-70";

function useCountdown(seconds: number, key: number) {
  const [left, setLeft] = useState(seconds);
  const [prevKey, setPrevKey] = useState(key);
  if (prevKey !== key) {
    setPrevKey(key);
    setLeft(seconds);
  }
  useEffect(() => {
    if (!key) return;
    const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [key]);
  return left;
}

export function LoginForm({ next }: { next: string }) {
  const [reqState, requestAction, requesting] = useActionState<OtpRequestState, FormData>(requestOtpAction, { status: "idle" });
  const [verifyState, verifyAction, verifying] = useActionState(verifyOtpAction, {});
  const [editing, setEditing] = useState(false);
  const [lastPhone, setLastPhone] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);

  const sent = reqState.status === "sent" && !editing ? reqState : null;
  const resendIn = useCountdown(sent?.resendAfterSeconds ?? 0, sent?.sentAt ?? 0);

  useEffect(() => {
    if (sent) codeRef.current?.focus();
  }, [sent]);

  if (!sent) {
    return (
      <form
        action={(fd) => {
          setEditing(false);
          setLastPhone(String(fd.get("phone") ?? ""));
          requestAction(fd);
        }}
        className="space-y-5"
        noValidate
      >
        <div>
          <label htmlFor="phone" className="font-display text-lg font-bold">
            Mobile number
          </label>
          <div className="mt-2 flex items-stretch gap-2">
            <span className="grid place-items-center rounded-2xl bg-cream-deep px-4 text-lg font-bold" aria-hidden>
              +91
            </span>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              defaultValue={lastPhone || (reqState.status === "error" ? reqState.phoneInput : "")}
              maxLength={14}
              required
              aria-invalid={reqState.status === "error" || undefined}
              aria-describedby="phone-help phone-error"
              className={input}
            />
          </div>
          <p id="phone-help" className="mt-2 text-sm text-ink-soft">
            We&apos;ll text you a 6-digit code. Indian mobile numbers only.
          </p>
          {reqState.status === "error" && (
            <p id="phone-error" role="alert" className="mt-2 font-semibold text-chekka">
              {reqState.message}
            </p>
          )}
        </div>
        <button type="submit" disabled={requesting} className={primary}>
          {requesting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <MessageSquareText className="h-5 w-5" aria-hidden />}
          {requesting ? "Sending code…" : "Send code"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <p className="rounded-2xl bg-leaf/10 px-4 py-3 font-semibold text-leaf-deep" role="status">
        Code sent to {formatIndianMobile(sent.phone)}.
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-2 inline-flex items-center gap-1 text-ink underline decoration-2 underline-offset-2"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden /> Change
        </button>
      </p>
      {sent.devHint && (
        <p className="rounded-2xl border-2 border-dashed border-saffron/50 px-4 py-2 text-sm text-ink-soft">
          Dev mode: SMS isn&apos;t connected yet, so the code is printed in the server console.
        </p>
      )}
      <form action={verifyAction} className="space-y-5" noValidate>
        <input type="hidden" name="phone" value={sent.phone} />
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="code" className="font-display text-lg font-bold">
            6-digit code
          </label>
          <input
            ref={codeRef}
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            placeholder="••••••"
            aria-invalid={!!verifyState.message || undefined}
            aria-describedby="code-error"
            className={`${input} mt-2 text-center font-display text-3xl tracking-[0.5em]`}
          />
          {verifyState.message && (
            <p id="code-error" role="alert" className="mt-2 font-semibold text-chekka">
              {verifyState.message}
            </p>
          )}
        </div>
        <button type="submit" disabled={verifying} className={primary}>
          {verifying ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ArrowRight className="h-5 w-5" aria-hidden />}
          {verifying ? "Checking…" : "Verify & continue"}
        </button>
      </form>
      <form action={requestAction} className="text-center">
        <input type="hidden" name="phone" value={sent.phone} />
        <button
          type="submit"
          disabled={resendIn > 0 || requesting}
          className="min-h-11 rounded-full px-4 font-semibold text-saffron-deep underline decoration-2 underline-offset-4 disabled:cursor-not-allowed disabled:text-ink-soft disabled:no-underline"
        >
          {resendIn > 0 ? `Resend code in ${resendIn}s` : requesting ? "Sending…" : "Resend code"}
        </button>
      </form>
    </div>
  );
}
