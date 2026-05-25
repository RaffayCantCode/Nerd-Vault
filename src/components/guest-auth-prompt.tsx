"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { guestSignInHref } from "@/lib/guest";

type GuestAuthPromptProps = {
  isOpen: boolean;
  title?: string;
  message?: string;
  redirectTo?: string;
  onClose: () => void;
};

export function GuestAuthPrompt({
  isOpen,
  title = "Sign in required",
  message = "Create an account or sign in to use this feature.",
  redirectTo = "/home",
  onClose,
}: GuestAuthPromptProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) {
    return null;
  }

  return (
    <div className="guest-auth-overlay" onClick={onClose} role="presentation">
      <div
        className="guest-auth-modal glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-auth-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="topbar-panel-close guest-auth-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="eyebrow">Guest mode</p>
        <h2 id="guest-auth-title" className="headline guest-auth-title">
          {title}
        </h2>
        <p className="copy">{message}</p>
        <div className="button-row guest-auth-actions">
          <Link href={guestSignInHref(redirectTo)} className="button button-primary">
            Sign in
          </Link>
          <Link href={`/sign-in?mode=signup&redirectTo=${encodeURIComponent(redirectTo)}`} className="button button-secondary">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
