/**
 * Store settings read from environment variables (server-only values, never NEXT_PUBLIC).
 * Kept free of next/* imports so it can be unit-tested.
 */
function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a non-negative integer (got "${raw}")`);
  return n;
}

export type DeliveryRule = {
  /** Flat delivery fee in paise charged below the threshold. */
  feeInPaise: number;
  /** Orders whose (subtotal − discount) is at or above this get free delivery. 0 = always free. */
  freeAboveInPaise: number;
};

export function getDeliveryRule(): DeliveryRule {
  return {
    feeInPaise: intEnv("DELIVERY_FEE_PAISE", 4900),
    freeAboveInPaise: intEnv("FREE_DELIVERY_THRESHOLD_PAISE", 49900),
  };
}

/** Cash on delivery is OFF unless the owner explicitly turns it on. */
export function isCodEnabled(): boolean {
  return process.env.FEATURE_COD === "true";
}

/** Minutes an unpaid online order keeps its reserved stock before it is released. */
export function pendingOrderTtlMinutes(): number {
  return intEnv("PENDING_ORDER_TTL_MINUTES", 30);
}

/** Max units of one variant per cart line. */
export const MAX_QTY_PER_LINE = 10;

const DEV_ONLY_SECRET = "oottam-dev-only-secret-do-not-use-in-production";

/**
 * Secret used to sign cookies/links. Required in production; a fixed, clearly-labelled
 * fallback is used in development/test so the app runs out of the box.
 */
export function getSecret(name: "AUTH_SECRET" | "OTP_HASH_SECRET"): string {
  const value = process.env[name];
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} must be set to a random string of at least 32 characters in production`);
  }
  return `${DEV_ONLY_SECRET}:${name}`;
}

// ── Payments ─────────────────────────────────────────────

export type OnlinePaymentProvider = "upi" | "razorpay";

/**
 * Which provider handles "Pay online" at checkout. Module 4 ships direct UPI with manual
 * confirmation; Razorpay can be added later as another provider on the same Payment record.
 */
export function onlinePaymentProvider(env: NodeJS.ProcessEnv = process.env): OnlinePaymentProvider {
  const v = (env.ONLINE_PAYMENT_PROVIDER ?? "upi").toLowerCase();
  if (v !== "upi" && v !== "razorpay") throw new Error("ONLINE_PAYMENT_PROVIDER must be upi or razorpay");
  return v;
}

export type UpiConfig = {
  vpa: string;
  altVpa: string | null;
  payeeName: string;
  /** Minutes an unpaid UPI order (no reference submitted yet) holds stock. */
  windowMinutes: number;
  /** Include `tr=<order number>` in the UPI link (some apps are picky with P2P VPAs; can be turned off). */
  includeTr: boolean;
};

const VPA_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,64}$/;

/** UPI payee details from env (UPI_VPA, UPI_PAYEE_NAME, …). Null when not configured. */
export function getUpiConfig(env: NodeJS.ProcessEnv = process.env): UpiConfig | null {
  const vpa = env.UPI_VPA?.trim();
  const payeeName = env.UPI_PAYEE_NAME?.trim();
  if (!vpa || !payeeName) return null;
  if (!VPA_RE.test(vpa)) throw new Error(`UPI_VPA "${vpa}" doesn't look like a UPI ID (name@bank)`);
  const alt = env.UPI_VPA_ALT?.trim() || null;
  if (alt && !VPA_RE.test(alt)) throw new Error(`UPI_VPA_ALT "${alt}" doesn't look like a UPI ID`);
  const raw = env.UPI_PAYMENT_WINDOW_MINUTES;
  const windowMinutes = raw && raw.trim() !== "" ? Number(raw) : 24 * 60;
  if (!Number.isInteger(windowMinutes) || windowMinutes < 5) throw new Error("UPI_PAYMENT_WINDOW_MINUTES must be an integer ≥ 5");
  return { vpa, altVpa: alt, payeeName, windowMinutes, includeTr: env.UPI_INCLUDE_TR !== "false" };
}
