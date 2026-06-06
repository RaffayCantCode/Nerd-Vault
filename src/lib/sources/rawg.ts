"use server";

import { MediaItem } from "@/lib/types";
import {
  hasActiveBrowseGenre,
  itemMatchesGenre,
  resolveBrowseGenreForSource,
} from "@/lib/catalog-utils";
import {
  rankCandidatesForQuery,
  validateSearchResults,
} from "@/lib/search-utils";
import { getMediaFallbackImage } from "@/lib/media-fallbacks";

const RAWG_BASE = "https://api.rawg.io/api";
const RAWG_CACHE_TTL = 1000 * 60 * 30;
const rawgCache = new Map<string, { expiresAt: number; data: unknown }>();

function cacheGet<T>(key: string): T | null {
  const entry = rawgCache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    rawgCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function cacheSet(key: string, data: unknown) {
  rawgCache.set(key, { expiresAt: Date.now() + RAWG_CACHE_TTL, data });
}

function raygApiKey() {
  return process.env.RAWG_API_KEY || "";
}

function rawgImageUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("https://media.rawg.io")) return url;
  return null;
}

function parseReleaseYear(released?: string | null) {
  if (!released) return 0;
  const year = new Date(released).getUTCFullYear();
  return Number.isFinite(year) && year > 1900 ? year : 0;
}

function formatReleaseDate(released?: string | null) {
  return released && released.length >= 10 ? released.slice(0, 10) : undefined;
}

function normalizeRating(rating?: number) {
  const r = rating ?? 0;
  return Number((r * 2).toFixed(1));
}

type RawgGenre = { id: number; name: string; slug: string };
type RawgPlatform = { platform: { id: number; name: string; slug: string } };
type RawgDeveloper = { id: number; name: string; slug: string };
type RawgPublisher = { id: number; name: string; slug: string };
type RawgStore = { id: number; url: string; store: { id: number; name: string } };
type RawgTag = { id: number; name: string; slug: string; language: string };
type RawgScreenshot = { id: number; image: string; width: number; height: number; is_deleted: boolean };

type RawgGameResult = {
  id: number;
  slug: string;
  name: string;
  name_original?: string;
  description?: string;
  description_raw?: string;
  released?: string;
  tba?: boolean;
  background_image?: string;
  background_image_additional?: string;
  rating?: number;
  rating_top?: number;
  ratings_count?: number;
  reviews_count?: number;
  metacritic?: number;
  playtime?: number;
  updated?: string;
  genres?: RawgGenre[];
  platforms?: RawgPlatform[];
  developers?: RawgDeveloper[];
  publishers?: RawgPublisher[];
  stores?: RawgStore[];
  tags?: RawgTag[];
  esrb_rating?: { id: number; name: string; slug: string };
  parent_platforms?: { platform: { id: number; name: string; slug: string } }[];
  short_screenshots?: RawgScreenshot[];
  clip?: unknown;
};

type RawgListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: RawgGameResult[];
};

type RawgDetailResponse = RawgGameResult & {
  website?: string;
  reddit_url?: string;
  metacritic_url?: string;
  youtube_count?: number;
  movies_count?: number;
  screenshots_count?: number;
  additions_count?: number;
  game_series_count?: number;
  alternative_names?: string[];
};

type BrowsePayload = {
  page: number;
  totalPages: number;
  totalResults: number;
  items: MediaItem[];
};

const RAWG_SORT_MAP: Record<string, string> = {
  discovery: "-rating",
  newest: "-released",
  rating: "-rating",
  title: "name",
};

