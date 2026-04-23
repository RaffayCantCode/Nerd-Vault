"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CORE_ROUTES = ["/browse", "/home", "/profile", "/books"] as const;

export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    const prefetch = () => {
      for (const route of CORE_ROUTES) {
        router.prefetch(route);
      }
    };

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(prefetch, { timeout: 1200 });
    } else {
      timeoutId = globalThis.setTimeout(prefetch, 200);
    }

    return () => {
      if (typeof idleId === "number" && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, [router]);

  return null;
}

