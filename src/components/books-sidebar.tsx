"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BookTheme } from "@/lib/book-types";
import { writeBookTheme } from "@/lib/book-client";

function Glyph({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const iconPaths = {
  library: "M4.5 6.5h15M7 4.5v15m5-13v13m5-11v11M5.5 19.5H18",
  landing: "M4.5 10.5 12 4l7.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19z",
  book: "M6 5.5A2.5 2.5 0 0 1 8.5 3H19v16H8.5A2.5 2.5 0 0 0 6 21.5zm0 0v-16",
  wishlist: "M12 20 4.8 12.9a4.7 4.7 0 0 1 6.7-6.6L12 6.8l.5-.5a4.7 4.7 0 0 1 6.7 6.6Z",
  theme: "M12 3.5a8.5 8.5 0 1 0 8.5 8.5A6.5 6.5 0 1 1 12 3.5Z",
};

export function BooksSidebar({
  theme,
  active,
  currentBookTitle,
}: {
  theme: BookTheme;
  active: "library" | "wishlist" | "detail" | "reader";
  currentBookTitle?: string;
}) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 980) {
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
    if (typeof window === "undefined" || window.innerWidth > 980) {
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
      if (window.innerWidth > 980 || !toggleRef.current) {
        return;
      }

      const clamped = Math.max(84, Math.min(window.innerHeight - 84, clientY));
      toggleRef.current.style.setProperty("--books-sidebar-toggle-y", `${clamped}px`);
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
    <div className={`books-sidebar-shell books-sidebar-shell-fixed ${isMobileOpen ? "is-mobile-open" : ""}`}>
      <button
        ref={toggleRef}
        type="button"
        className="books-sidebar-mobile-toggle books-sidebar-mobile-toggle-fixed"
        aria-label={isMobileOpen ? "Close books sidebar" : "Open books sidebar"}
        aria-expanded={isMobileOpen}
        onClick={() => setIsMobileOpen((current) => !current)}
        style={{ top: "var(--books-sidebar-toggle-y, 50vh)" }}
      >
        <span className="books-sidebar-mobile-arrow">{isMobileOpen ? "<" : ">"}</span>
      </button>
      <div className="books-sidebar-mobile-backdrop books-sidebar-mobile-backdrop-fixed" aria-hidden={!isMobileOpen} onClick={() => setIsMobileOpen(false)} />

      <aside className="books-sidebar books-sidebar-rich books-sidebar-panel">
        <Link href="/books" className="books-brand" aria-label="Open books library">
          <span className="books-brand-mark">NV</span>
        </Link>

        <div className="books-sidebar-stack">
          <Link href="/books" className={`books-sidebar-link books-sidebar-link-rich ${active === "library" ? "is-active" : ""}`}>
            <Glyph path={iconPaths.library} />
            <span>Library</span>
          </Link>
          <Link href="/books/wishlist" className={`books-sidebar-link books-sidebar-link-rich ${active === "wishlist" ? "is-active" : ""}`}>
            <Glyph path={iconPaths.wishlist} />
            <span>Wishlist</span>
          </Link>
          {active === "detail" || active === "reader" ? (
            <div className="books-sidebar-link books-sidebar-link-rich is-active">
              <Glyph path={iconPaths.book} />
              <span>{active === "reader" ? "Reader" : "Book view"}</span>
            </div>
          ) : null}
          <Link href="/" className="books-sidebar-link books-sidebar-link-rich">
            <Glyph path={iconPaths.landing} />
            <span>Landing</span>
          </Link>
          <button type="button" className="books-theme-toggle books-sidebar-link-rich" onClick={() => writeBookTheme(theme === "dark" ? "light" : "dark")}>
            <Glyph path={iconPaths.theme} />
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>

        <div className="books-sidebar-bottom">
          <div className="books-sidebar-status">
            <strong>{active === "reader" ? "Reader live" : "Stories space"}</strong>
            <span>{currentBookTitle || "Project Gutenberg books only"}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
