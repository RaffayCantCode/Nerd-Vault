"use client";

import { useEffect } from "react";
import { initializePerformanceOptimizer } from "@/lib/performance-optimizer";

export function PerformanceOptimizer() {
  useEffect(() => {
    function bootOptimizer() {
      const optimizer = initializePerformanceOptimizer();
      if (optimizer.getPerformanceInfo().performanceMode) {
        document.documentElement.classList.add("performance-mode");
      }
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(bootOptimizer, { timeout: 1200 });
    } else {
      timeoutId = globalThis.setTimeout(bootOptimizer, 250);
    }

    return () => {
      if (typeof idleId === "number" && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }

      if (timeoutId) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, []);

  return null; // This component doesn't render anything
}
