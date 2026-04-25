"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { readBrowseReturnContext, readDetailReturnTarget } from "@/lib/detail-return";

const BROWSE_LAST_URL_KEY = "nerdvault-browse-last-url";

export function DetailBackButton({ className }: { className?: string }) {
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

  useEffect(() => {
    router.prefetch(targetHref);
  }, [router, targetHref]);

  return (
    <button
      type="button"
      className={`button button-secondary detail-back-button ${className ?? ""}`.trim()}
      onClick={() => {
        router.push(targetHref, { scroll: false });
      }}
    >
      {targetLabel}
    </button>
  );
}
