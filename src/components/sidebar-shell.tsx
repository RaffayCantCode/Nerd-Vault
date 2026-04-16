"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function SidebarShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 900) {
        setIsMobileOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={`sidebar-shell ${isMobileOpen ? "is-mobile-open" : ""}`}>
      <button
        type="button"
        className="sidebar-mobile-toggle glass"
        aria-label={isMobileOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={isMobileOpen}
        onClick={() => setIsMobileOpen((current) => !current)}
      >
        <span className="sidebar-mobile-toggle-arrow">{isMobileOpen ? "‹" : "›"}</span>
      </button>
      <div className="sidebar-mobile-backdrop" aria-hidden={!isMobileOpen} onClick={() => setIsMobileOpen(false)} />
      {children}
    </div>
  );
}
