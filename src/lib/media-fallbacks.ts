import { MediaItem } from "@/lib/types";

export function getMediaFallbackImage(item: Pick<MediaItem, "type">) {
  switch (item.type) {
    case "anime":
    case "anime_movie":
      return "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=900&q=80";
    case "game":
      return "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80";
    case "show":
      return "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80";
    default:
      return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80";
  }
}
