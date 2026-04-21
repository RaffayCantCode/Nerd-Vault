"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const BROWSE_LAST_URL_KEY = "nerdvault-browse-last-url";

export function DetailBackButton({ className }: { className?: string }) {
  const router = useRouter();
  const fallbackBrowseUrl =
    typeof window !== "undefined" ? window.sessionStorage.getItem(BROWSE_LAST_URL_KEY) || "/browse" : "/browse";

  useEffect(() => {
    router.prefetch(fallbackBrowseUrl);
  }, [fallbackBrowseUrl, router]);

  return (
    <button
      type="button"
      className={`button button-secondary detail-back-button ${className ?? ""}`.trim()}
      onClick={() => {
        const lastBrowseUrl = window.sessionStorage.getItem(BROWSE_LAST_URL_KEY);
        const browseUrl = lastBrowseUrl || "/browse";
        router.push(browseUrl);
      }}
    >
      Back to browse
    </button>
  );
}
