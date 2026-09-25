"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { addressSchema, fieldErrors, safeNextPath } from "@/lib/validation";
import { getCurrentUser } from "@/server/auth";
import { addressFromForm } from "@/lib/address-form";

const MAX_ADDRESSES = 20;

export type AddressFormState = { errors?: Record<string, string>; values?: Record<string, string> };

function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  return out;
}

export async function saveAddressAction(_prev: AddressFormState, formData: FormData): Promise<AddressFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const parsed = addressSchema.safeParse(addressFromForm(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData) };

  const id = formData.get("id");
  const data = parsed.data;
  await prisma.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId: user.id } });
    if (typeof id !== "string" || !id) {
      if (count >= MAX_ADDRESSES) throw new Error("Too many addresses");
    }
    const makeDefault = data.isDefault || count === 0;
    if (makeDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    const payload = {
      label: data.label ?? null,
      fullName: data.fullName,
      phone: data.phone,
      line1: data.line1,
      line2: data.line2 ?? null,
      landmark: data.landmark ?? null,
      city: data.city,
      district: data.district ?? null,
      state: data.state,
      pincode: data.pincode,
      isDefault: makeDefault,
    };
    if (typeof id === "string" && id) {
      // Scoped by userId so one customer can never edit another's address.
      const updated = await tx.address.updateMany({ where: { id, userId: user.id }, data: payload });
      if (updated.count !== 1) throw new Error("Address not found");
    } else {
      await tx.address.create({ data: { ...payload, userId: user.id } });
    }
  });
  revalidatePath("/account");
  redirect(safeNextPath(formData.get("next"), "/account#addresses"));
}

export async function deleteAddressAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const id = String(formData.get("id") ?? "");
  const deleted = await prisma.address.findFirst({ where: { id, userId: user.id } });
  if (deleted) {
    await prisma.address.delete({ where: { id: deleted.id } });
    if (deleted.isDefault) {
      const next = await prisma.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
      if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }
  revalidatePath("/account");
}

export async function setDefaultAddressAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const id = String(formData.get("id") ?? "");
  await prisma.$transaction(async (tx) => {
    const own = await tx.address.findFirst({ where: { id, userId: user.id } });
    if (!own) return;
    await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    await tx.address.update({ where: { id }, data: { isDefault: true } });
  });
  revalidatePath("/account");
}
