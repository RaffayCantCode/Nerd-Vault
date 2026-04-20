"use client";

import { useEffect, useState } from "react";

interface PageLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export function PageLoadingOverlay({ isLoading, message = "Loading..." }: PageLoadingOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      // Show overlay immediately when loading starts
      setIsVisible(true);
    } else {
      // Keep overlay visible for a moment to prevent flicker
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!isVisible) return null;

  return (
    <div className={`page-loading-overlay ${isLoading ? 'is-active' : ''}`}>
      <div className="page-loading-content">
        <div className="page-loading-spinner"></div>
        <div className="page-loading-text">{message}</div>
      </div>
    </div>
  );
}
