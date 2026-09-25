"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDeliveryRule, isCodEnabled } from "@/lib/config";
import { OrderError, placeOrder, quoteCheckout, type AddressSnapshot } from "@/lib/orders";
import type { Totals } from "@/lib/pricing";
import type { CartView } from "@/lib/cart";
import { addressFromForm } from "@/lib/address-form";
import { checkoutSchema, couponCodeSchema, fieldErrors } from "@/lib/validation";
import { orderAccessToken } from "@/lib/tokens";
import { getCurrentUser } from "@/server/auth";
import { currentCartId } from "@/server/cart";

export type QuoteResult = { cart: CartView; totals: Totals; couponError?: string };

/** Re-price the cart on the server, optionally with a coupon. */
export async function quoteAction(couponCode: string | null, guestPhone?: string | null): Promise<QuoteResult> {
  let code: string | null = null;
  let couponError: string | undefined;
  if (couponCode && couponCode.trim()) {
    const parsed = couponCodeSchema.safeParse(couponCode);
    if (parsed.success) code = parsed.data;
    else couponError = parsed.error.issues[0]?.message;
  }
  const user = await getCurrentUser();
  const quote = await quoteCheckout(prisma, {
    cartId: await currentCartId(),
    couponCode: code,
    userId: user?.id,
    phone: user?.phone ?? guestPhone ?? null,
    rule: getDeliveryRule(),
  });
  if (quote.totals.coupon && !quote.totals.coupon.ok) couponError = quote.totals.coupon.message;
  return { ...quote, couponError };
}

export type PlaceOrderState = {
  errors?: Record<string, string>;
  message?: string;
  /** Present when prices changed – the form shows the new totals and asks to confirm again. */
  quote?: QuoteResult;
};

export async function placeOrderAction(_prev: PlaceOrderState, formData: FormData): Promise<PlaceOrderState> {
  const user = await getCurrentUser();
  const useSaved = formData.get("addressMode") === "saved" && !!user;
  const parsed = checkoutSchema.safeParse({
    idempotencyKey: formData.get("idempotencyKey"),
    addressId: useSaved ? formData.get("addressId") || undefined : undefined,
    address: useSaved ? undefined : addressFromForm(formData),
    saveAddress: formData.get("saveAddress") === "on",
    contactPhone: user ? undefined : formData.get("contactPhone") || "",
    email: formData.get("email") || undefined,
    couponCode: formData.get("couponCode") || undefined,
    paymentMethod: formData.get("paymentMethod") || "ONLINE",
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    // Strip the "address." prefix so fields map 1:1 to inputs.
    const flat = Object.fromEntries(Object.entries(errors).map(([k, v]) => [k.replace(/^address\./, ""), v]));
    return { errors: flat, message: "Please fix the highlighted fields." };
  }
  const input = parsed.data;
  if (input.paymentMethod === "COD" && !isCodEnabled()) return { message: "Cash on delivery isn't available yet." };

  const cartId = await currentCartId();
  if (!cartId) return { message: "Your cart is empty." };

  let snapshot: AddressSnapshot;
  if (input.addressId && user) {
    const saved = await prisma.address.findFirst({ where: { id: input.addressId, userId: user.id } });
    if (!saved) return { errors: { addressId: "Choose a delivery address" } };
    snapshot = {
      fullName: saved.fullName,
      phone: saved.phone,
      line1: saved.line1,
      line2: saved.line2,
      landmark: saved.landmark,
      city: saved.city,
      district: saved.district,
      state: saved.state,
      pincode: saved.pincode,
      country: "IN",
    };
  } else {
    const a = input.address!;
    snapshot = { ...a, line2: a.line2 ?? null, landmark: a.landmark ?? null, district: a.district ?? null, country: "IN" };
    delete (snapshot as { isDefault?: boolean }).isDefault;
    delete (snapshot as { label?: string }).label;
  }

  const phone = user?.phone ?? input.contactPhone;
  if (!phone) return { errors: { contactPhone: "Enter your mobile number" } };

  const expectedRaw = Number(formData.get("expectedTotal"));
  let placed;
  try {
    placed = await placeOrder(prisma, {
      cartId,
      userId: user?.id ?? null,
      idempotencyKey: input.idempotencyKey,
      contact: { name: user?.name ?? snapshot.fullName, phone, email: input.email ?? user?.email ?? null },
      shippingAddress: snapshot,
      couponCode: input.couponCode ?? null,
      paymentMethod: input.paymentMethod === "COD" ? "COD" : "RAZORPAY",
      notes: input.notes ?? null,
      expectedTotalInPaise: Number.isInteger(expectedRaw) && expectedRaw > 0 ? expectedRaw : undefined,
      rule: getDeliveryRule(),
    });
  } catch (err) {
    if (err instanceof OrderError) {
      const quote = await quoteAction(input.couponCode ?? null, phone);
      return {
        message: err.message,
        errors: err.code === "coupon" ? { couponCode: err.message } : undefined,
        quote,
      };
    }
    console.error("[checkout] place order failed", err);
    return { message: "Something went wrong while placing your order. You have not been charged. Please try again." };
  }

  if (user && input.saveAddress && input.address && !placed.duplicate) {
    const count = await prisma.address.count({ where: { userId: user.id } });
    if (count < 20) {
      const { isDefault: _ignored, label, ...rest } = input.address;
      void _ignored;
      await prisma.address.create({
        data: { ...rest, label: label ?? null, userId: user.id, isDefault: count === 0 },
      });
    }
  }

  revalidatePath("/", "layout");
  const token = user ? "" : `&t=${orderAccessToken(placed.orderNumber)}`;
  redirect(`/orders/${placed.orderNumber}?placed=1${token}`);
}
