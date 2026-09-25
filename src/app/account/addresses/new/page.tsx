import type { Metadata } from "next";
import { requireUser } from "@/server/auth";
import { AddressForm } from "@/components/account/address-form";
import { nationalNumber } from "@/lib/phone";

export const metadata: Metadata = { title: "Add address", robots: { index: false } };

export default async function NewAddressPage() {
  const user = await requireUser("/account/addresses/new");
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold">Add an address</h1>
      <div className="mt-6 rounded-[2rem] bg-white p-6 ring-1 ring-ink/10 sm:p-8">
        <AddressForm defaults={{ fullName: user.name, phone: user.phone ? nationalNumber(user.phone) : "" }} />
      </div>
    </main>
  );
}
