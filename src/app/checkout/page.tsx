import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getDeliveryRule, getUpiConfig, isCodEnabled, onlinePaymentProvider } from "@/lib/config";
import { quoteCheckout } from "@/lib/orders";
import { randomToken } from "@/lib/tokens";
import { getCurrentUser } from "@/server/auth";
import { currentCartId } from "@/server/cart";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { EmptyCart } from "@/components/cart/empty-cart";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const [quote, addresses] = await Promise.all([
    quoteCheckout(prisma, { cartId: await currentCartId(), userId: user?.id, phone: user?.phone, rule: getDeliveryRule() }),
    user
      ? prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] })
      : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-5xl font-extrabold">Checkout</h1>
      <p className="mt-1 text-ink-soft">Almost breakfast time. Three quick steps.</p>
      <div className="mt-8">
        {quote.cart.lines.length === 0 ? (
          <EmptyCart />
        ) : (
          <CheckoutForm
            initialQuote={quote}
            user={user ? { name: user.name, phone: user.phone, email: user.email } : null}
            addresses={addresses.map((a) => ({
              id: a.id,
              label: a.label,
              fullName: a.fullName,
              phone: a.phone,
              line1: a.line1,
              line2: a.line2,
              city: a.city,
              state: a.state,
              pincode: a.pincode,
              isDefault: a.isDefault,
            }))}
            codEnabled={isCodEnabled()}
            onlineProvider={onlinePaymentProvider() === "upi" ? (getUpiConfig() ? "upi" : null) : "razorpay"}
            idempotencyKey={randomToken(18)}
          />
        )}
      </div>
    </main>
  );
}
