import "server-only";
import { prisma } from "@/lib/prisma";

/** Active categories → active products → active variants + images, in display order. */
export function getCatalogue() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
}

export type Catalogue = Awaited<ReturnType<typeof getCatalogue>>;
