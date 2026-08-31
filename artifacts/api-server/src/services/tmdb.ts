import { fetchWithCache } from "./cache";
import { UnifiedMedia, slugify, toFiveStarRating } from "./types";

const TMDB_API_KEY = process.env.TMDB_API_KEY || "e992852c2a6404df9d6218982f12c36e";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};

/**
 * Identify if a TMDB media item is actually Japanese Animation / Anime
 */
export function isAnimeItem(item: any): boolean {
  const genreIds: number[] = item.genre_ids || (item.genres ? item.genres.map((g: any) => g.id) : []);
  const hasAnimation = genreIds.includes(16) || item.genres?.some((g: any) => g.name === "Animation" || g.name === "Anime");
  const isJapanese = item.original_language === "ja" || item.origin_country?.includes("JP");
  return hasAnimation && isJapanese;
}

function formatMedia(item: any, defaultType: "Movie" | "Series"): UnifiedMedia {
  const isMovie = defaultType === "Movie";
  const itemIsAnime = isAnimeItem(item);
  const finalType: "Movie" | "Series" | "Anime" = itemIsAnime ? "Anime" : defaultType;

  const title = isMovie ? item.title || item.original_title : item.name || item.original_name;
  const year = (isMovie ? item.release_date : item.first_air_date || "")?.slice(0, 4) || "2024";
  let genres = item.genres
    ? item.genres.map((g: any) => g.name)
    : (item.genre_ids || []).map((id: number) => GENRE_MAP[id] || "Drama").filter(Boolean);

  if (itemIsAnime) {
    genres = ["Anime", ...genres.filter((g: string) => g !== "Animation")];
  }

  const rawRating = item.vote_average || 8.0;

  return {
    id: `tmdb-${finalType.toLowerCase()}-${item.id}`,
    slug: slugify(title || `media-${item.id}`),
    title: title || "Untitled",
    originalTitle: isMovie ? item.original_title : item.original_name,
    type: finalType,
    year,
    rating: toFiveStarRating(rawRating),
    genre: itemIsAnime ? "Anime" : (genres[0] || "Drama"),
    genres: genres.length > 0 ? genres : [itemIsAnime ? "Anime" : "Drama"],
    poster: item.poster_path ? `${IMG_BASE}${item.poster_path}` : "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdrop: item.backdrop_path ? `${BACKDROP_BASE}${item.backdrop_path}` : undefined,
    overview: item.overview || "No synopsis available.",
    source: "tmdb",
    sourceId: String(item.id),
  };
}

