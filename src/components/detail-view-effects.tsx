"use client";

import { memo, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { scrollPageToTopSoon } from "@/lib/scroll-to-top";

export const DetailViewEffects = memo(function DetailViewEffects() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    scrollPageToTopSoon();

    const rafId = window.requestAnimationFrame(() => {
      setIsReady(true);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [pathname, searchKey]);

  return <div className={`detail-view-fade ${isReady ? "is-ready" : ""}`} aria-hidden="true" />;
});
