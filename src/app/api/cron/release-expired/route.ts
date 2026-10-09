import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeEqual } from "@/lib/tokens";
import { dispatchPendingAlerts } from "@/lib/notifications";
import { releaseExpiredNow } from "@/server/background";

export const dynamic = "force-dynamic";

/** Vercel Cron target (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 16 || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { released } = await releaseExpiredNow(true);
  const alerts = await dispatchPendingAlerts(prisma);
  return NextResponse.json({ released: released.length, alerts });
}
