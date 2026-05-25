"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toggleMobileFolders } from "@/lib/mobile-nav-bridge";
import { guestSignInHref } from "@/lib/guest";

function DockIconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4.5 10.5 12 4l7.5 6.5V19A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.5 20.5v-7h5v7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function DockIconBrowse() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="m13.2 10.8 3.3-6-6 3.3-3.3 6 6-3.3Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
    </svg>
  );
}

function DockIconProfile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8.1" r="3.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.4 19.2a6.6 6.6 0 0 1 13.2 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function DockIconSupport() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4.75 12a7.25 7.25 0 0 1 14.5 0v3.8a2.45 2.45 0 0 1-2.45 2.45h-1.2a1.2 1.2 0 0 1-1.2-1.2v-3.3a1.2 1.2 0 0 1 1.2-1.2h2.35" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M4.75 12v3.8A2.45 2.45 0 0 0 7.2 18.25h1.2a1.2 1.2 0 0 0 1.2-1.2v-3.3a1.2 1.2 0 0 0-1.2-1.2H6.05" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <circle cx="12" cy="18.7" r="0.95" fill="currentColor" />
    </svg>
  );
}

function DockIconFolders() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3.8 7.7a1.7 1.7 0 0 1 1.7-1.7h4.2l1.45 1.6h7.35a1.7 1.7 0 0 1 1.7 1.7v6.95a1.7 1.7 0 0 1-1.7 1.7H5.5a1.7 1.7 0 0 1-1.7-1.7z" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
    </svg>
  );
}

const APP_ROUTE_PREFIXES = ["/home", "/browse", "/support", "/media/", "/profile/", "/books/"];

function FoldersDockButton({ foldersOpen, pathname }: { foldersOpen: boolean; pathname: string }) {
  const signInHref = guestSignInHref(pathname);

  return (
    <button
      type="button"
      className={`nv-mobile-dock-link ${foldersOpen ? "is-active" : ""}`}
      aria-label={foldersOpen ? "Close folders" : "Open folders"}
      aria-expanded={foldersOpen}
      onClick={() => {
        const needsSignIn = toggleMobileFolders();
        if (needsSignIn) {
          window.location.href = signInHref;
        }
      }}
    >
      <DockIconFolders />
      <span>Folders</span>
    </button>
  );
}

function shouldShowMobileDock(pathname: string) {
  if (pathname === "/" || pathname.startsWith("/sign-in") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password")) {
    return false;
  }

  return APP_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [foldersOpen, setFoldersOpen] = useState(false);

  const isDetailRoute = pathname.startsWith("/media/");
  const isHomeRoute = pathname === "/home";
  const isBrowseRoute = pathname.startsWith("/browse");
  const isProfileContext = pathname.startsWith("/profile") || (pathname === "/home" && searchParams.get("tab") === "media");
  const isSupportRoute = pathname.startsWith("/support");
  const visible = shouldShowMobileDock(pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleFoldersState(event: Event) {
      const detail = (event as CustomEvent<{ open: boolean }>).detail;
      if (typeof detail?.open === "boolean") {
        setFoldersOpen(detail.open);
      }
    }

    window.addEventListener("nv-folders-open", handleFoldersState);
    return () => window.removeEventListener("nv-folders-open", handleFoldersState);
  }, []);

  useEffect(() => {
    setFoldersOpen(false);
  }, [pathname, searchParams.toString()]);

  function jumpToSection(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!mounted || !visible) {
    return null;
  }

  return createPortal(
    <div className="nv-mobile-dock-wrap" aria-hidden={false}>
      {isDetailRoute ? (
        <div className="nv-mobile-section-dock glass" aria-label="Jump to detail sections">
          <button type="button" className="nv-mobile-section-chip" onClick={() => jumpToSection("detail-overview")}>
            Overview
          </button>
          <button type="button" className="nv-mobile-section-chip" onClick={() => jumpToSection("detail-visuals")}>
            Visuals
          </button>
          <button type="button" className="nv-mobile-section-chip" onClick={() => jumpToSection("detail-friends")}>
            Friends
          </button>
          <button type="button" className="nv-mobile-section-chip" onClick={() => jumpToSection("detail-related")}>
            Related
          </button>
        </div>
      ) : null}

      <nav className="nv-mobile-dock glass" aria-label="Primary mobile navigation">
        <Link href="/home" className={`nv-mobile-dock-link ${isHomeRoute ? "is-active" : ""}`} aria-label="Home">
          <DockIconHome />
          <span>Home</span>
        </Link>
        <Link href="/browse" className={`nv-mobile-dock-link ${isBrowseRoute ? "is-active" : ""}`} aria-label="Browse">
          <DockIconBrowse />
          <span>Browse</span>
        </Link>
        <FoldersDockButton foldersOpen={foldersOpen} pathname={pathname} />
        <Link href="/home?tab=media" className={`nv-mobile-dock-link ${isProfileContext ? "is-active" : ""}`} aria-label="Profile">
          <DockIconProfile />
          <span>Profile</span>
        </Link>
        <Link href="/support" className={`nv-mobile-dock-link ${isSupportRoute ? "is-active" : ""}`} aria-label="Support">
          <DockIconSupport />
          <span>Help</span>
        </Link>
      </nav>
    </div>,
    document.body,
  );
}
