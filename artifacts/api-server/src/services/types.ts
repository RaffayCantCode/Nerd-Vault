export type UnifiedMedia = {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  type: "Movie" | "Series" | "Anime" | "Game";
  year: string;
  rating: string; // e.g. "4.3" (out of 5)
  genre: string;
  genres: string[];
  poster: string;
  backdrop?: string;
  overview: string;
  runtime?: string;
  director?: string;
  cast?: string[];
  platform?: string;
  studio?: string;
  trailerUrl?: string;
  audio?: string;
  status?: "Watching" | "Completed" | "Wishlist" | "Favorite" | "Dropped" | "Paused";
  progress?: number;
  userRating?: number; // 1 to 5
  notes?: string;
  source: "tmdb" | "anilist" | "igdb" | "local";
  sourceId: string;
  franchise?: {
    name: string;
    items: UnifiedMedia[];
  };
  similar?: UnifiedMedia[];
  curation?: "Trending" | "Popular" | "Niche";
};

export type HomeFeedData = {
  featured: UnifiedMedia;
  featuredSlides?: UnifiedMedia[];
  trendingMovies: UnifiedMedia[];
  trendingShows: UnifiedMedia[];
  topAnime: UnifiedMedia[];
  popularGames: UnifiedMedia[];
  weeklyDrop: UnifiedMedia[];
};

export type DiscoverOptions = {
  type?: string;
  genre?: string;
  sort?: string;
  query?: string;
  search?: string;
  mood?: string;
  page?: number;
  seed?: number | string;
  curation?: string;
};

export function toFiveStarRating(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "4.0";
  const num = Number(val);
  if (isNaN(num)) return "4.0";
  // If input is on 10-point scale (e.g. 8.6), convert to 5-point scale: 8.6 / 2 = 4.3
  const normalized = num > 5 ? num / 2 : num;
  return (Math.round(normalized * 10) / 10).toFixed(1);
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
