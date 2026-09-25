/**
 * Release stock held by unpaid online orders.
 *
 *   npm run orders:release-expired
 *
 * Cancels PENDING (awaiting online payment) orders older than PENDING_ORDER_TTL_MINUTES (default 30),
 * returns their stock and coupon usage, and marks the payment placeholder FAILED/EXPIRED.
 * Idempotent and safe to run concurrently, so a scheduler (Render/Railway cron, GitHub Actions,
 * system cron) can call it every 5 minutes. Module 4 (Razorpay) must mark paid orders before this runs.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { releaseExpiredOrders } from "../src/lib/orders";
import { pendingOrderTtlMinutes } from "../src/lib/config";

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const ttl = pendingOrderTtlMinutes();
    const { released } = await releaseExpiredOrders(prisma, { ttlMinutes: ttl });
    console.log(
      released.length
        ? `Released stock for ${released.length} expired order(s): ${released.join(", ")}`
        : `No unpaid orders older than ${ttl} minutes.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
