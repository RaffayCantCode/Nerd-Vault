"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { signOutUser } from "@/app/sign-in/sign-out-action";
import { BrandLogo } from "@/components/brand-logo";
import { BrowseResetLink } from "@/components/browse-reset-link";
import { SidebarShell } from "@/components/sidebar-shell";
import { LogOut, X } from "lucide-react";

function IconHome() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 10.5 12 4l7.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path d="M9.5 20.5v-7h5v7" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function IconLanding() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 10.5 12 4l7.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path d="M8.5 20.5v-5.75h7v5.75" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function IconCompass() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.65" />
      <path
        d="m13.2 10.8 3.3-6-6 3.3-3.3 6 6-3.3Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12h4l3 8 4-16 3 8h4" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPeople() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.65" />
      <circle cx="17" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.65" />
      <path d="M3 19.5c0-3.5 2.5-6 6-6s6 2.5 6 6" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M15 18c0-2.5 2-4 4-4s4 1.5 4 4" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function IconDoor() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 4h7v16h-7" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
      <path d="M7 8v8" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <circle cx="14.5" cy="12" r="0.9" fill="currentColor" />
    </svg>
  );
}

function IconLeave() {
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 4.75H6.75A1.75 1.75 0 0 0 5 6.5v11a1.75 1.75 0 0 0 1.75 1.75H9" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M13.25 8.25 18 12l-4.75 3.75" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.75 12H9.5" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

type AppSidebarProps = {
  active: "vault" | "browse" | "activity" | "friends";
  redirectTo?: string;
  userName?: string | null;
  isSignedIn?: boolean;
};

export function AppSidebar({ active, redirectTo = "/home", userName: initialUserName, isSignedIn: initialSignedIn }: AppSidebarProps) {
  const [userName, setUserName] = useState<string | null>(initialUserName ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (initialUserName !== undefined) {
      setUserName(initialUserName);
      return;
    }
    if (initialSignedIn) {
      setUserName("User");
      return;
    }
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.name) {
          setUserName(data.user.name);
        }
      })
      .catch(() => undefined);
  }, [initialSignedIn, initialUserName]);

  const shouldShowSignOut = Boolean(userName) || Boolean(initialSignedIn);

  const confirmModal = confirmOpen && mounted && typeof document !== "undefined" ? createPortal(
    <div className="nv-confirm-modal-overlay" onClick={() => setConfirmOpen(false)} role="dialog" aria-modal="true">
      <div className="nv-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="nv-confirm-modal-title">Sign Out</h3>
          <button
            type="button"
            className="taste-search-close"
            onClick={() => setConfirmOpen(false)}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <p className="nv-confirm-modal-copy">
          Are you sure you want to sign out of your NerdVault account?
        </p>
        <div className="nv-confirm-modal-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setConfirmOpen(false)}
          >
            Cancel
          </button>
          <form action={signOutUser} style={{ flex: 1 }}>
            <button
              type="submit"
              className="button button-primary"
              style={{ width: "100%", background: "#ef4444", borderColor: "#ef4444" }}
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <SidebarShell>
        <aside className="sidebar sidebar-rail nv-sidebar-panel glass">
          <Link href="/" className="brand brand-rail" aria-label="NerdVault home" title="NerdVault">
            <BrandLogo className="brand-mark brand-mark-logo" />
          </Link>

          <nav className="sidebar-rail-nav" aria-label="Primary navigation">
            <Link href="/" className="sidebar-nav-button" aria-label="Landing page" title="Landing page">
              <IconLanding />
              <span className="sidebar-nav-label">Landing</span>
            </Link>
            <Link
              href="/home"
              className={`sidebar-nav-button ${active === "vault" ? "is-active" : ""}`}
              aria-label="Vault"
              title="Vault"
            >
              <IconHome />
              <span className="sidebar-nav-label">Vault</span>
            </Link>
            <BrowseResetLink
              className={`sidebar-nav-button ${active === "browse" ? "is-active" : ""}`}
              aria-label="Browse catalog"
              title="Browse catalog"
            >
              <IconCompass />
              <span className="sidebar-nav-label">Browse</span>
            </BrowseResetLink>
            <Link
              href="/activity"
              className={`sidebar-nav-button ${active === "activity" ? "is-active" : ""}`}
              aria-label="Friend Activity"
              title="Friend Activity"
            >
              <IconActivity />
              <span className="sidebar-nav-label">Activity</span>
            </Link>
            <Link
              href="/friends"
              className={`sidebar-nav-button ${active === "friends" ? "is-active" : ""}`}
              aria-label="Friends"
              title="Friends"
            >
              <IconPeople />
              <span className="sidebar-nav-label">Friends</span>
            </Link>
          </nav>

          <div className="sidebar-rail-divider" />

          <div className="sidebar-rail-stack">
            {!shouldShowSignOut ? (
              <Link
                href={`/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`}
                className="sidebar-nav-button"
                aria-label="Sign in"
                title="Sign in"
                style={{ cursor: "pointer", zIndex: 10 }}
              >
                <IconDoor />
                <span className="sidebar-nav-label">Sign in</span>
              </Link>
            ) : (
              <button
                type="button"
                className="sidebar-nav-button sidebar-signout-button"
                onClick={() => setConfirmOpen(true)}
                aria-label="Sign out"
                title="Sign out"
              >
                <IconLeave />
                <span className="sidebar-nav-label">Sign out</span>
              </button>
            )}
          </div>
        </aside>
      </SidebarShell>
      {confirmModal}
    </>
  );
}
