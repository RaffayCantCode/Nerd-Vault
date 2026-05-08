"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useCallback } from "react";
import { MouseEvent } from "react";

const BROWSE_SCROLL_KEY = "nerdvault-browse-scroll";
const BROWSE_STATE_KEY = "nerdvault-browse-state";
const BROWSE_LAST_URL_KEY = "nerdvault-browse-last-url";
const BROWSE_SEED_KEY = "nerdvault-browse-seed-v1";

export function BrowseResetLink({
  className,
  children,
  ariaLabel,
  title,
}: {
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  title?: string;
}) {
  const router = useRouter();

  const resetBrowseState = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    // Only handle if we can use sessionStorage
    if (typeof window === "undefined") {
      return;
    }
    
    try {
      // Clear browse state to ensure fresh landing
      window.sessionStorage.removeItem(BROWSE_STATE_KEY);
      window.sessionStorage.removeItem(BROWSE_SCROLL_KEY);
      window.sessionStorage.removeItem(BROWSE_SEED_KEY);
      window.sessionStorage.setItem(BROWSE_LAST_URL_KEY, "/browse");
      
      // Use router for smooth navigation
      event.preventDefault();
      router.push("/browse", { scroll: false });
    } catch {
      // If anything fails, let the default Link behavior handle it
      // (href="/browse" is still on the Link)
    }
  }, [router]);

  return (
    <Link 
      href="/browse" 
      className={className} 
      aria-label={ariaLabel} 
      title={title} 
      onClick={resetBrowseState}
    >
      {children}
    </Link>
  );
}
