"use client";

import { Suspense } from "react";
import { ActionFeedbackContainer } from "@/components/action-feedback";
import { PerformanceOptimizer } from "@/components/performance-optimizer";
import { RoutePrefetcher } from "@/components/route-prefetcher";
import { ScrollManager } from "@/components/scroll-manager";

export function ClientRoot({ 
  children,
  fontVariable 
}: { 
  children: React.ReactNode;
  fontVariable: string;
}) {
  return (
    <body className={`${fontVariable}`} style={{ ["--font-display" as string]: "var(--font-sans)" }}>
      <ScrollManager />
      <PerformanceOptimizer />
      <RoutePrefetcher />
      <Suspense fallback={null}>{children}</Suspense>
      <ActionFeedbackContainer />
    </body>
  );
}
