"use client";

import { useEffect } from "react";

export function HomeScrollReset() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Home should never keep the page locked after mobile overlays.
    // Clear both body and html in case either was modified.
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("overflow-y");
    document.documentElement.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow-y");

    if (window.innerWidth >= 901) {
      document.body.style.setProperty("overflow-y", "auto");
      document.documentElement.style.setProperty("overflow-y", "auto");
    }
  }, []);

  return null;
}
