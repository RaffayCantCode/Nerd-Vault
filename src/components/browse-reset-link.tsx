"use client";

import Link from "next/link";
import { ReactNode } from "react";

const BROWSE_SCROLL_KEY = "nerdvault-browse-scroll";
const BROWSE_STATE_KEY = "nerdvault-browse-state";

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
  function resetBrowseState() {
    window.sessionStorage.removeItem(BROWSE_STATE_KEY);
    window.sessionStorage.removeItem(BROWSE_SCROLL_KEY);
  }

  return (
    <Link href="/browse" className={className} aria-label={ariaLabel} title={title} onClick={resetBrowseState}>
      {children}
    </Link>
  );
}
