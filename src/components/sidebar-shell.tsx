"use client";

import { memo, ReactNode, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export const SidebarShell = memo(function SidebarShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const searchKey = searchParams.toString();

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, searchKey]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 900) {
        setIsMobileOpen(false);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth > 900) {
      return;
    }

    if (isMobileOpen) {
      document.body.style.setProperty("overflow", "hidden", "important");
    } else {
      document.body.style.removeProperty("overflow");
    }

    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [isMobileOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let rafId = 0;

    function syncHandleToViewport() {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }

      rafId = window.requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--sidebar-toggle-y", `${window.innerHeight / 2}px`);
      });
    }

    syncHandleToViewport();
    window.addEventListener("scroll", syncHandleToViewport, { passive: true });
    window.addEventListener("resize", syncHandleToViewport, { passive: true });

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", syncHandleToViewport);
      window.removeEventListener("resize", syncHandleToViewport);
      document.documentElement.style.removeProperty("--sidebar-toggle-y");
    };
  }, []);

  return (
    <div className={`sidebar-shell nv-sidebar-shell ${isMobileOpen ? "is-mobile-open nv-sidebar-mobile-open" : ""}`}>
      <button
        type="button"
        className="sidebar-mobile-toggle nv-sidebar-mobile-toggle glass"
        aria-label={isMobileOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={isMobileOpen}
        onClick={() => setIsMobileOpen((current) => !current)}
        style={{ top: "var(--sidebar-toggle-y, 50vh)" }}
      >
        <span className="sidebar-mobile-toggle-arrow">{isMobileOpen ? "<" : ">"}</span>
      </button>
      <div className="sidebar-mobile-backdrop nv-sidebar-mobile-backdrop" aria-hidden={!isMobileOpen} onClick={() => setIsMobileOpen(false)} />
      {children}
    </div>
  );
});
