import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export const hasTestDb = !!process.env.TEST_DATABASE_URL;

export function testClient() {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL!, max: 20 }) });
}

/** Wipe every table touched by the tests (order matters for FKs; CASCADE handles the rest). */
export async function resetDb(db: PrismaClient) {
  await db.$executeRawUnsafe(
    `TRUNCATE "OrderItem","Payment","Order","CartItem","Cart","Coupon","ProductVariant","ProductImage","Product","Category","Session","OtpCode","Address","AuditLog","Notification","User" RESTART IDENTITY CASCADE`,
  );
}

let n = 0;
export async function makeVariant(db: PrismaClient, opts: { stock: number; price?: number; mrp?: number }) {
  n++;
  const category = await db.category.upsert({
    where: { slug: "test-cat" },
    update: {},
    create: { slug: "test-cat", nameEn: "Test category" },
  });
  const product = await db.product.create({
    data: { slug: `test-product-${n}-${Date.now()}`, nameEn: `Test Mix ${n}`, categoryId: category.id },
  });
  return db.productVariant.create({
    data: {
      productId: product.id,
      sku: `TST-${n}-${Date.now()}`,
      flavourEn: "Plain",
      sizeGrams: 200,
      priceInPaise: opts.price ?? 12000,
      mrpInPaise: opts.mrp ?? 14000,
      stock: opts.stock,
    },
  });
}
