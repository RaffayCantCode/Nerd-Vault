"use client";

import { useRouter } from "next/navigation";

const BROWSE_LAST_URL_KEY = "nerdvault-browse-last-url";

export function DetailBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="button button-secondary detail-back-button"
      onClick={() => {
        const lastBrowseUrl = window.sessionStorage.getItem(BROWSE_LAST_URL_KEY);

        if (lastBrowseUrl) {
          router.push(lastBrowseUrl);
          return;
        }

        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push("/browse");
      }}
    >
      Back to browse
    </button>
  );
}
