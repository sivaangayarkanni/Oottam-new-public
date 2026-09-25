import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getSecret } from "./config";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(purpose: string, value: string): string {
  return createHmac("sha256", getSecret("AUTH_SECRET")).update(`${purpose}:${value}`).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** `value.signature` – used for the guest cart cookie. */
export function signValue(purpose: string, value: string): string {
  return `${value}.${hmac(purpose, value)}`;
}

export function unsignValue(purpose: string, signed: string | undefined | null): string | null {
  if (!signed) return null;
  const i = signed.lastIndexOf(".");
  if (i <= 0) return null;
  const value = signed.slice(0, i);
  return safeEqual(signed.slice(i + 1), hmac(purpose, value)) ? value : null;
}

/** Token that lets a guest open their own order confirmation page. */
export function orderAccessToken(orderNumber: string): string {
  return hmac("order-view", orderNumber).slice(0, 32);
}

export function verifyOrderAccessToken(orderNumber: string, token: string | undefined | null): boolean {
  return !!token && safeEqual(token, orderAccessToken(orderNumber));
}
