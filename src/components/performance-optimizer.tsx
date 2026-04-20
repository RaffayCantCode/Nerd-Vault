"use client";

import { useEffect } from "react";
import { initializePerformanceOptimizer } from "@/lib/performance-optimizer";

export function PerformanceOptimizer() {
  useEffect(() => {
    // Initialize performance optimizer on client side only
    const optimizer = initializePerformanceOptimizer();
    
    // Log performance info for debugging
    const perfInfo = optimizer.getPerformanceInfo();
    console.log("Performance Info:", perfInfo);
    
    // Add performance class to document
    if (perfInfo.performanceMode) {
      document.documentElement.classList.add('performance-mode');
    }
  }, []);

  return null; // This component doesn't render anything
}
