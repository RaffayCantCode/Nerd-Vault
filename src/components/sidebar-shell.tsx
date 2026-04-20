"use client";

import { ReactNode, useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function SidebarShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [togglePosition, setTogglePosition] = useState(50); // percentage from top
  const [cursorY, setCursorY] = useState(50); // Vertical position (0-100)
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const searchKey = searchParams.toString();

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, searchKey]);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth <= 900;
      setIsDesktop(!mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Instant cursor follow for desktop
  useEffect(() => {
    if (!isDesktop || isHoveringSidebar) return;

    function handleMouseMove(e: MouseEvent) {
      // Calculate cursor Y position relative to viewport height as a percentage
      const yPercent = (e.clientY / window.innerHeight) * 100;
      // Clamp to prevent the sidebar from hitting the very top/bottom edges
      setCursorY(Math.max(10, Math.min(90, yPercent)));
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isDesktop, isHoveringSidebar]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Update toggle position based on scroll - for mobile arrow
  const handleScroll = useCallback(() => {
    if (typeof window === "undefined") return;
    
    window.requestAnimationFrame(() => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const scrollableDistance = docHeight - windowHeight;
      
      if (scrollableDistance <= 0) {
        setTogglePosition(50);
        return;
      }
      
      const scrollPercent = scrollTop / scrollableDistance;
      const clampedPercent = Math.max(15, Math.min(85, scrollPercent * 70 + 15));
      
      setTogglePosition(clampedPercent);
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const isMobile = window.innerWidth <= 900;
    if (isMobile) {
      if (isMobileOpen) {
        document.body.style.setProperty('overflow', 'hidden', 'important');
      } else {
        document.body.style.removeProperty('overflow');
      }
    }
    
    return () => {
      document.body.style.removeProperty('overflow');
    };
  }, [isMobileOpen]);

  // Sidebar position vars
  const sidebarStyles = isDesktop ? {
    '--sidebar-y-pct': `${cursorY}%`,
  } as React.CSSProperties : {};

  return (
    <div 
      className={`sidebar-shell ${isMobileOpen ? "is-mobile-open" : ""}`}
      onMouseEnter={() => setIsHoveringSidebar(true)}
      onMouseLeave={() => setIsHoveringSidebar(false)}
      style={sidebarStyles}
    >
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
