"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { signOutUser } from "@/app/sign-in/sign-out-action";
import { BrandLogo } from "@/components/brand-logo";
import { BrowseResetLink } from "@/components/browse-reset-link";
import { LogOut, X } from "lucide-react";

export function SiteHeader({ initialSignedIn = false }: { initialSignedIn?: boolean }) {
  const [isSignedIn, setIsSignedIn] = useState(initialSignedIn);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.id) {
          setIsSignedIn(true);
        }
      })
      .catch(() => undefined);
  }, []);

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
      <header className="topbar glass">
        <Link href="/" className="brand">
          <BrandLogo className="brand-mark brand-mark-logo" priority />
          <span className="brand-copy">
            <strong>NerdVault</strong>
            <span>{isSignedIn ? "Pick up where you left off." : "Log what hit. Queue what calls next."}</span>
          </span>
        </Link>

        <nav className="nav">
          {isSignedIn ? (
            <>
              <BrowseResetLink className="nav-link">
                Browse
              </BrowseResetLink>
              <Link href="/support" className="nav-link">
                Support
              </Link>
              <Link href="/home?tab=media" className="nav-link">
                Vault
              </Link>
              <button
                type="button"
                className="nav-link nav-link-button"
                onClick={() => setConfirmOpen(true)}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <BrowseResetLink className="nav-link">
                Browse
              </BrowseResetLink>
              <Link href="/support" className="nav-link">
                Support
              </Link>
              <Link href="/home?tab=media" className="nav-link">
                Vault
              </Link>
              <Link href="/sign-in" className="nav-link">
                Sign in
              </Link>
            </>
          )}
        </nav>
      </header>
      {confirmModal}
    </>
  );
}
