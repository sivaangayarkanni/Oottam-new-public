import { connection } from "next/server";
import { hasSamplePrices } from "@/lib/catalogue";

/** Subtle notice shown while placeholder prices are in the DB. Disappears automatically once real prices are set. */
export async function SampleBanner() {
  await connection();
  let show = false;
  try {
    show = await hasSamplePrices();
  } catch {
    show = false;
  }
  if (!show) return null;
  return (
    <p className="bg-ink px-4 py-1.5 text-center text-xs text-cream/80">
      Preview store: prices and pack sizes shown are <strong className="text-turmeric">sample values</strong> and not yet final.
    </p>
  );
}
