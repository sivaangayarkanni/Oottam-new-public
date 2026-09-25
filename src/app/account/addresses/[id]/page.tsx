import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { AddressForm } from "@/components/account/address-form";

export const metadata: Metadata = { title: "Edit address", robots: { index: false } };

export default async function EditAddressPage({ params }: PageProps<"/account/addresses/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/account/addresses/${id}`);
  const address = await prisma.address.findFirst({ where: { id, userId: user.id } });
  if (!address) notFound();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold">Edit address</h1>
      <div className="mt-6 rounded-[2rem] bg-white p-6 ring-1 ring-ink/10 sm:p-8">
        <AddressForm id={address.id} defaults={address} isDefault={address.isDefault} />
      </div>
    </main>
  );
}
