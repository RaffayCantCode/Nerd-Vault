export type UnifiedMedia = {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  type: "Movie" | "Series" | "Anime" | "Game";
  year: string;
  releaseDate?: string;
  rating: string; // e.g. "4.3" (out of 5)
  genre: string;
  genres: string[];
  poster: string;
  backdrop?: string;
  overview: string;
  runtime?: string;
  airingStatus?: "Completed" | "Ongoing" | "Upcoming" | string;
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
  highlightTag?: string;
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
  if (val === undefined || val === null || val === "") return "4";
  const num = Number(val);
  if (isNaN(num) || num <= 0) return "4";
  let normalized = num;
  if (normalized > 10) {
    normalized = normalized / 20;
  } else if (normalized > 5) {
    normalized = normalized / 2;
  }
  return String(Math.min(5, Math.max(1, Math.round(normalized))));
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
