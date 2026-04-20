"use client";

import { ReactNode, useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function SidebarShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [togglePosition, setTogglePosition] = useState(50); // percentage from top
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

  // Update toggle position based on scroll - follows user viewport
  const handleScroll = useCallback(() => {
    if (typeof window === "undefined") return;
    
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    
    // Calculate position as percentage (10% to 90% range)
    const scrollPercent = scrollTop / (docHeight - windowHeight);
    const clampedPercent = Math.max(15, Math.min(85, scrollPercent * 100 + 15));
    
    setTogglePosition(clampedPercent);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial position
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const isMobile = window.innerWidth <= 900;
    if (isMobile) {
      if (isMobileOpen) {
        document.body.classList.add("sidebar-open");
        document.body.style.overflow = "hidden";
      } else {
        document.body.classList.remove("sidebar-open");
        document.body.style.overflow = "";
      }
    }
    
    return () => {
      document.body.classList.remove("sidebar-open");
      document.body.style.overflow = "";
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
        style={{ top: `${togglePosition}%` }}
      >
        <span className="sidebar-mobile-toggle-arrow">{isMobileOpen ? "‹" : "›"}</span>
      </button>
      <div className="sidebar-mobile-backdrop" aria-hidden={!isMobileOpen} onClick={() => setIsMobileOpen(false)} />
      {children}
    </div>
  );
}
