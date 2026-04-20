"use client";

import { useState, useEffect } from "react";
import { NVLoader } from "@/components/nv-loader";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { HomeWorkspace } from "@/components/home-workspace";

export default function HomeInstantPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [feed, setFeed] = useState<any>(null);

  useEffect(() => {
    async function loadHomeData() {
      try {
        // Check authentication first
        const authResponse = await fetch('/api/auth/me');
        if (!authResponse.ok) {
          setError("Please log in to access your home page");
          setIsLoading(false);
          return;
        }
        
        const sessionData = await authResponse.json();
        setSession(sessionData);

        // Load home feed
        const feedResponse = await fetch('/api/home-feed');
        if (!feedResponse.ok) {
          setError("Failed to load home feed");
          setIsLoading(false);
          return;
        }
        
        const feedData = await feedResponse.json();
        setFeed(feedData);
        setIsLoading(false);
      } catch (err) {
        setError("Something went wrong loading your home page");
        setIsLoading(false);
      }
    }

    loadHomeData();
  }, []);

  // Show loading state while checking authentication
  if (isLoading && !session) {
    return (
      <div className="page-shell home-page">
        <div className="app-shell-layout home-layout">
          <main className="workspace home-workspace">
            <section className="route-loading glass" style={{ minHeight: '100vh' }}>
              <div className="nv-loader">
                <div className="nv-loader-mark">
                  <div className="nv-loader-ring nv-loader-ring-outer"></div>
                  <div className="nv-loader-ring nv-loader-ring-inner"></div>
                  <span className="nv-loader-glyph">NV</span>
                </div>
                <p className="nv-loader-label">Loading your home...</p>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="page-shell home-page">
        <div className="app-shell-layout home-layout">
          <main className="workspace home-workspace">
            <section className="route-loading glass" style={{ minHeight: '100vh' }}>
              <div className="nv-loader">
                <div className="nv-loader-mark">
                  <div className="nv-loader-ring nv-loader-ring-outer"></div>
                  <div className="nv-loader-ring nv-loader-ring-inner"></div>
                  <span className="nv-loader-glyph">NV</span>
                </div>
                <p className="nv-loader-label">{error}</p>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  // Show loading state while data loads (after auth check)
  if (isLoading || !feed) {
    return (
      <div className="page-shell home-page">
        <div className="app-shell-layout home-layout">
          <AppSidebar active="home" />
          <main className="workspace home-workspace">
            <AppTopBar 
              viewerId={session?.id || "guest"} 
              viewerName={session?.name || "Guest"} 
              viewerAvatar={session?.image}
            />
            <section className="route-loading glass" style={{ minHeight: '50vh' }}>
              <div className="nv-loader">
                <div className="nv-loader-mark">
                  <div className="nv-loader-ring nv-loader-ring-outer"></div>
                  <div className="nv-loader-ring nv-loader-ring-inner"></div>
                  <span className="nv-loader-glyph">NV</span>
                </div>
                <p className="nv-loader-label">Loading your personalized home...</p>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  // Show loaded content
  return (
    <div className="page-shell home-page">
      <div className="app-shell-layout home-layout">
        <AppSidebar active="home" />
        <main className="workspace home-workspace">
          <AppTopBar 
            viewerId={session?.id || "guest"} 
            viewerName={session?.name || "Guest"} 
            viewerAvatar={session?.image}
          />
          <HomeWorkspace viewerName={session?.name || "Guest"} feed={feed} />
        </main>
      </div>
    </div>
  );
}
