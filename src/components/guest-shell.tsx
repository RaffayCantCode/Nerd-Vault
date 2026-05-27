"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { guestSignInHref } from "@/lib/guest";

export function GuestVaultShell({
  redirectTo = "/home",
  title = "Your vault unlocks after sign-in.",
  message = "Browse freely as a guest, then sign in to save watched titles, wishlists, folders, and your personalized feed.",
  eyebrow = "Vault",
}: {
  redirectTo?: string;
  title?: string;
  message?: string;
  eyebrow?: string;
}) {
  return (
    <section className="guest-vault-shell glass">
      <div className="guest-vault-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="headline">{title}</h1>
        <p className="copy">{message}</p>
      </div>
      <div className="button-row guest-vault-actions">
        <Link href={guestSignInHref(redirectTo)} className="button button-primary">
          Sign in
        </Link>
        <Link href="/browse" className="button button-secondary">
          Browse catalog
        </Link>
        <Link href="/support" className="button button-secondary">
          Support
        </Link>
      </div>
    </section>
  );
}

export function GuestActionLink({
  href,
  children,
  className = "button button-secondary",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
