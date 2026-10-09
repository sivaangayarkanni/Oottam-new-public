"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AdminLoginError, adminPasswordLogin } from "@/lib/admin-login";
import { markNotificationsRead } from "@/lib/notifications";
import { safeNextPath } from "@/lib/validation";
import { getCurrentUser, isStaff, startSession } from "@/server/auth";
import { clientIp } from "@/server/request";

export type AdminLoginState = { error?: string };

export async function adminLoginAction(_prev: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const next = safeNextPath(String(formData.get("next") ?? "/admin"));
  try {
    const owner = await adminPasswordLogin(prisma, {
      password: String(formData.get("password") ?? ""),
      expected: process.env.ADMIN_ACCESS_PASSWORD,
      ip: await clientIp(),
      ownerPhone: process.env.SEED_OWNER_PHONE ?? null,
    });
    await startSession(owner.id);
  } catch (err) {
    if (err instanceof AdminLoginError) return { error: err.message };
    console.error("[admin-login] failed", err);
    return { error: "Something went wrong. Please try again." };
  }
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function markNotificationsReadAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) return;
  const all = formData.get("all") === "1";
  const ids = formData.getAll("id").map(String).filter((s) => /^[a-z0-9]{10,40}$/i.test(s));
  await markNotificationsRead(prisma, { all, ids, actorId: user.id });
  revalidatePath("/admin", "layout");
}
