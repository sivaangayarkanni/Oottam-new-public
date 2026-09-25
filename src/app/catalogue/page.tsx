import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { getCatalogue } from "@/lib/catalogue";
import { formatPaise } from "@/lib/money";

export const metadata: Metadata = {
  title: "Catalogue | Oottam – Instant and Healthy",
};

export default async function CataloguePage() {
  await connection(); // render at request time from the DB
  const categories = await getCatalogue();
  const hasSample = categories.some((c) =>
    c.products.some((p) => p.variants.some((v) => v.isSampleData)),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Oottam Catalogue</h1>
        <p className="text-gray-600">ஊட்டம் · Instant and Healthy · Natural · No Preservative · No Added Colors</p>
        {hasSample && (
          <p className="mt-4 rounded border border-amber-400 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            ⚠️ SAMPLE PRICES – pack sizes and prices shown are placeholders and must be replaced before launch.
          </p>
        )}
      </header>

      {categories.map((category) => (
        <section key={category.id} className="mb-10">
          <h2 className="mb-4 border-b pb-2 text-2xl font-semibold">
            {category.nameEn} <span className="text-gray-500">· {category.nameTa}</span>
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {category.products.map((product) => {
              const image = product.images.find((i) => i.isPrimary) ?? product.images[0];
              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-lg border bg-white shadow-sm"
                  style={{ borderTop: `6px solid ${product.familyColor ?? "#ccc"}` }}
                >
                  {image && (
                    <Image
                      src={image.url}
                      alt={image.alt ?? product.nameEn}
                      width={551}
                      height={819}
                      className="h-64 w-full object-cover object-top"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold">{product.nameEn}</h3>
                    <p className="text-sm text-gray-500">{product.nameTa}</p>
                    <table className="mt-3 w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="font-normal">Flavour</th>
                          <th className="font-normal">Size</th>
                          <th className="text-right font-normal">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.variants.map((v) => (
                          <tr key={v.id} className="border-t">
                            <td className="py-1">
                              {v.flavourEn} <span className="text-gray-400">{v.flavourTa}</span>
                            </td>
                            <td>{v.sizeGrams}g</td>
                            <td className="text-right">
                              {formatPaise(v.priceInPaise)}{" "}
                              {v.mrpInPaise > v.priceInPaise && (
                                <s className="text-gray-400">{formatPaise(v.mrpInPaise)}</s>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <footer className="mt-12 border-t pt-4 text-sm text-gray-500">
        FSSAI Lic. No. 22425571000318 · Order on WhatsApp:{" "}
        <a className="underline" href="https://wa.me/c/919245537575">+91 92455 37575</a>
      </footer>
    </main>
  );
}
