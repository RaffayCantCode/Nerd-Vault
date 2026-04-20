import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Manrope } from "next/font/google";
import { AuthCookieReset } from "@/components/auth-cookie-reset";
import { PerformanceOptimizer } from "@/components/performance-optimizer";
import "./globals.css";
import "./ui-fixes.css";
import "./sidebar-fixes.css";

const display = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060911" },
    { media: "(prefers-color-scheme: light)", color: "#060911" },
  ],
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: {
    default: "NerdVault",
    template: "%s · NerdVault",
  },
  description:
    "Your vault for games, film, TV, and anime—track what lands, wishlist what’s next, smart folders like playlists, and discovery that feels curated.",
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>
        <AuthCookieReset />
        <PerformanceOptimizer />
        {children}
      </body>
    </html>
  );
}
