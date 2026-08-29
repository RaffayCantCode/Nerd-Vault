"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOutUser } from "@/app/sign-in/sign-out-action";
import { BrandLogo } from "@/components/brand-logo";
import { BrowseResetLink } from "@/components/browse-reset-link";

export function SiteHeader({ initialSignedIn = false }: { initialSignedIn?: boolean }) {
  const [isSignedIn, setIsSignedIn] = useState(initialSignedIn);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.id) {
          setIsSignedIn(true);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
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
              Back to browse
            </BrowseResetLink>
            <Link href="/support" className="nav-link">
              Support
            </Link>
            <Link href="/home?tab=media" className="nav-link">
              Vault
            </Link>
            <form action={signOutUser}>
              <button type="submit" className="nav-link nav-link-button">
                Sign out
              </button>
            </form>
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
  );
}

