"use client";

import Link from "next/link";
import { Heart, X } from "lucide-react";

type AuthRequiredModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  redirectTo?: string;
  ctaLabel?: string;
  onClose: () => void;
};

export function AuthRequiredModal({
  isOpen,
  title,
  message,
  redirectTo,
  ctaLabel = "Log In / Sign Up",
  onClose,
}: AuthRequiredModalProps) {
  if (!isOpen) {
    return null;
  }

  const href = redirectTo ? `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}` : "/sign-in";

  return (
    <div className="sidebar-modal-shell auth-required-overlay" onClick={onClose} role="presentation">
      <div
        className="sidebar-folder-modal glass auth-required-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-required-title"
        aria-describedby="auth-required-message"
      >
        <button type="button" className="topbar-panel-close auth-required-close" onClick={onClose} aria-label="Close authentication prompt">
          <X size={18} />
        </button>
        <div className="auth-required-icon" aria-hidden="true">
          <Heart size={22} />
        </div>
        <div className="auth-required-copy">
          <p className="eyebrow">Authentication required</p>
          <h2 id="auth-required-title" className="headline auth-required-title">
            {title}
          </h2>
          <p id="auth-required-message" className="copy">
            {message}
          </p>
        </div>
        <div className="button-row auth-required-actions">
          <Link href={href} className="button button-primary">
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
