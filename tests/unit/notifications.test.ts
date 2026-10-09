import { describe, expect, it } from "vitest";
import { alertChannels, notificationCopy } from "@/lib/notifications";
import { adminPasswordEnabled, checkAdminPassword } from "@/lib/admin-login";

describe("alert channels", () => {
  it("are off unless both env vars of a channel are set", () => {
    expect(alertChannels({} as NodeJS.ProcessEnv)).toHaveLength(0);
    expect(alertChannels({ RESEND_API_KEY: "re_x" } as unknown as NodeJS.ProcessEnv)).toHaveLength(0);
    expect(alertChannels({ TELEGRAM_BOT_TOKEN: "1:abc" } as unknown as NodeJS.ProcessEnv)).toHaveLength(0);
    const both = alertChannels({
      RESEND_API_KEY: "re_x",
      ADMIN_ALERT_EMAIL: "a@example.com, b@example.com",
      TELEGRAM_BOT_TOKEN: "1:abc",
      TELEGRAM_CHAT_ID: "42",
    } as unknown as NodeJS.ProcessEnv);
    expect(both.map((c) => c.name)).toEqual(["email", "telegram"]);
  });

  it("send the expected requests and surface HTTP errors", async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      return new Response("nope", { status: url.includes("telegram") ? 500 : 200 });
    }) as unknown as typeof fetch;
    const [email, telegram] = alertChannels({
      RESEND_API_KEY: "re_x",
      ADMIN_ALERT_EMAIL: "owner@example.com",
      TELEGRAM_BOT_TOKEN: "1:abc",
      TELEGRAM_CHAT_ID: "42",
      NEXT_PUBLIC_SITE_URL: "https://shop.example/",
    } as unknown as NodeJS.ProcessEnv);
    const n = { title: "New order <OTM-1>", body: "Priya & co", orderNumber: "OTM-1" };
    await email.send(n, fakeFetch);
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    expect(calls[0].body).toMatchObject({ to: ["owner@example.com"], subject: "[Oottam] New order <OTM-1>" });
    expect(String(calls[0].body.html)).toContain("New order &lt;OTM-1&gt;");
    expect(String(calls[0].body.text)).toContain("https://shop.example/admin/notifications");
    await expect(telegram.send(n, fakeFetch)).rejects.toThrow(/Telegram responded 500/);
    expect(calls[1].body).toMatchObject({ chat_id: "42" });
  });

  it("copy is factual and includes the key numbers", () => {
    const placed = notificationCopy.orderPlaced({ orderNumber: "OTM-2026-000001", customerName: "Priya", totalInPaise: 34900, paymentMethod: "UPI", itemCount: 1 });
    expect(placed.title).toBe("New order OTM-2026-000001 · ₹349");
    expect(placed.body).toContain("1 pack.");
    const utr = notificationCopy.utrSubmitted({ orderNumber: "OTM-1", customerName: "Priya", amountInPaise: 16900, utr: "412345678901" });
    expect(utr.body).toContain("₹169");
    expect(notificationCopy.orderCancelled({ orderNumber: "OTM-1", reason: "Payment not received in time", expired: true }).type).toBe("order.expired");
  });
});

describe("admin password check", () => {
  it("needs a configured password of 16+ characters", () => {
    expect(adminPasswordEnabled(undefined)).toBe(false);
    expect(adminPasswordEnabled("x".repeat(15))).toBe(false);
    expect(adminPasswordEnabled("x".repeat(16))).toBe(true);
  });
  it("compares exactly", () => {
    const pw = "a-very-long-secret-value";
    expect(checkAdminPassword(pw, pw)).toBe(true);
    expect(checkAdminPassword(`${pw} `, pw)).toBe(false);
    expect(checkAdminPassword(pw.slice(0, -1), pw)).toBe(false);
    expect(checkAdminPassword("", pw)).toBe(false);
    expect(checkAdminPassword("short", "short")).toBe(false);
  });
});
