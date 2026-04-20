"use client";

import { ReactNode, useEffect, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function SidebarShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [togglePosition, setTogglePosition] = useState(50); // percentage from top
  const [cursorY, setCursorY] = useState(0); // For sidebar follow effect
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

  useEffect(() => {
    if (!isDesktop) return;

    function handleMouseMove(e: MouseEvent) {
      // Calculate cursor Y position relative to viewport height as a percentage
      const yPercent = (e.clientY / window.innerHeight) * 100;
      setCursorY(yPercent);
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isDesktop]);

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
  // Throttled to prevent scroll glitch/jank
  const handleScroll = useCallback(() => {
    if (typeof window === "undefined") return;
    
    // Using requestAnimationFrame for smoother performance and less main thread blocking
    window.requestAnimationFrame(() => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const scrollableDistance = docHeight - windowHeight;
      
      if (scrollableDistance <= 0) {
        setTogglePosition(50);
        return;
      }
      
      // Calculate position as percentage (15% to 85% range)
      const scrollPercent = scrollTop / scrollableDistance;
      const clampedPercent = Math.max(15, Math.min(85, scrollPercent * 70 + 15));
      
      setTogglePosition(clampedPercent);
    });
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
        // Use a more robust way to lock scroll that doesn't cause glitches
        document.body.style.setProperty('overflow', 'hidden', 'important');
      } else {
        document.body.classList.remove("sidebar-open");
        document.body.style.removeProperty('overflow');
      }
    }
    
    return () => {
      document.body.classList.remove("sidebar-open");
      document.body.style.removeProperty('overflow');
    };
  }, [isMobileOpen]);

  // Sidebar follow cursor effect for desktop
  // We calculate the position based on the cursor's Y percentage in the viewport.
  // This allows the sidebar to "travel" the left side of the page.
  const sidebarFollowVars = isDesktop ? {
    '--cursor-y-pct': `${cursorY}%`,
  } as React.CSSProperties : {};

  return (
    <div 
      className={`sidebar-shell ${isMobileOpen ? "is-mobile-open" : ""}`}
      style={sidebarFollowVars}
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
