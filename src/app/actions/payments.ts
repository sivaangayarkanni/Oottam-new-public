"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUpiConfig } from "@/lib/config";
import { confirmUpiPayment, PaymentError, rejectUpiPayment, submitUpiReference } from "@/lib/payments/upi";
import { getCurrentUser } from "@/server/auth";
import { canViewOrder } from "@/server/orders";
import { clientIp } from "@/server/request";

// Server Actions are POST-only with Next.js' Origin/Host check (CSRF), see README.

export type UtrState = { error?: string; ok?: boolean };

export async function submitUtrAction(_prev: UtrState, formData: FormData): Promise<UtrState> {
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const token = formData.get("t");
  const order = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true, orderNumber: true, userId: true } });
  const user = await getCurrentUser();
  if (!order || !canViewOrder(order, user, typeof token === "string" ? token : null)) return { error: "Order not found." };
  try {
    await submitUpiReference(prisma, { orderId: order.id, utr: String(formData.get("utr") ?? ""), ip: await clientIp() });
  } catch (err) {
    if (err instanceof PaymentError) return { error: err.message };
    console.error("[upi] submit failed", err);
    return { error: "Something went wrong. Please try again." };
  }
  revalidatePath(`/orders/${order.orderNumber}`);
  revalidatePath("/admin/payments");
  return { ok: true };
}

export type VerifyState = { error?: string; done?: string };

export async function confirmPaymentAction(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const user = await getCurrentUser();
  if (formData.get("checked") !== "on") return { error: "Tick the box after checking the amount and UTR in your bank app." };
  let orderNumber: string;
  try {
    const r = await confirmUpiPayment(prisma, { paymentId: String(formData.get("paymentId") ?? ""), actorId: user?.id ?? null });
    orderNumber = r.orderNumber;
  } catch (err) {
    if (err instanceof PaymentError) return { error: err.message };
    throw err;
  }
  revalidatePath("/admin/payments");
  revalidatePath(`/orders/${orderNumber}`);
  // The card disappears once the payment is no longer pending, so report the result as a page banner.
  redirect(`/admin/payments?done=confirmed&order=${encodeURIComponent(orderNumber)}`);
}

export async function rejectPaymentAction(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const user = await getCurrentUser();
  const then = formData.get("then") === "cancel" ? "cancel" : "retry";
  let orderNumber: string;
  try {
    const r = await rejectUpiPayment(prisma, {
      paymentId: String(formData.get("paymentId") ?? ""),
      actorId: user?.id ?? null,
      reason: String(formData.get("reason") ?? ""),
      then,
      windowMinutes: getUpiConfig()?.windowMinutes ?? 24 * 60,
    });
    orderNumber = r.orderNumber;
  } catch (err) {
    if (err instanceof PaymentError) return { error: err.message };
    throw err;
  }
  revalidatePath("/admin/payments");
  revalidatePath(`/orders/${orderNumber}`);
  redirect(`/admin/payments?done=${then === "cancel" ? "cancelled" : "rejected"}&order=${encodeURIComponent(orderNumber)}`);
}
