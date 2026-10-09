import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/notifications";
import { getCurrentUser, isStaff } from "@/server/auth";
import { scheduleBackgroundJobs } from "@/server/background";

export const dynamic = "force-dynamic";

/** Polled by the admin bell (~20 s). Staff only; everyone else gets a plain 404. */
export async function GET() {
  const user = await getCurrentUser();
  if (!isStaff(user)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [unread, latest] = await Promise.all([
    unreadCount(prisma),
    prisma.notification.findMany({
      where: { readAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, type: true, title: true, body: true, orderNumber: true, createdAt: true },
    }),
  ]);
  scheduleBackgroundJobs();
  return NextResponse.json({ unread, latest }, { headers: { "Cache-Control": "no-store" } });
}
