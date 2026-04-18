"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const BROWSE_LAST_URL_KEY = "nerdvault-browse-last-url";

export function DetailBackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const fallbackBrowseUrl =
    typeof window !== "undefined" ? window.sessionStorage.getItem(BROWSE_LAST_URL_KEY) || "/browse" : "/browse";

  useEffect(() => {
    router.prefetch(fallbackBrowseUrl);
  }, [fallbackBrowseUrl, router]);

  return (
    <button
      type="button"
      className="button button-secondary detail-back-button"
      onClick={() => {
        const lastBrowseUrl = window.sessionStorage.getItem(BROWSE_LAST_URL_KEY);
        const browseUrl = lastBrowseUrl || "/browse";

        if (window.history.length > 1) {
          window.history.back();
          window.setTimeout(() => {
            if (window.location.pathname === pathname) {
              router.push(browseUrl);
            }
          }, 150);
          return;
        }

        router.push(browseUrl);
      }}
    >
      Back to browse
    </button>
  );
}
