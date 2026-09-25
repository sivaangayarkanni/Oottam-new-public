"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requestOtp, verifyOtp } from "@/lib/otp";
import { getSmsProvider } from "@/lib/sms";
import { fieldErrors, otpSchema, phoneSchema, profileSchema, safeNextPath } from "@/lib/validation";
import { endSession, getCurrentUser, startSession } from "@/server/auth";
import { mergeGuestCartInto } from "@/server/cart";
import { clientIp } from "@/server/request";
import { revalidatePath } from "next/cache";

export type OtpRequestState =
  | { status: "idle" }
  | { status: "sent"; phone: string; resendAfterSeconds: number; devHint: boolean; sentAt: number }
  | { status: "error"; message: string; phoneInput?: string };

export async function requestOtpAction(_prev: OtpRequestState, formData: FormData): Promise<OtpRequestState> {
  const phoneInput = String(formData.get("phone") ?? "");
  const parsed = phoneSchema.safeParse({ phone: phoneInput });
  if (!parsed.success) return { status: "error", message: fieldErrors(parsed.error).phone, phoneInput };

  let sms;
  try {
    sms = getSmsProvider();
  } catch (err) {
    console.error("[otp]", err instanceof Error ? err.message : err);
    return { status: "error", message: "Login by SMS isn't available right now. Please order on WhatsApp.", phoneInput };
  }
  const result = await requestOtp(prisma, { phone: parsed.data.phone, ip: await clientIp(), sms });
  if (!result.ok) {
    return {
      status: "error",
      phoneInput,
      message:
        result.error === "rate_limited"
          ? `Please wait ${formatWait(result.retryAfterSeconds)} before requesting another code.`
          : "We couldn't send the SMS. Please try again in a minute.",
    };
  }
  return {
    status: "sent",
    phone: parsed.data.phone,
    resendAfterSeconds: result.resendAfterSeconds,
    // Only a hint that the code is in the server console; the code itself is never sent to the browser.
    devHint: sms.name === "dev",
    sentAt: Date.now(),
  };
}

function formatWait(seconds: number) {
  return seconds >= 120 ? `${Math.ceil(seconds / 60)} minutes` : `${seconds} seconds`;
}

export type VerifyState = { message?: string };

export async function verifyOtpAction(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const parsed = otpSchema.safeParse({ phone: formData.get("phone"), code: formData.get("code") });
  if (!parsed.success) return { message: Object.values(fieldErrors(parsed.error))[0] };
  const { phone, code } = parsed.data;

  const result = await verifyOtp(prisma, { phone, code });
  if (!result.ok) {
    const messages = {
      not_found: "That code has been used or replaced. Request a new one.",
      expired: "That code has expired. Request a new one.",
      too_many_attempts: "Too many wrong tries. Request a new code.",
      invalid: `That code doesn't match. ${"attemptsLeft" in result ? `${result.attemptsLeft} tries left.` : ""}`,
    } as const;
    return { message: messages[result.error] };
  }

  const now = new Date();
  const user = await prisma.user.upsert({
    where: { phone },
    update: { lastLoginAt: now, phoneVerifiedAt: now },
    create: { phone, phoneVerifiedAt: now, lastLoginAt: now },
  });
  if (!user.isActive) return { message: "This account is disabled. Please contact us on WhatsApp." };

  await startSession(user.id);
  // The phone is now verified, so earlier guest orders placed with it become visible in "My orders".
  await prisma.order.updateMany({ where: { customerPhone: phone, userId: null }, data: { userId: user.id } });
  await mergeGuestCartInto(user.id);
  revalidatePath("/", "layout");

  const next = safeNextPath(formData.get("next"));
  redirect(user.name ? next : `/account/welcome?next=${encodeURIComponent(next)}`);
}

export async function logoutAction() {
  await endSession();
  revalidatePath("/", "layout");
  redirect("/");
}

export type ProfileState = { errors?: Record<string, string>; saved?: boolean };

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || undefined,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  if (parsed.data.email) {
    const taken = await prisma.user.findFirst({ where: { email: parsed.data.email, NOT: { id: user.id } } });
    if (taken) return { errors: { email: "That email is already linked to another account." } };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, email: parsed.data.email ?? null },
  });
  revalidatePath("/account");
  const next = formData.get("next");
  if (next !== null) redirect(safeNextPath(next));
  return { saved: true };
}
