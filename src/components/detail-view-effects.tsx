"use client";

import { useEffect, useState } from "react";

export function DetailViewEffects() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    const frame = window.requestAnimationFrame(() => setIsReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return <div className={`detail-view-fade ${isReady ? "is-ready" : ""}`} aria-hidden="true" />;
}
