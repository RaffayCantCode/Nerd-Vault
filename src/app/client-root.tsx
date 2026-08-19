"use client";

import { Suspense } from "react";
import { ActionFeedbackContainer } from "@/components/action-feedback";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PerformanceOptimizer } from "@/components/performance-optimizer";
import { RoutePrefetcher } from "@/components/route-prefetcher";
import { ScrollManager } from "@/components/scroll-manager";

export function ClientRoot({ 
  children,
}: { 
  children: React.ReactNode;
}) {
  return (
    <body style={{ ["--font-display" as string]: "var(--font-sans)" }}>
      <Suspense fallback={null}>
        <ScrollManager />
      </Suspense>
      <PerformanceOptimizer />
      <RoutePrefetcher />
      <Suspense fallback={null}>{children}</Suspense>
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
      <ActionFeedbackContainer />
    </body>
  );
}
