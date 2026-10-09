import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Mascot, SpeechBubble } from "@/components/mascot";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { adminPasswordEnabled } from "@/lib/admin-login";
import { safeNextPath } from "@/lib/validation";
import { getCurrentUser, isStaff } from "@/server/auth";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next: rawNext } = await searchParams;
  const nextPath = safeNextPath(Array.isArray(rawNext) ? rawNext[0] : rawNext);
  const next = nextPath.startsWith("/admin") ? nextPath : "/admin";
  if (isStaff(await getCurrentUser())) redirect(next);
  const enabled = adminPasswordEnabled(process.env.ADMIN_ACCESS_PASSWORD);

  return (
    <main className="px-4 py-10 sm:py-16">
      <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col items-center text-center">
          <SpeechBubble tail="bottom" className="max-w-xs">
            Owner&apos;s corner. Let&apos;s check today&apos;s orders.
          </SpeechBubble>
          <Mascot size={180} className="mt-5" />
        </div>
        <section aria-labelledby="admin-login-h" className="rounded-[2.5rem] border-2 border-ink bg-white p-6 shadow-[8px_8px_0_0_var(--color-ink)] sm:p-10">
          <p className="flex items-center gap-2 font-bold text-leaf">
            <ShieldCheck className="h-5 w-5" aria-hidden /> Staff only
          </p>
          <h1 id="admin-login-h" className="mt-1 font-display text-4xl font-extrabold">Admin sign in</h1>
          {enabled ? (
            <>
              <p className="mt-2 text-ink-soft">For the shop owner while SMS login codes aren&apos;t set up yet.</p>
              <div className="mt-6">
                <AdminLoginForm next={next} />
              </div>
            </>
          ) : (
            <p className="mt-4 text-ink-soft">Password sign-in is turned off.</p>
          )}
          <p className="mt-6 text-sm text-ink-soft">
            Staff with a phone login can also{" "}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-bold text-saffron underline">
              sign in with a code
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
