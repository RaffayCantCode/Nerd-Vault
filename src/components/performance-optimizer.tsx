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

  // Preload visible images aggressively
  useEffect(() => {
    if (typeof window === "undefined") return;

    let observer: IntersectionObserver | null = null;

    const preloadVisibleImages = () => {
      const images = document.querySelectorAll('img[loading="lazy"]');
      const nextObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute("data-src");
              }
              nextObserver.unobserve(img);
            }
          });
        },
        { rootMargin: "200px", threshold: 0.1 }
      );
      observer = nextObserver;

      images.forEach((img) => nextObserver.observe(img));
    };

    // Run after initial paint
    const timer = setTimeout(preloadVisibleImages, 100);
    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, []);

  // Add resource hints for critical domains
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const addResourceHints = () => {
      const domains = [
        { href: "https://image.tmdb.org", as: "image" },
        { href: "https://images.igdb.com", as: "image" },
      ];

      domains.forEach(({ href, as }) => {
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = href;
        link.crossOrigin = "anonymous";
        document.head.appendChild(link);

        const dnsLink = document.createElement("link");
        dnsLink.rel = "dns-prefetch";
        dnsLink.href = href;
        document.head.appendChild(dnsLink);
      });
    };

    addResourceHints();
  }, []);

  return null;
}
