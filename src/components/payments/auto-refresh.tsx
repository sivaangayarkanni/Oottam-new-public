"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetch the server page every `seconds` while visible (e.g. while a payment is being verified). */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
