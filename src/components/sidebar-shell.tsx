"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function SidebarShell({ children }: { children: ReactNode }) {
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

  return (
    <div className={`sidebar-shell ${isMobileOpen ? "is-mobile-open" : ""}`}>
      <button
        type="button"
        className="sidebar-mobile-toggle glass"
        aria-label={isMobileOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={isMobileOpen}
        onClick={() => setIsMobileOpen((current) => !current)}
      >
        <span className="sidebar-mobile-toggle-arrow">{isMobileOpen ? "<" : ">"}</span>
      </button>
      <div className="sidebar-mobile-backdrop" aria-hidden={!isMobileOpen} onClick={() => setIsMobileOpen(false)} />
      {children}
    </div>
  );
}
