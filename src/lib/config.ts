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
