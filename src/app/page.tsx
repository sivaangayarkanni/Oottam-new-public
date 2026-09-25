import Link from "next/link";

// Placeholder home – the real landing page is built in Module 2.
export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-4xl font-bold">Oottam · ஊட்டம்</h1>
      <p className="text-lg text-gray-600">Instant and Healthy South Indian breakfast mixes</p>
      <Link href="/catalogue" className="rounded bg-orange-600 px-5 py-2 font-medium text-white hover:bg-orange-700">
        View catalogue
      </Link>
    </main>
  );
}
