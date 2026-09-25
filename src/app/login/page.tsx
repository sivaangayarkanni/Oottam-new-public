import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Mascot, SpeechBubble } from "@/components/mascot";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/server/auth";
import { safeNextPath } from "@/lib/validation";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next: rawNext } = await searchParams;
  const next = safeNextPath(Array.isArray(rawNext) ? rawNext[0] : rawNext);
  if (await getCurrentUser()) redirect(next);

  return (
    <main className="relative overflow-hidden px-4 py-10 sm:py-16">
      <div aria-hidden className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-turmeric/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-leaf/15 blur-3xl" />
      <div className="relative mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <SpeechBubble tail="bottom" className="max-w-xs">
            Vanakkam! <span lang="ta" className="font-tamil">வணக்கம்!</span> Just your phone number. No passwords to remember.
          </SpeechBubble>
          <Mascot size={210} priority className="mt-5 md:ml-10" />
        </div>
        <section
          aria-labelledby="login-h"
          className="rounded-[2.5rem] border-2 border-ink bg-white p-6 shadow-[8px_8px_0_0_var(--color-ink)] sm:p-10"
        >
          <h1 id="login-h" className="font-display text-4xl font-extrabold leading-tight">
            Log in to <span className="text-saffron">Oottam</span>
          </h1>
          <p className="mt-2 text-ink-soft">Track orders, save addresses and check out faster.</p>
          <div className="mt-8">
            <LoginForm next={next} />
          </div>
          <p className="mt-8 flex items-start gap-2 text-sm text-ink-soft">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden />
            Codes expire in 5 minutes. We never share your number. You can also check out as a guest.
          </p>
        </section>
      </div>
    </main>
  );
}
