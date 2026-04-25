"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface PageTransitionContextType {
  isNavigating: boolean;
  navigationProgress: number;
  startNavigation: () => void;
  endNavigation: () => void;
}

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(undefined);

export function usePageTransition() {
  const context = useContext(PageTransitionContext);
  if (!context) {
    throw new Error("usePageTransition must be used within PageTransitionProvider");
  }
  return context;
}

interface PageTransitionProviderProps {
  children: React.ReactNode;
}

export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationProgress, setNavigationProgress] = useState(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const completeTimeout = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    if (completeTimeout.current) {
      clearTimeout(completeTimeout.current);
      completeTimeout.current = null;
    }
  }, []);

  const startNavigation = useCallback(() => {
    clearTimers();
    setIsNavigating(true);
    setNavigationProgress(0);

    // Simulate progress
    let progress = 0;
    progressInterval.current = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 85) progress = 85; // Hold at 85% until complete
      setNavigationProgress(progress);
    }, 200);

    // Auto-complete after 3 seconds if not already done
    completeTimeout.current = setTimeout(() => {
      endNavigation();
    }, 3000);
  }, [clearTimers]);

  const endNavigation = useCallback(() => {
    clearTimers();
    setNavigationProgress(100);
    
    // Small delay before hiding to show 100%
    setTimeout(() => {
      setIsNavigating(false);
      setNavigationProgress(0);
    }, 400);
  }, [clearTimers]);

  // Watch for route changes
  useEffect(() => {
    // Route has changed, end navigation
    if (isNavigating) {
      endNavigation();
    }
  }, [pathname, searchParams, isNavigating, endNavigation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return (
    <PageTransitionContext.Provider
      value={{ isNavigating, navigationProgress, startNavigation, endNavigation }}
    >
      {children}
    </PageTransitionContext.Provider>
  );
}
