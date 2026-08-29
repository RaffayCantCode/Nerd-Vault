"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { readBrowseReturnContext, readDetailReturnTarget } from "@/lib/detail-return";

const BROWSE_LAST_URL_KEY = "nerdvault-browse-last-url";

export function DetailBackButton({ className = "modern-btn-secondary" }: { className?: string }) {
  const router = useRouter();
  const fallbackBrowseUrl = typeof window !== "undefined" ? window.sessionStorage.getItem(BROWSE_LAST_URL_KEY) || "/browse" : "/browse";
  const browseReturnContext = useMemo(
    () => (typeof window !== "undefined" ? readBrowseReturnContext() : null),
    [],
  );
  const returnTarget = useMemo(
    () => (typeof window !== "undefined" ? readDetailReturnTarget() : null),
    [],
  );
  const targetHref = browseReturnContext?.href || returnTarget?.href || fallbackBrowseUrl;
  const targetLabel = returnTarget?.label || "Back to browse";

  return (
    <button
      type="button"
      className={`detail-back-button ${className ?? ""}`.trim()}
      onClick={() => {
        if (typeof window !== "undefined") {
          const referrer = document.referrer || "";
          const sameOrigin = referrer.startsWith(window.location.origin);
          const fromBrowse = sameOrigin && new URL(referrer).pathname.startsWith("/browse");
          if (fromBrowse && window.history.length > 1) {
            router.back();
            return;
          }
        }
        router.push(targetHref, { scroll: false });
      }}
    >
      <span className="modern-btn-label">{targetLabel}</span>
    </button>
  );
}
