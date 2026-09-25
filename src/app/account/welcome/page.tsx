import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/auth";
import { safeNextPath } from "@/lib/validation";
import { ProfileForm } from "@/components/account/profile-form";
import { Mascot, SpeechBubble } from "@/components/mascot";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };

export default async function WelcomePage({ searchParams }: PageProps<"/account/welcome">) {
  const { next: raw } = await searchParams;
  const next = safeNextPath(Array.isArray(raw) ? raw[0] : raw);
  const user = await requireUser("/account/welcome");
  return (
    <main className="mx-auto grid w-full max-w-4xl items-center gap-10 px-4 py-12 md:grid-cols-[1fr_1.3fr]">
      <div className="flex flex-col items-center">
        <SpeechBubble tail="bottom">You&apos;re in! What should I call you?</SpeechBubble>
        <Mascot size={180} animate="wobble" className="mt-4" priority />
      </div>
      <section className="rounded-[2.5rem] border-2 border-ink bg-white p-8 shadow-[8px_8px_0_0_var(--color-ink)]">
        <h1 className="font-display text-4xl font-extrabold">Welcome to Oottam 🎉</h1>
        <p className="mt-2 text-ink-soft">Optional: add your name and email for order updates. You can change these anytime.</p>
        <div className="mt-6">
          <ProfileForm name={user.name} email={user.email} next={next} submitLabel="Save & continue" />
        </div>
        <Link href={next} className="mt-4 inline-block font-semibold text-ink-soft underline underline-offset-4">
          Skip for now
        </Link>
      </section>
    </main>
  );
}
