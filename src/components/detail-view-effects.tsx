"use client";

import { useEffect, useState } from "react";

export function DetailViewEffects() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });

    // Two-frame delay: first frame paints, second frame starts transition
    let raf1: number;
    let raf2: number;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setIsReady(true);
        // Add page-enter class to the workspace so content animates in
        const workspace = document.querySelector(".workspace");
        if (workspace) {
          workspace.classList.add("page-enter");
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, []);

  return <div className={`detail-view-fade ${isReady ? "is-ready" : ""}`} aria-hidden="true" />;
}
