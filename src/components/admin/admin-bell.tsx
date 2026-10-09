"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellRing, Volume2, VolumeX } from "lucide-react";
import clsx from "clsx";

type Latest = { id: string; title: string; body: string; orderNumber: string | null; createdAt: string };
const POLL_MS = 20_000;
const PREF_KEY = "oottam-admin-alerts";

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.18].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i ? 1046 : 784;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.17);
    });
    setTimeout(() => ctx.close(), 600);
  } catch {}
}

/**
 * Unread badge for the admin bar. Polls every 20 s while the tab is visible; on a new unread notification it
 * refreshes the page data and, if the owner turned alerts on, plays a short chime and shows a browser notification.
 */
export function AdminBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const [alerts, setAlerts] = useState(false);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read a client-only preference once
    setAlerts(localStorage.getItem(PREF_KEY) === "on");
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { unread: number; latest: Latest[] };
      setUnread(data.unread);
      const fresh = seen.current ? data.latest.filter((n) => !seen.current!.has(n.id)) : [];
      seen.current = new Set([...(seen.current ?? []), ...data.latest.map((n) => n.id)]);
      if (fresh.length === 0) return;
      router.refresh();
      if (localStorage.getItem(PREF_KEY) !== "on") return;
      beep();
      if ("Notification" in window && Notification.permission === "granted") {
        const n = fresh[0];
        new Notification(fresh.length > 1 ? `${fresh.length} new Oottam alerts` : n.title, { body: n.body, tag: n.id });
      }
    } catch {}
  }, [router]);

  useEffect(() => {
    const first = setTimeout(poll, 0);
    const id = setInterval(() => document.visibilityState === "visible" && poll(), POLL_MS);
    const onVis = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [poll]);

  async function toggleAlerts() {
    const next = !alerts;
    if (next && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission().catch(() => {});
    }
    localStorage.setItem(PREF_KEY, next ? "on" : "off");
    setAlerts(next);
    if (next) beep();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleAlerts}
        aria-pressed={alerts}
        title={alerts ? "Sound + browser alerts on" : "Turn on sound + browser alerts"}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-cream/90 ring-1 ring-cream/30 hover:bg-cream/10"
      >
        {alerts ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
        <span className="hidden sm:inline">{alerts ? "Alerts on" : "Alerts off"}</span>
      </button>
      <Link
        href="/admin/notifications"
        aria-label={`Notifications, ${unread} unread`}
        data-testid="admin-bell"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-cream/10 text-cream ring-1 ring-cream/30 hover:bg-cream/20"
      >
        {unread > 0 ? <BellRing className="h-5 w-5" aria-hidden /> : <Bell className="h-5 w-5" aria-hidden />}
        <span
          data-testid="admin-unread"
          className={clsx(
            "absolute -right-1.5 -top-1.5 min-w-5 rounded-full px-1.5 text-center text-xs font-extrabold leading-5",
            unread > 0 ? "bg-saffron text-white" : "hidden",
          )}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      </Link>
    </div>
  );
}
