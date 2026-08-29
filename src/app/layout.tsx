import type { Metadata, Viewport } from "next";
import { ClientRoot } from "./client-root";
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/components.css";
import "../styles/admin.css";
import "../styles/detail.css";
import "../styles/landing.css";
import "../styles/support.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nerdvault.site"),
  manifest: "/manifest.webmanifest",
  title: {
    default: "NerdVault",
    template: "%s · NerdVault",
  },
  description:
    "Track, organize, and discover movies, TV shows, anime, and video games in one fast, polished vault.",
  icons: {
    icon: [
      { url: "/brand/logo-mark-clean.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/brand/logo-mark.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/brand/logo-mark.png", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NerdVault",
  },
  keywords: [
    "media tracker",
    "anime list",
    "game backlog",
    "movie watchlist",
    "TV tracker",
    "NerdVault",
    "nerdvault.site",
    "entertainment archive",
    "discover media",
    "track movies",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NerdVault | Your Universe of Entertainment",
    description:
      "One vault for everything you watch and play. Fast tracking, discovery, and social features tuned for taste, not noise.",
    url: "https://nerdvault.site",
    siteName: "NerdVault",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NerdVault | Your Universe of Entertainment",
    description: "Log what hit. Save what calls next. The platform for tracking everything you love.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060911" },
    { media: "(prefers-color-scheme: light)", color: "#060911" },
  ],
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      {/* Preconnect to image CDNs to reduce first-image latency. */}
      <head>
        <link rel="preconnect" href="https://s4.anilist.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://s4.anilist.co" />
        <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://images.igdb.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.igdb.com" />
      </head>
      <ClientRoot>
        {children}
      </ClientRoot>
    </html>
  );
}
