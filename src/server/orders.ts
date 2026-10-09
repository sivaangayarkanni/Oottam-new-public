import "server-only";
import { verifyOrderAccessToken } from "@/lib/tokens";
import { isStaff } from "./auth";

/** Owner of the order, OWNER/STAFF, or a guest holding the signed link. */
export function canViewOrder(
  order: { orderNumber: string; userId: string | null },
  user: { id: string; role: string } | null,
  token: string | null | undefined,
) {
  return (!!user && order.userId === user.id) || isStaff(user) || verifyOrderAccessToken(order.orderNumber, token);
}
