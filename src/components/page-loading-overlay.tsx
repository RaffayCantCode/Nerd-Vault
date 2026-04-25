"use client";

import { useEffect, useState } from "react";

interface PageLoadingOverlayProps {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

export function PageLoadingOverlay({ isLoading, progress = 0, message = "Loading..." }: PageLoadingOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      // Show overlay immediately when loading starts
      setIsVisible(true);
    } else {
      // Keep overlay visible for a moment to prevent flicker
      const timer = setTimeout(() => {
        setIsVisible(false);
        setDisplayProgress(0);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Smooth progress update
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setDisplayProgress(progress);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [progress, isLoading]);

  if (!isVisible) return null;

  return (
    <div className={`page-loading-overlay page-transition-overlay ${isLoading ? 'is-active' : 'is-exiting'}`}>
      <div className="page-loading-content page-transition-content">
        {/* Animated Logo/Icon */}
        <div className="page-loading-logo">
          <div className="vault-ring vault-ring-outer" />
          <div className="vault-ring vault-ring-middle" />
          <div className="vault-ring vault-ring-inner" />
          <span className="vault-text">NV</span>
        </div>
        
        {/* Progress Bar */}
        <div className="page-loading-progress-container">
          <div 
            className="page-loading-progress-bar"
            style={{ width: `${displayProgress}%` }}
          />
          <div className="page-loading-progress-glow" style={{ left: `${displayProgress}%` }} />
        </div>
        
        {/* Loading Text */}
        <div className="page-loading-text-container">
          <span className="page-loading-text">{message}</span>
          <span className="page-loading-dots">
            <span className="dot">.</span>
            <span className="dot">.</span>
            <span className="dot">.</span>
          </span>
        </div>
        
        {/* Progress Percentage */}
        <span className="page-loading-percentage">{Math.round(displayProgress)}%</span>
      </div>
      
      {/* Background Particles */}
      <div className="page-loading-particles" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="page-loading-particle" style={{ animationDelay: `${i * 0.5}s` }} />
        ))}
      </div>
    </div>
  );
}
