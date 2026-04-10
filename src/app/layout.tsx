import type { Metadata } from "next";
import { Bebas_Neue, Manrope } from "next/font/google";
import { AuthCookieReset } from "@/components/auth-cookie-reset";
import "./globals.css";

const display = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "NerdVault",
  description:
    "A cinematic media vault for games, movies, anime, and series. Track what you finish, discover what is next, and build smart folders like playlists.",
  icons: {
    icon: [
      { url: "/logo1.png", sizes: "32x32", type: "image/png" },
      { url: "/logo1.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/logo1.png",
    apple: "/logo1.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>
        <AuthCookieReset />
        {children}
      </body>
    </html>
  );
}
