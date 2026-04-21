"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function SidebarShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const searchKey = searchParams.toString();
  const toggleRef = useRef<HTMLButtonElement>(null);

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

    function setHandlePosition(clientY: number) {
      if (window.innerWidth > 900 || !toggleRef.current) {
        return;
      }

      const clamped = Math.max(84, Math.min(window.innerHeight - 84, clientY));
      toggleRef.current.style.setProperty("--sidebar-toggle-y", `${clamped}px`);
    }

    function syncHandleToViewport() {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }

      rafId = window.requestAnimationFrame(() => {
        setHandlePosition(window.innerHeight / 2);
      });
    }

    function handlePointerMove(event: PointerEvent) {
      setHandlePosition(event.clientY);
    }

    function handleTouchMove(event: TouchEvent) {
      const touch = event.touches[0];
      if (touch) {
        setHandlePosition(touch.clientY);
      }
    }

    syncHandleToViewport();
    window.addEventListener("scroll", syncHandleToViewport, { passive: true });
    window.addEventListener("resize", syncHandleToViewport, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", syncHandleToViewport);
      window.removeEventListener("resize", syncHandleToViewport);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return (
    <div className={`sidebar-shell ${isMobileOpen ? "is-mobile-open" : ""}`}>
      <button
        ref={toggleRef}
        type="button"
        className="sidebar-mobile-toggle glass"
        aria-label={isMobileOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={isMobileOpen}
        onClick={() => setIsMobileOpen((current) => !current)}
        style={{ top: "var(--sidebar-toggle-y, 50vh)" }}
      >
        <span className="sidebar-mobile-toggle-arrow">{isMobileOpen ? "<" : ">"}</span>
      </button>
      <div className="sidebar-mobile-backdrop" aria-hidden={!isMobileOpen} onClick={() => setIsMobileOpen(false)} />
      {children}
    </div>
  );
}
