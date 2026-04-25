"use client";

import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { ActionFeedbackContainer } from "@/components/action-feedback";
import { AuthCookieReset } from "@/components/auth-cookie-reset";
import { PageLoadingOverlay } from "@/components/page-loading-overlay";
import { PageTransitionProvider, usePageTransition } from "@/components/page-transition-provider";
import { PerformanceOptimizer } from "@/components/performance-optimizer";
import { RoutePrefetcher } from "@/components/route-prefetcher";
import "./globals.css";

// Metadata needs to be exported from a Server Component
// We'll define it separately
export const metadata: Metadata = {
  title: {
    default: "NerdVault",
    template: "%s · NerdVault",
  },
  description:
    "Your vault for games, film, TV, and anime—track what lands, wishlist what's next, smart folders like playlists, and discovery that feels curated.",
  keywords: [
    "media tracker",
    "anime list",
    "game backlog",
    "movie watchlist",
    "TV tracker",
    "NerdVault",
  ],
  openGraph: {
    title: "NerdVault",
    description:
      "One vault for everything you watch and play. Folders, detail pages, and browse tuned for taste—not noise.",
    type: "website",
    locale: "en_US",
    siteName: "NerdVault",
  },
  twitter: {
    card: "summary_large_image",
    title: "NerdVault",
    description: "Log what hit. Save what calls next.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060911" },
    { media: "(prefers-color-scheme: light)", color: "#060911" },
  ],
  colorScheme: "dark",
};

const brandFont = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${brandFont.variable}`} style={{ ["--font-display" as string]: "var(--font-sans)" }}>
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
    </html>
  );
}
