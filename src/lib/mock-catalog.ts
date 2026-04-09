import { MediaItem } from "@/lib/types";

export const mockCatalog: MediaItem[] = [];

export const mockFolders: Array<{ name: string; itemCount: number }> = [];

export function getFeaturedMedia() {
  return mockCatalog[0];
}

export function getRecommendedMedia() {
  return mockCatalog.slice(0, 4);
}

export function getMediaBySlug(slug: string) {
  return mockCatalog.find((item) => item.slug === slug);
}

export function getRelatedMedia(media: MediaItem) {
  return mockCatalog.filter((item) => item.slug !== media.slug).slice(0, 4);
}
