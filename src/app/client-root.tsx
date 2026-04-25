"use client";

import { ActionFeedbackContainer } from "@/components/action-feedback";
import { AuthCookieReset } from "@/components/auth-cookie-reset";
import { PageLoadingOverlay } from "@/components/page-loading-overlay";
import { PageTransitionProvider, usePageTransition } from "@/components/page-transition-provider";
import { PerformanceOptimizer } from "@/components/performance-optimizer";
import { RoutePrefetcher } from "@/components/route-prefetcher";

function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  const { isNavigating, navigationProgress } = usePageTransition();
  
  return (
    <>
      {/* Top Progress Bar */}
      {isNavigating && (
        <div className="top-progress-bar">
          <div 
            className="top-progress-bar-fill" 
            style={{ width: `${navigationProgress}%` }}
          />
        </div>
      )}
      
      {/* Full Page Loading Overlay for slower transitions */}
      <PageLoadingOverlay 
        isLoading={isNavigating && navigationProgress < 50}
        progress={navigationProgress}
        message="Loading your vault"
      />
      
      {children}
    </>
  );
}

export function ClientRoot({ 
  children,
  fontVariable 
}: { 
  children: React.ReactNode;
  fontVariable: string;
}) {
  return (
    <body className={`${fontVariable}`} style={{ ["--font-display" as string]: "var(--font-sans)" }}>
      <AuthCookieReset />
      <PerformanceOptimizer />
      <RoutePrefetcher />
      <PageTransitionProvider>
        <PageTransitionWrapper>
          {children}
        </PageTransitionWrapper>
      </PageTransitionProvider>
      <ActionFeedbackContainer />
    </body>
  );
}
