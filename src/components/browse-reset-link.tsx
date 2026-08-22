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
  const resetBrowseState = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      // Clear the client-side browse page cache so stale pages don't bleed in.
      clearBrowseClientCache();

      // Clear all persisted browse session state.
      window.sessionStorage.removeItem(BROWSE_STATE_KEY);
      window.sessionStorage.removeItem(BROWSE_SCROLL_KEY);
      window.sessionStorage.removeItem(BROWSE_SEED_KEY);
      window.sessionStorage.removeItem(BROWSE_RETURN_CONTEXT_KEY);
    } catch {
      // ignore
    }
  }, []);

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
