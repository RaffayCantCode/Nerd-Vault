"use client";

import { Suspense } from "react";
import { ActionFeedbackContainer } from "@/components/action-feedback";
import { PerformanceOptimizer } from "@/components/performance-optimizer";
import { RoutePrefetcher } from "@/components/route-prefetcher";

export function ClientRoot({ 
  children,
  fontVariable 
}: { 
  children: React.ReactNode;
  fontVariable: string;
}) {
  return (
    <body className={`${fontVariable}`} style={{ ["--font-display" as string]: "var(--font-sans)" }}>
      <PerformanceOptimizer />
      <RoutePrefetcher />
      <Suspense fallback={null}>{children}</Suspense>
      <ActionFeedbackContainer />
    </body>
  );
}