export const tmdbService = {
  async getTrendingMovies(page: number = 1): Promise<UnifiedMedia[]> {
    const url = `${BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&page=${page}`;
    const data = await fetchWithCache(url, 1000 * 60 * 15);
    return (data.results || [])
      .filter((m: any) => !isAnimeItem(m))
      .map((m: any) => formatMedia(m, "Movie"));
  },

  async getTrendingShows(page: number = 1): Promise<UnifiedMedia[]> {
    const url = `${BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&page=${page}`;
    const data = await fetchWithCache(url, 1000 * 60 * 15);
    return (data.results || [])
      .filter((m: any) => !isAnimeItem(m))
      .map((m: any) => formatMedia(m, "Series"));
  },

  async getTopRatedMovies(page: number = 1): Promise<UnifiedMedia[]> {
    const url = `${BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}&language=en-US`;
    const data = await fetchWithCache(url, 1000 * 60 * 30);
    return (data.results || [])
      .filter((m: any) => !isAnimeItem(m))
      .map((m: any) => formatMedia(m, "Movie"));
  },

  async getTopRatedShows(page: number = 1): Promise<UnifiedMedia[]> {
    const url = `${BASE_URL}/tv/top_rated?api_key=${TMDB_API_KEY}&page=${page}&language=en-US`;
    const data = await fetchWithCache(url, 1000 * 60 * 30);
    return (data.results || [])
      .filter((m: any) => !isAnimeItem(m))
      .map((m: any) => formatMedia(m, "Series"));
  },

  async getCultAndNiche(type: "Movie" | "Series", page: number = 1): Promise<UnifiedMedia[]> {
    const endpoint = type === "Series" ? "tv" : "movie";
    const genreIds = type === "Series" ? "10765,9648,18" : "878,14,9648,53";
    const url = `${BASE_URL}/discover/${endpoint}?api_key=${TMDB_API_KEY}&with_genres=${genreIds}&sort_by=vote_average.desc&vote_count.gte=250&page=${page}`;
    const data = await fetchWithCache(url, 1000 * 60 * 30);
    return (data.results || [])
      .filter((m: any) => !isAnimeItem(m))
      .map((m: any) => formatMedia(m, type));
  },

  async discover(params: { type?: "Movie" | "Series"; genreId?: number; sort?: string; page?: number }): Promise<UnifiedMedia[]> {
    const type = params.type === "Series" ? "tv" : "movie";
    const page = params.page || 1;
    let url = `${BASE_URL}/discover/${type}?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&vote_count.gte=60&page=${page}`;
    if (params.genreId) {
      url += `&with_genres=${params.genreId}`;
    }
    const data = await fetchWithCache(url, 1000 * 60 * 20);
    return (data.results || [])
      .filter((m: any) => !isAnimeItem(m))
      .map((m: any) => formatMedia(m, params.type === "Series" ? "Series" : "Movie"));
  },

  async search(query: string): Promise<UnifiedMedia[]> {
    if (!query.trim()) return [];
    const url = `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`;
    const data = await fetchWithCache(url, 1000 * 60 * 10);
    return (data.results || [])
      .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
      .map((item: any) => formatMedia(item, item.media_type === "movie" ? "Movie" : "Series"));
  },

  async getDetails(id: string, type: "Movie" | "Series" = "Movie"): Promise<UnifiedMedia | null> {
    const isMovie = type === "Movie";
    const endpoint = isMovie ? "movie" : "tv";
    const url = `${BASE_URL}/${endpoint}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,similar,recommendations`;

    try {
      const data = await fetchWithCache(url, 1000 * 60 * 60);
      const media = formatMedia(data, type);

      if (isMovie && data.runtime) {
        const hrs = Math.floor(data.runtime / 60);
        const mins = data.runtime % 60;
        media.runtime = `${hrs}h ${mins}m`;
      } else if (!isMovie && data.number_of_seasons) {
        media.runtime = `${data.number_of_seasons} Season${data.number_of_seasons > 1 ? "s" : ""} · ${data.number_of_episodes || 0} Episodes`;
      }

      if (data.credits) {
        const director = data.credits.crew?.find((c: any) => c.job === "Director" || c.department === "Directing");
        if (director) media.director = director.name;
        media.cast = (data.credits.cast || []).slice(0, 6).map((c: any) => c.name);
      }

      if (data.production_companies && data.production_companies.length > 0) {
        media.studio = data.production_companies.map((c: any) => c.name).slice(0, 2).join(" · ");
      }

      if (data.networks && data.networks.length > 0) {
        media.platform = data.networks.map((n: any) => n.name).join(", ");
      }

      if (data.videos && data.videos.results) {
        const trailer = data.videos.results.find((v: any) => v.type === "Trailer" && v.site === "YouTube");
        if (trailer) {
          media.trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
        }
      }

      // --- Franchise Section ---
      if (isMovie && data.belongs_to_collection) {
        try {
          const colUrl = `${BASE_URL}/collection/${data.belongs_to_collection.id}?api_key=${TMDB_API_KEY}`;
          const colData = await fetchWithCache(colUrl, 1000 * 60 * 60 * 24);
          if (colData && colData.parts && colData.parts.length > 0) {
            const parts = colData.parts
              .map((p: any) => formatMedia(p, "Movie"))
              .sort((a: UnifiedMedia, b: UnifiedMedia) => Number(a.year) - Number(b.year));

            media.franchise = {
              name: colData.name || data.belongs_to_collection.name || "Franchise Collection",
              items: parts,
            };
          }
        } catch {}
      }

      // --- More Like This (Similar & Recommendations) ---
      const recs = data.recommendations?.results || [];
      const sims = data.similar?.results || [];
      const combined = [...recs, ...sims];
      const seen = new Set<number>([Number(id)]);
      const similarItems: UnifiedMedia[] = [];

      for (const item of combined) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          similarItems.push(formatMedia(item, type));
          if (similarItems.length >= 12) break;
        }
      }

      media.similar = similarItems;
      return media;
    } catch {
      return null;
    }
  },
};
