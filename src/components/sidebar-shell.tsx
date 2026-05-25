"use client";

import { memo, ReactNode, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { publishMobileFoldersOpen, registerMobileFolderToggle } from "@/lib/mobile-nav-bridge";

export const SidebarShell = memo(function SidebarShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const searchKey = searchParams.toString();

  useEffect(() => {
    setIsMobileOpen(false);
    publishMobileFoldersOpen(false);
  }, [pathname, searchKey]);

  useEffect(() => {
    publishMobileFoldersOpen(isMobileOpen);
  }, [isMobileOpen]);

  useEffect(() => {
    return registerMobileFolderToggle(() => {
      setIsMobileOpen((current) => !current);
    });
  }, []);

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
    <div className={`sidebar-shell nv-sidebar-shell ${isMobileOpen ? "is-mobile-open nv-sidebar-mobile-open" : ""}`}>
      <div className="sidebar-mobile-backdrop nv-sidebar-mobile-backdrop" aria-hidden={!isMobileOpen} onClick={() => setIsMobileOpen(false)} />
      {children}
    </div>
  );
});