function mapRawgGame(item: RawgGameResult): MediaItem {
  const title = item.name || "Unknown Game";
  const year = parseReleaseYear(item.released);
  const backgroundImage = rawgImageUrl(item.background_image) || undefined;
  const additionalImage = rawgImageUrl(item.background_image_additional) ||
    rawgImageUrl(item.short_screenshots?.[0]?.image) || undefined;
  const screenshots = (item.short_screenshots ?? [])
    .map((s) => s.image)
    .filter(Boolean) as string[];

  const genreNames = (item.genres ?? []).map((g) => g.name).filter(Boolean);
  const platformNames = (item.platforms ?? [])
    .map((p) => p.platform?.name)
    .filter((n): n is string => Boolean(n));
  const developers = (item.developers ?? []).map((d) => d.name).filter(Boolean);
  const publishers = (item.publishers ?? []).map((p) => p.name).filter(Boolean);

  const credits: { name: string; role: string }[] = [];
  developers.forEach((name) => credits.push({ name, role: "developer" }));
  publishers.forEach((name) => credits.push({ name, role: "publisher" }));

  const allImages = [backgroundImage, additionalImage, ...screenshots].filter(
    (url): url is string => Boolean(url),
  );

  return {
    id: `rawg-game-${item.id}`,
    slug: item.slug || slugify(title),
    source: "rawg",
    sourceId: String(item.id),
    title,
    originalTitle: item.name_original || title,
    type: "game",
    year,
    rating: normalizeRating(item.rating),
    language: "en",
    genres: genreNames,
    coverUrl: backgroundImage || additionalImage || allImages[0] || getMediaFallbackImage({ type: "game" }),
    backdropUrl: additionalImage || backgroundImage || allImages[1] || allImages[0] || getMediaFallbackImage({ type: "game" }),
    screenshots: allImages,
    overview: item.description_raw || item.description?.replace(/<[^>]+>/g, "") || "No summary yet.",
    credits,
    details: {
      platform: platformNames.slice(0, 3).join(" · ") || "Platform data unavailable",
      studio: developers[0],
      releaseDate: formatReleaseDate(item.released),
      sourceLabel: "RAWG",
      sourceUrl: `https://rawg.io/games/${item.slug}`,
      status: year > new Date().getUTCFullYear() ? "Upcoming" : year > 0 ? "Released" : undefined,
    },
  };
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "game";
}

