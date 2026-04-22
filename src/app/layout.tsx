import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { AuthCookieReset } from "@/components/auth-cookie-reset";
import { PerformanceOptimizer } from "@/components/performance-optimizer";
import "./globals.css";

const brandFont = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
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
      <body className={`${brandFont.variable}`} style={{ ["--font-display" as string]: "var(--font-sans)" }}>
        <AuthCookieReset />
        <PerformanceOptimizer />
        {children}
      </body>
    </html>
  );
}
