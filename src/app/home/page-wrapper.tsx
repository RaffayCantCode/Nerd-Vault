"use client";

import dynamic from "next/dynamic";
import { RouteLoader } from "@/components/route-loader";

// Import the client component dynamically to avoid SSR issues
const HomeHubPageClient = dynamic(() => import("./page-client"), {
  ssr: false,
  loading: () => (
    <div className="page-shell home-page">
      <div className="app-shell-layout home-layout">
        <main className="workspace home-workspace">
          <RouteLoader label="Opening Home..." />
        </main>
      </div>
    </div>
  ),
});

export default HomeHubPageClient;
