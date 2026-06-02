"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useCallback } from "react";
import { MouseEvent } from "react";
import { clearBrowseClientCache } from "@/components/browse-workspace";

const BROWSE_SCROLL_KEY = "nerdvault-browse-scroll";
const BROWSE_STATE_KEY = "nerdvault-browse-state";
const BROWSE_LAST_URL_KEY = "nerdvault-browse-last-url";
const BROWSE_SEED_KEY = "nerdvault-browse-seed-v1";
const BROWSE_RETURN_CONTEXT_KEY = "nerdvault-browse-return-context";

/** Generate a fresh discovery seed so content is genuinely different every time
 *  the sidebar Browse button is pressed. */
function generateFreshSeed() {
  return Date.now();
}

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
    if (typeof window === "undefined") {
      return;
    }

    try {
      event.preventDefault();

      // Clear the client-side browse page cache so stale pages don't bleed in.
      clearBrowseClientCache();

      // Clear all persisted browse session state.
      window.sessionStorage.removeItem(BROWSE_STATE_KEY);
      window.sessionStorage.removeItem(BROWSE_SCROLL_KEY);
      window.sessionStorage.removeItem(BROWSE_SEED_KEY);
      window.sessionStorage.removeItem(BROWSE_RETURN_CONTEXT_KEY);

      // Generate a fresh seed and navigate — this forces a new server render
      // with completely different discovery content (new Now Surfacing + new grid).
      const freshSeed = generateFreshSeed();
      const freshUrl = `/browse?seed=${freshSeed}`;
      window.sessionStorage.setItem(BROWSE_LAST_URL_KEY, freshUrl);
      router.push(freshUrl, { scroll: true });
    } catch {
      // If anything fails, let the default Link href handle navigation.
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
