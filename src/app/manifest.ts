import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NerdVault",
    short_name: "NerdVault",
    description: "Track movies, shows, anime, games, and books in one fast vault.",
    start_url: "/",
    display: "standalone",
    background_color: "#060911",
    theme_color: "#060911",
    orientation: "portrait",
    icons: [
      { src: "/icon", sizes: "256x256", type: "image/png" },
      { src: "/icon", sizes: "512x512", type: "image/png" },
    ],
  };
}
