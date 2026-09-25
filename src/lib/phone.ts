/**
 * Indian mobile numbers: 10 digits starting 6–9, optionally prefixed with +91, 91 or 0.
 * Spaces, dashes and brackets are ignored. Returns E.164 (+91XXXXXXXXXX) or null.
 */
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  const m = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(digits);
  return m ? `+91${m[1]}` : null;
}

/** Just the 10-digit national number, for address forms. */
export function nationalNumber(e164: string): string {
  return e164.replace(/^\+91/, "");
}

/** +91 92455 37575 → +91 ●●●●● ●7575 (for logs and UI hints). */
export function maskPhone(e164: string): string {
  const n = nationalNumber(e164);
  return `+91 ●●●●●●${n.slice(-4)}`;
}

export function formatIndianMobile(e164: string): string {
  const n = nationalNumber(e164);
  return n.length === 10 ? `+91 ${n.slice(0, 5)} ${n.slice(5)}` : e164;
}
