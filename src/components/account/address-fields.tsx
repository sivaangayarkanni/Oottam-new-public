import clsx from "clsx";
import { INDIAN_STATES } from "@/lib/validation";

export type AddressDefaults = Partial<Record<
  "label" | "fullName" | "phone" | "line1" | "line2" | "landmark" | "city" | "district" | "state" | "pincode",
  string | null
>>;

export const fieldClass =
  "mt-1.5 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-2.5 font-semibold outline-none transition focus:border-saffron focus-visible:outline-none aria-[invalid=true]:border-chekka";

export function Field({
  name,
  label,
  error,
  className,
  optional,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { name: string; label: string; error?: string; optional?: boolean }) {
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-bold">
        {label} {optional && <span className="font-normal text-ink-soft">(optional)</span>}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className={fieldClass}
        {...rest}
      />
      {error && (
        <p id={`${id}-err`} className="mt-1 text-sm font-semibold text-chekka">
          {error}
        </p>
      )}
    </div>
  );
}

/** Address inputs (no <form>), shared by the address book and checkout. */
export function AddressFields({
  defaults = {},
  errors = {},
  showLabel = true,
}: {
  defaults?: AddressDefaults;
  errors?: Record<string, string>;
  showLabel?: boolean;
}) {
  const d = (k: keyof AddressDefaults) => defaults[k] ?? undefined;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field name="fullName" label="Full name" autoComplete="name" required defaultValue={d("fullName")} error={errors.fullName} />
      <Field
        name="phone"
        label="Mobile (10 digits)"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={14}
        required
        defaultValue={d("phone")}
        error={errors.phone}
      />
      <Field
        name="line1"
        label="House no., building, street"
        autoComplete="address-line1"
        required
        className="sm:col-span-2"
        defaultValue={d("line1")}
        error={errors.line1}
      />
      <Field name="line2" label="Area / locality" optional autoComplete="address-line2" defaultValue={d("line2")} error={errors.line2} />
      <Field name="landmark" label="Landmark" optional defaultValue={d("landmark")} error={errors.landmark} />
      <Field name="city" label="City / town" autoComplete="address-level2" required defaultValue={d("city")} error={errors.city} />
      <Field name="district" label="District" optional defaultValue={d("district")} error={errors.district} />
      <div>
        <label htmlFor="f-state" className="text-sm font-bold">State / UT</label>
        <select
          id="f-state"
          name="state"
          required
          defaultValue={d("state") ?? "Tamil Nadu"}
          autoComplete="address-level1"
          aria-invalid={!!errors.state}
          className={clsx(fieldClass, "appearance-none")}
        >
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {errors.state && <p className="mt-1 text-sm font-semibold text-chekka">{errors.state}</p>}
      </div>
      <Field
        name="pincode"
        label="PIN code"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        required
        defaultValue={d("pincode")}
        error={errors.pincode}
      />
      {showLabel && (
        <Field name="label" label="Label" optional placeholder="Home, Work…" maxLength={30} defaultValue={d("label")} error={errors.label} />
      )}
    </div>
  );
}
