"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { scrollPageToTopSoon } from "@/lib/scroll-to-top";

export function ScrollManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    history.scrollRestoration = "manual";
  }, []);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    // On first mount, do not force-scroll.
    if (previousPathname === null) {
      return;
    }

    const pathChanged = previousPathname !== pathname;

    // Browse updates URL query params (page/sort/filter/search) without route
    // navigation, so do not global-scroll to top on those in-page state changes.
    if (!pathChanged && pathname === "/browse") {
      return;
    }

    scrollPageToTopSoon();
  }, [pathname, searchKey]);

  return null;
}
