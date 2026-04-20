"use client";

import dynamic from "next/dynamic";

// Import the client component dynamically to avoid SSR issues
const HomeHubPageClient = dynamic(() => import("./page-client"), {
  ssr: false,
  loading: () => (
    <div className="page-shell home-page">
      <div className="app-shell-layout home-layout">
        <main className="workspace home-workspace">
          <section className="route-loading glass" style={{ minHeight: '50vh' }}>
            <div className="nv-loader">
              <div className="nv-loader-mark">
                <div className="nv-loader-ring nv-loader-ring-outer"></div>
                <div className="nv-loader-ring nv-loader-ring-inner"></div>
                <span className="nv-loader-glyph">NV</span>
              </div>
              <p className="nv-loader-label">Loading...</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  ),
});

export default HomeHubPageClient;
