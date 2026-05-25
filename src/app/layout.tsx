import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { ClientRoot } from "./client-root";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingTour } from "@/components/onboarding-tour";
import { AuthCookieReset } from "@/components/auth-cookie-reset";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nerdvault.site"),
  manifest: "/manifest.webmanifest",
  title: {
    default: "NerdVault",
    template: "%s · NerdVault",
  },
  description:
    "Your vault for games, film, TV, and anime - track what lands, wishlist what's next, smart folders like playlists, and discovery that feels curated.",
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
    "read stories",
    "project gutenberg",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NerdVault | Your Universe of Entertainment",
    description:
      "One vault for everything you watch and play. Folders, detail pages, and browse tuned for taste, not noise.",
    url: "https://nerdvault.site",
    siteName: "NerdVault",
    images: [
      {
        url: "/brand/logo-wordmark.png",
        width: 1024,
        height: 1024,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NerdVault | Your Universe of Entertainment",
    description: "Log what hit. Save what calls next. The ultimate platform for tracking everything you love.",
    images: ["/brand/logo-wordmark.png"],
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

const brandFont = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth().catch((error) => {
    console.error("Auth session failed to load in root layout:", error);
    return null;
  });
  let hasSeenOnboarding = true;

  if (session?.user?.id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { hasSeenOnboarding: true },
      });
      hasSeenOnboarding = user?.hasSeenOnboarding ?? false;
    } catch (e) {
      console.error("User onboarding status could not be checked:", e);
      hasSeenOnboarding = true;
    }
  }

  return (
    <html lang="en">
      <ClientRoot fontVariable={brandFont.variable}>
        <AuthCookieReset />
        {session?.user && !hasSeenOnboarding && <OnboardingTour hasSeenOnboarding={hasSeenOnboarding} />}
        {children}
      </ClientRoot>
    </html>
  );
}

