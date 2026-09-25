"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { updateProfileAction, type ProfileState } from "@/app/actions/auth";
import { Field } from "./address-fields";

export function ProfileForm({
  name,
  email,
  next,
  submitLabel = "Save profile",
}: {
  name: string | null;
  email: string | null;
  next?: string;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <Field name="name" label="Your name" autoComplete="name" required defaultValue={name ?? ""} error={state.errors?.name} />
      <Field name="email" label="Email" type="email" optional autoComplete="email" defaultValue={email ?? ""} error={state.errors?.email} />
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-saffron px-7 font-display text-lg font-bold text-white shadow-[0_6px_0_0_var(--color-saffron-deep)] transition hover:bg-saffron-deep active:translate-y-1 active:shadow-none disabled:opacity-70"
        >
          {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />} {submitLabel}
        </button>
        {state.saved && <p role="status" className="font-semibold text-leaf">Saved ✓</p>}
      </div>
    </form>
  );
}
