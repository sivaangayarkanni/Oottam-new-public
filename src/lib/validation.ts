import { z } from "zod";
import { normalizeIndianMobile } from "./phone";

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // Union Territories
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
] as const;

const text = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

export const indianMobile = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const e164 = normalizeIndianMobile(v);
    if (!e164) {
      ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit Indian mobile number" });
      return z.NEVER;
    }
    return e164;
  });

export const addressSchema = z.object({
  label: optionalText(30),
  fullName: text("Full name", 80).regex(/^[\p{L}\p{M} .'-]+$/u, "Use letters only for the name"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number (starts with 6-9)"),
  line1: text("House / street", 120),
  line2: optionalText(120),
  landmark: optionalText(80),
  city: text("City / town", 60),
  district: optionalText(60),
  state: z.enum(INDIAN_STATES, { error: "Choose a state or union territory" }),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a 6-digit PIN code"),
  isDefault: z.boolean().optional().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const phoneSchema = z.object({ phone: indianMobile });
export const otpSchema = z.object({ phone: indianMobile, code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") });

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(120)
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(z.email("Enter a valid email").optional()),
});

export const cartMutationSchema = z.object({
  variantId: z.string().min(1).max(40),
  quantity: z.number().int().min(0).max(99),
});

export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,30}$/, "Coupon codes are 3-30 letters or numbers");

export const checkoutSchema = z
  .object({
    idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/, "Missing checkout key, please refresh"),
    addressId: z.string().min(1).max(40).optional(),
    address: addressSchema.optional(),
    saveAddress: z.boolean().optional().default(false),
    contactPhone: indianMobile.optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(120)
      .optional()
      .transform((v) => (v ? v : undefined))
      .pipe(z.email("Enter a valid email").optional()),
    couponCode: couponCodeSchema.optional().or(z.literal("").transform(() => undefined)),
    paymentMethod: z.enum(["ONLINE", "COD"]).default("ONLINE"),
    notes: optionalText(300),
  })
  .refine((v) => v.addressId || v.address, { message: "Choose or enter a delivery address", path: ["address"] });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Flatten zod errors to { field: firstMessage } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}

/** Only allow same-site relative redirects after login. */
export function safeNextPath(next: unknown, fallback = "/account"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
