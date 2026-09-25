"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { saveAddressAction, type AddressFormState } from "@/app/actions/address";
import { AddressFields, type AddressDefaults } from "./address-fields";

export function AddressForm({
  id,
  defaults,
  isDefault,
}: {
  id?: string;
  defaults?: AddressDefaults;
  isDefault?: boolean;
}) {
  const [state, action, pending] = useActionState<AddressFormState, FormData>(saveAddressAction, {});
  const values = (state.values ?? defaults ?? {}) as AddressDefaults;
  return (
    <form action={action} className="space-y-6" noValidate>
      {id && <input type="hidden" name="id" value={id} />}
      {/* key forces inputs to pick up returned values after a failed submit */}
      <AddressFields key={JSON.stringify(state.values ?? {})} defaults={values} errors={state.errors} />
      <label className="flex items-center gap-3 font-semibold">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={state.values ? state.values.isDefault === "on" : isDefault}
          className="h-5 w-5 accent-saffron"
        />
        Make this my default address
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-saffron px-7 font-display text-lg font-bold text-white shadow-[0_6px_0_0_var(--color-saffron-deep)] transition hover:bg-saffron-deep active:translate-y-1 active:shadow-none disabled:opacity-70"
        >
          {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />} Save address
        </button>
        <Link href="/account#addresses" className="inline-flex min-h-12 items-center rounded-full border-2 border-ink px-6 font-display text-lg font-bold">
          Cancel
        </Link>
      </div>
    </form>
  );
}
