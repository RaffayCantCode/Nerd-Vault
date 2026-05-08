import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NerdVault",
    short_name: "NerdVault",
    description: "Your vault for games, film, TV, and anime—track what lands, wishlist what's next.",
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