async function rawgFetch<T>(endpoint: string): Promise<T> {
  const apiKey = raygApiKey();
  if (!apiKey) throw new Error("RAWG_API_KEY not configured");

  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${RAWG_BASE}${endpoint}${separator}key=${apiKey}`;

  const cached = cacheGet<T>(url);
  if (cached) return cached;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 21600 },
  });

  if (!response.ok) {
    throw new Error(`RAWG API error: ${response.status}`);
  }

  const data = (await response.json()) as T;
  cacheSet(url, data);
  return data;
}

const RAWG_NATIVE_GENRES = new Set([
  "action", "adventure", "rpg", "shooter", "strategy",
  "simulation", "puzzle", "racing", "sports", "horror",
  "fantasy", "platformer", "fighting", "arcade", "indie",
]);

export async function browseRawgGames(params: {
  page?: number;
  query?: string;
  genre?: string;
  sort?: "discovery" | "newest" | "rating" | "title";
  seed?: number;
  pageSize?: number;
}): Promise<BrowsePayload> {
  try {
    const apiKey = raygApiKey();
    if (!apiKey) return browseFallbackRawgGames(params);

    const page = Math.max(1, params.page ?? 1);
    const queryText = params.query?.trim();
    const sort = params.sort ?? "discovery";
    const pageSize = Math.min(96, Math.max(10, params.pageSize ?? 24));
    const rawGenre = params.genre && params.genre !== "all" ? params.genre : "";
    const discoverySeed = params.seed ?? 1;

    if (queryText) {
      return searchRawgGames(queryText, pageSize, rawGenre);
    }

    const raygSort = RAWG_SORT_MAP[sort] || "-rating";
    const endpoint = `/games?ordering=${raygSort}&page=${page}&page_size=${pageSize}` +
      (rawGenre ? `&genres=${encodeURIComponent(rawGenre.toLowerCase())}` : "");

    const response = await rawgFetch<RawgListResponse>(endpoint);
    let items = (response.results ?? []).map(mapRawgGame);

    if (rawGenre) {
      items = items.filter((item) => itemMatchesGenre(item, rawGenre));
    }

    if (!queryText && items.length < pageSize) {
      const targetCount = Math.min(pageSize, 48);
      for (let probe = 1; probe <= 5 && items.length < targetCount; probe++) {
        const probeEndpoint = `/games?ordering=${raygSort}&page=${page + probe}&page_size=${pageSize}` +
          (rawGenre ? `&genres=${encodeURIComponent(rawGenre.toLowerCase())}` : "");
        try {
          const probeResponse = await rawgFetch<RawgListResponse>(probeEndpoint);
          let probeItems = (probeResponse.results ?? []).map(mapRawgGame);
          if (rawGenre) probeItems = probeItems.filter((item) => itemMatchesGenre(item, rawGenre));
          const seen = new Set(items.map((i) => i.id));
          items = [...items, ...probeItems.filter((i) => !seen.has(i.id))].slice(0, targetCount);
        } catch {
          break;
        }
      }
    }

    const totalPages = Math.max(1, Math.ceil(Math.min(response.count || items.length || 1, 10000) / pageSize));

    return {
      page,
      totalPages,
      totalResults: response.count || items.length,
      items,
    };
  } catch {
    return browseFallbackRawgGames(params);
  }
}

async function searchRawgGames(
  queryText: string,
  pageSize: number,
  rawGenre: string,
): Promise<BrowsePayload> {
  const searchEndpoint = `/games?search=${encodeURIComponent(queryText)}&page_size=${pageSize}` +
    (rawGenre ? `&genres=${encodeURIComponent(rawGenre.toLowerCase())}` : "");

  const response = await rawgFetch<RawgListResponse>(searchEndpoint);
  const items = (response.results ?? []).map(mapRawgGame);

  return {
    page: 1,
    totalPages: 1,
    totalResults: response.count || items.length,
    items,
  };
}

export async function getRawgGameDetails(id: number): Promise<MediaItem> {
  const response = await rawgFetch<RawgDetailResponse>(`/games/${id}`);
  if (!response || !response.id) throw new Error("Game not found in RAWG");
  return mapRawgGame(response);
}

export async function getRawgGamesByIds(ids: number[]): Promise<MediaItem[]> {
  if (!ids.length) return [];
  const unique = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))].slice(0, 24);
  const results = await Promise.allSettled(unique.map((id) => getRawgGameDetails(id)));
  return results
    .filter((r): r is PromiseFulfilledResult<MediaItem> => r.status === "fulfilled")
    .map((r) => r.value);
}

export async function getRawgSimilarGamesForGame(gameId: number): Promise<MediaItem[]> {
  try {
    const response = await rawgFetch<RawgListResponse>(`/games/${gameId}/suggested?page_size=12`);
    return (response.results ?? []).map(mapRawgGame);
  } catch {
    return [];
  }
}

export async function getRawgGameSeries(gameId: number): Promise<MediaItem[]> {
  try {
    const response = await rawgFetch<RawgListResponse>(`/games/${gameId}/game-series?page_size=12`);
    return (response.results ?? []).map(mapRawgGame);
  } catch {
    return [];
  }
}

export async function getRawgRelatedGamesByFranchise(gameName: string, maxResults: number = 12): Promise<MediaItem[]> {
  try {
    const searchQuery = gameName.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
    const response = await rawgFetch<RawgListResponse>(
      `/games?search=${encodeURIComponent(searchQuery)}&page_size=${maxResults * 2}`,
    );
    const items = (response.results ?? []).map(mapRawgGame);

    const normalizedBase = gameName.toLowerCase().replace(/[^\w\s]+/g, " ").replace(/\s+/g, " ").trim();
    return items
      .filter((item) => {
        const candidate = item.title.toLowerCase().replace(/[^\w\s]+/g, " ").replace(/\s+/g, " ").trim();
        if (normalizedBase.length < 4 || candidate.length < 4) return false;
        return candidate.includes(normalizedBase) || normalizedBase.includes(candidate);
      })
      .slice(0, maxResults);
  } catch {
    return [];
  }
}

function browseFallbackRawgGames(params: {
  page?: number;
  query?: string;
  genre?: string;
  sort?: "discovery" | "newest" | "rating" | "title";
  seed?: number;
  pageSize?: number;
}): BrowsePayload {
  return {
    page: params.page ?? 1,
    totalPages: 1,
    totalResults: 0,
    items: [],
  };
}
