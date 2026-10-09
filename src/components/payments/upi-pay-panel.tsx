import Image from "next/image";
import QRCode from "qrcode";
import { Smartphone, QrCode } from "lucide-react";
import type { UpiConfig } from "@/lib/config";
import { buildUpiUri, upiAmount } from "@/lib/payments/upi";
import { formatPaise } from "@/lib/money";
import { CopyButton } from "./copy-button";
import { UtrForm } from "./utr-form";

/**
 * Per-order UPI payment panel. The QR is generated on the server for the exact order total
 * (`am`) with the order number as note/reference (`tn`/`tr`), and returned as an SVG image.
 */
export async function UpiPayPanel({
  upi,
  orderNumber,
  amountInPaise,
  token,
  dueAt,
}: {
  upi: UpiConfig;
  orderNumber: string;
  amountInPaise: number;
  token: string | null;
  dueAt: Date | null;
}) {
  const uri = buildUpiUri({ vpa: upi.vpa, payeeName: upi.payeeName, amountInPaise, orderNumber, includeTr: upi.includeTr });
  const svg = await QRCode.toString(uri, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#2b1a0e", light: "#ffffff" },
  });
  const qrSrc = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return (
    <section aria-labelledby="upi-h" className="rounded-[2rem] border-2 border-ink bg-white p-5 shadow-[6px_6px_0_0_var(--color-ink)] sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="upi-h" className="font-display text-3xl font-extrabold">Pay by UPI</h2>
        <p className="text-sm text-ink-soft">
          Order <b className="text-ink">{orderNumber}</b>
        </p>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-[17rem_1fr] md:gap-8">
        <div className="flex flex-col items-center">
          {/* Mobile: open the UPI app directly. Desktop: scan with your phone. */}
          <a
            href={uri}
            data-testid="upi-deeplink"
            className="mb-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#1f8f4e] px-6 font-display text-xl font-bold text-white shadow-[0_6px_0_0_#146236] transition active:translate-y-1 active:shadow-none md:hidden"
          >
            <Smartphone className="h-6 w-6" aria-hidden /> Pay {formatPaise(amountInPaise)} with UPI app
          </a>
          <div className="rounded-3xl bg-white p-3 ring-2 ring-ink/10">
            {/* eslint-disable-next-line @next/next/no-img-element -- server-generated data URI */}
            <img
              src={qrSrc}
              width={240}
              height={240}
              alt={`UPI QR code to pay ${formatPaise(amountInPaise)} to ${upi.payeeName} for order ${orderNumber}`}
              className="h-60 w-60"
              data-upi-uri={uri}
            />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
            <QrCode className="h-4 w-4" aria-hidden /> Scan with GPay, PhonePe, Paytm or any UPI app
          </p>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl bg-cream p-5">
            <p className="text-sm font-bold uppercase tracking-wider text-ink-soft">Amount to pay</p>
            <p className="font-display text-5xl font-extrabold leading-tight" data-testid="upi-amount">
              ₹{upiAmount(amountInPaise)}
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-x-2">
                <dt className="text-ink-soft">Pay to</dt>
                <dd className="font-bold">{upi.payeeName}</dd>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <dt className="text-ink-soft">UPI ID</dt>
                <dd className="font-mono font-bold [overflow-wrap:anywhere]"><Vpa value={upi.vpa} /></dd>
                <CopyButton value={upi.vpa} label="UPI ID" />
              </div>
              {upi.altVpa && (
                <div className="flex flex-wrap items-center gap-x-2 text-ink-soft">
                  <dt>Same account, alternate ID</dt>
                  <dd className="font-mono [overflow-wrap:anywhere]"><Vpa value={upi.altVpa} /></dd>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-2">
                <dt className="text-ink-soft">Note / reference</dt>
                <dd className="font-bold">{orderNumber}</dd>
              </div>
            </dl>
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-ink-soft">
            <li>Pay <b className="text-ink">exactly ₹{upiAmount(amountInPaise)}</b> using the QR, the button or the UPI ID.</li>
            <li>Open the payment in your UPI app and note the 12-digit UTR.</li>
            <li>Enter it below. We check it against our bank account and confirm your order.</li>
          </ol>
          <UtrForm orderNumber={orderNumber} token={token} />
          {dueAt && (
            <p className="text-sm text-ink-soft">
              We&apos;ll hold your packs until{" "}
              <b>{dueAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} IST</b>.
            </p>
          )}
          <details className="rounded-2xl border-2 border-dashed border-ink/15 p-4 text-sm">
            <summary className="cursor-pointer font-bold">QR not working?</summary>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
              <Image
                src="/images/payments/upi-static-qr.jpg"
                alt={`Shop UPI QR for ${upi.payeeName}`}
                width={737}
                height={1024}
                className="w-36 rounded-xl ring-1 ring-ink/10"
              />
              <p className="text-ink-soft">
                Scan our shop QR instead, or pay to the UPI ID above. With this QR you must <b>type the amount
                ₹{upiAmount(amountInPaise)} yourself</b> and add <b>{orderNumber}</b> as the note, then enter the UTR here.
              </p>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}

/** Renders a UPI ID with a soft line break after "@" so narrow screens wrap at the handle, not mid-word. */
function Vpa({ value }: { value: string }) {
  const at = value.indexOf("@");
  if (at < 0) return <>{value}</>;
  return (
    <>
      {value.slice(0, at + 1)}
      <wbr />
      {value.slice(at + 1)}
    </>
  );
}
