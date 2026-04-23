"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { signInWithCredentials, signInWithGoogle } from "@/app/sign-in/actions";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { HomeWorkspace } from "@/components/home-workspace";
import { HomeScrollReset } from "@/components/home-scroll-reset";
import { HomeFeed } from "@/lib/home-feed";
import { LibraryState } from "@/lib/vault-types";
import { NVLoader } from "@/components/nv-loader";

// Client component for authenticated home page
function AuthenticatedHomeContent({
  viewerName,
  viewerId,
  viewerAvatar,
}: {
  viewerName: string;
  viewerId: string;
  viewerAvatar?: string;
}) {
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHomeFeed() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/home-feed");
        if (!response.ok) {
          throw new Error("Failed to load home feed");
        }
        const homeFeed = await response.json();
        setFeed(homeFeed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load home feed");
      } finally {
        setIsLoading(false);
      }
    }

    loadHomeFeed();
  }, []);

  if (isLoading) {
    return (
      <div className="page-shell home-page">
        <div className="app-shell-layout home-layout">
          <AppSidebar active="home" />
          <main className="workspace home-workspace">
            <HomeScrollReset />
            <AppTopBar viewerId={viewerId} viewerName={viewerName} viewerAvatar={viewerAvatar} />
            <section className="route-loading route-loading-full glass home-route-loading">
              <NVLoader label="Loading your personalized home..." />
            </section>
          </main>
        </div>
      </div>
    );
  }

  if (error || !feed) {
    return (
      <div className="page-shell home-page">
        <div className="app-shell-layout home-layout">
          <AppSidebar active="home" />
          <main className="workspace home-workspace">
            <HomeScrollReset />
            <AppTopBar viewerId={viewerId} viewerName={viewerName} viewerAvatar={viewerAvatar} />
            <section className="route-loading route-loading-full glass home-route-loading">
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <h2 className="headline" style={{ marginBottom: '1rem' }}>Unable to load home feed</h2>
                <p className="copy" style={{ marginBottom: '2rem' }}>{error || "Something went wrong"}</p>
                <Link href="/browse" className="button button-primary">
                  Browse Catalog
                </Link>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell home-page">
      <div className="app-shell-layout home-layout">
        <AppSidebar active="home" />
        <main className="workspace home-workspace">
          <HomeScrollReset />
          <AppTopBar viewerId={viewerId} viewerName={viewerName} viewerAvatar={viewerAvatar} />
          <HomeWorkspace viewerName={viewerName} feed={feed} />
        </main>
      </div>
    </div>
  );
}

// Client component for guest home page
function GuestHomeContent() {
  const googleReady = Boolean(
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID && process.env.NEXT_PUBLIC_AUTH_GOOGLE_SECRET,
  );

  return (
    <div className="page-shell home-page">
      <div className="app-shell-layout home-layout">
        <AppSidebar active="home" />
        <main className="workspace home-workspace">
          <AppTopBar viewerId="guest-vault" viewerName="Guest vault" />
          <section className="auth-screen">
            <div className="auth-screen-card glass" style={{ width: "min(100%, 1040px)" }}>
              <div className="auth-screen-copy">
                <p className="eyebrow">Home hub</p>
                <h1 className="headline">You can only open Home when you are logged in.</h1>
                <p className="copy">
                  Guest mode can browse the catalog, but Home depends on your watched list, wishlist, folders, and profile data.
                </p>
                <p className="copy">
                  Log in below to unlock your personal upcoming lane, recommendations, and saved vault activity.
                </p>
                <div className="button-row" style={{ marginTop: 18 }}>
                  <Link href="/browse" className="button button-secondary">
                    Back to browse
                  </Link>
                  <Link href="/sign-in?mode=signup" className="button button-primary">
                    Create account
                  </Link>
                </div>
              </div>
              <div className="auth-screen-panel glass">
                <div className="auth-panel-header">
                  <p className="eyebrow">Log in</p>
                  <h2 className="headline" style={{ margin: 0 }}>Open your vault</h2>
                </div>
                <form action={signInWithCredentials}>
                  <div className="auth-field">
                    <label htmlFor="home-login-email">Email</label>
                    <input id="home-login-email" name="email" type="email" placeholder="Your email" required autoComplete="email" />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="home-login-password">Password</label>
                    <input id="home-login-password" name="password" type="password" placeholder="Your password" required minLength={8} autoComplete="current-password" />
                  </div>
                  <button type="submit" className="button button-primary auth-submit-button">
                    Log in to your vault
                  </button>
                </form>
                <div className="auth-divider">
                  <span>or</span>
                </div>
                <form action={signInWithGoogle}>
                  <input type="hidden" name="redirectTo" value="/home" />
                  <button type="submit" className="button button-secondary auth-google-button" disabled={!googleReady}>
                    {googleReady ? "Continue with Google" : "Google sign-in not available"}
                  </button>
                </form>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

// Main client component that handles auth state
export default function HomeHubPageClient() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<{ id: string; name: string; image?: string } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    }

    checkAuth();
  }, []);

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="page-shell home-page">
        <div className="app-shell-layout home-layout">
          <AppSidebar active="home" />
          <main className="workspace home-workspace">
            <HomeScrollReset />
            <AppTopBar viewerId="guest-vault" viewerName="Loading..." />
            <section className="route-loading route-loading-full glass home-route-loading">
              <NVLoader label="Loading..." />
            </section>
          </main>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <AuthenticatedHomeContent
        viewerName={user.name}
        viewerId={user.id}
        viewerAvatar={user.image}
      />
    );
  }

  return <GuestHomeContent />;
}
