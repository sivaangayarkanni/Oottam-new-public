"use client";

import { useActionState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { adminLoginAction, type AdminLoginState } from "@/app/actions/admin";

export function AdminLoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AdminLoginState, FormData>(adminLoginAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="admin-password" className="block font-bold">
          Admin password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          className="mt-2 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 text-lg outline-none focus:border-saffron"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-chekka">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-saffron px-6 font-display text-lg font-bold text-white shadow-[0_4px_0_0_var(--color-saffron-deep)] transition hover:brightness-105 active:translate-y-1 active:shadow-none disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <KeyRound className="h-5 w-5" aria-hidden />}
        Sign in to admin
      </button>
    </form>
  );
}
