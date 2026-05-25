"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { scrollPageToTopSoon } from "@/lib/scroll-to-top";

export function ScrollManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    history.scrollRestoration = "manual";
  }, []);

  useEffect(() => {
    scrollPageToTopSoon();
  }, [pathname, searchKey]);

  return null;
}
