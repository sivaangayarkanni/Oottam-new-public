import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/notifications";
import { requireStaff } from "@/server/auth";
import { scheduleBackgroundJobs } from "@/server/background";
import { AdminBell } from "@/components/admin/admin-bell";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/payments", label: "UPI payments" },
  { href: "/admin/notifications", label: "Notifications" },
];

export default async function StaffLayout({ children }: LayoutProps<"/admin">) {
  await requireStaff("/admin");
  const unread = await unreadCount(prisma);
  scheduleBackgroundJobs();
  return (
    <>
      <div className="sticky top-[var(--header-h,0px)] z-30 bg-ink text-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <nav aria-label="Admin" className="flex items-center gap-1 overflow-x-auto text-sm font-bold">
            <ShieldCheck className="mr-1 h-4 w-4 shrink-0 text-turmeric" aria-hidden />
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-cream/10">
                {l.label}
              </Link>
            ))}
          </nav>
          <AdminBell initialUnread={unread} />
        </div>
      </div>
      {children}
    </>
  );
}
