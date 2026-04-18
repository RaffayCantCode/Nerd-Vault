"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const BROWSE_LAST_URL_KEY = "nerdvault-browse-last-url";

export function DetailBackButton() {
  const router = useRouter();
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
        const previousUrl = document.referrer ? new URL(document.referrer).pathname : "";

        if (previousUrl === "/browse") {
          window.history.back();
          return;
        }

        router.push(lastBrowseUrl || "/browse");
      }}
    >
      Back to browse
    </button>
  );
}
