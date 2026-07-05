import { MediaItem, CuratedSection } from "@/lib/types";
import { rankCandidatesForQuery } from "@/lib/search-utils";
import { matchesFranchise, isLikelyAnime } from "@/lib/franchise-utils";
import { browseAniListAnime } from "@/lib/sources/anilist";
import { getMediaFallbackImage } from "@/lib/media-fallbacks";
import { withServerCache } from "@/lib/server-cache";
import { seededShuffle } from "@/lib/curated-utils";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_CACHE_TTL_MS = 1000 * 60 * 30;

type TmdbGenre = {
  id: number;
  name: string;
};

type TmdbListItem = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  original_language?: string;
  genre_ids?: number[];
  genres?: TmdbGenre[];
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  next_episode_to_air?: {
    air_date?: string;
  } | null;
  last_episode_to_air?: {
    air_date?: string;
  } | null;
  belongs_to_collection?: {
    id: number;
    name: string;
  } | null;
  production_companies?: Array<{ name: string }>;
  networks?: Array<{ name: string }>;
  created_by?: Array<{ id: number; name: string }>;
  keywords?: {
    keywords?: Array<{ id: number; name: string }>;
    results?: Array<{ id: number; name: string }>;
  };
};

type TmdbCredits = {
  cast: Array<{ name: string; character?: string }>;
  crew: Array<{ name: string; job: string }>;
};

type TmdbImages = {
  backdrops?: Array<{ file_path: string | null }>;
  posters?: Array<{ file_path: string | null }>;
};

type TmdbVideos = {
  results: Array<{
    key: string;
    site: string;
    type: string;
    official?: boolean;
  }>;
};

type TmdbPagedResponse = {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbListItem[];
};

export type TmdbBrowseParams = {
  type: "all" | "movie" | "show" | "anime" | "anime_movie";
  page?: number;
  query?: string;
  genre?: string;
  sort?: "discovery" | "newest" | "rating" | "title";
  seed?: number;
  pageSize?: number;
};

export type TmdbAnimeImageEnrichment = {
  coverUrl?: string;
  backdropUrl?: string;
  screenshots: string[];
};

type BrowsePayload = {
  page: number;
  totalPages: number;
  totalResults: number;
  items: MediaItem[];
};

let cachedMovieGenres: Map<number, string> | null = null;
let cachedTvGenres: Map<number, string> | null = null;
const tmdbResponseCache = new Map<string, { expiresAt: number; payload: unknown }>();
const animeImageEnrichmentCache = new Map<string, { expiresAt: number; payload: TmdbAnimeImageEnrichment }>();

async function tmdbFetch<T>(path: string) {
  const cached = tmdbResponseCache.get(path);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload as T;
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("Movie and show data is unavailable because TMDB_API_KEY is not configured.");
  }

  const connector = path.includes("?") ? "&" : "?";
  const response = await fetch(`${TMDB_BASE_URL}${path}${connector}api_key=${apiKey}`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Movie and show data is unavailable because TMDB_API_KEY is invalid.");
    }

    if (response.status === 429) {
      throw new Error("TMDB is rate limiting requests right now. Please try again in a moment.");
    }

    throw new Error("Movie and show data could not be loaded right now.");
  }

  const payload = (await response.json()) as T;
  tmdbResponseCache.set(path, {
    expiresAt: Date.now() + TMDB_CACHE_TTL_MS,
    payload,
  });
  return payload;
}

function buildImage(path: string | null) {
  return path ? `${TMDB_IMAGE_BASE_URL}${path}` : null;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function yearFromDate(value?: string) {
  return value ? Number(value.slice(0, 4)) : 0;
}

function cleanReleaseDate(value?: string) {
  return value?.trim() ? value.slice(0, 10) : undefined;
}

function normalizeTitle(input?: string) {
  return (input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleMatchScore(candidate: TmdbListItem, titles: string[], year?: number) {
  const candidateTitles = [
    candidate.name,
    candidate.title,
    candidate.original_name,
    candidate.original_title,
  ]
    .map((value) => normalizeTitle(value))
    .filter(Boolean);

  let score = 0;
  for (const rawTitle of titles) {
    const title = normalizeTitle(rawTitle);
    if (!title) continue;

    for (const candidateTitle of candidateTitles) {
      if (candidateTitle === title) score += 120;
      else if (candidateTitle.startsWith(title) || title.startsWith(candidateTitle)) score += 65;
      else if (candidateTitle.includes(title) || title.includes(candidateTitle)) score += 36;
    }
  }

  if (candidate.original_language === "ja") score += 18;
  if ((candidate.genre_ids ?? []).includes(16)) score += 10;

  const candidateYear = yearFromDate(candidate.first_air_date ?? candidate.release_date);
  if (candidateYear && year) {
    const gap = Math.abs(candidateYear - year);
    if (gap === 0) score += 28;
    else if (gap <= 1) score += 18;
    else if (gap <= 2) score += 8;
  }

  return score + Math.round((candidate.vote_average ?? 0) * 2);
}

function hasLiveActionAdaptationMarkers(candidate: TmdbListItem) {
  const haystack = [
    candidate.title,
    candidate.name,
    candidate.original_title,
    candidate.original_name,
    candidate.overview,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\b(live action|stage play|stage production|the stage|theatre|theater|musical|play adaptation)\b/i.test(
    haystack,
  );
}

function isSafeAnimeImageCandidate(
  candidate: TmdbListItem,
  type: "movie" | "tv",
  genres: string[],
  titles: string[],
) {
  if (hasLiveActionAdaptationMarkers(candidate)) {
    return false;
  }

  const normalizedGenres = genres.map((genre) => genre.toLowerCase());
  const title = candidate.title || candidate.name || "";
  const hasAnimationGenre = normalizedGenres.some((genre) => genre.includes("animation") || genre.includes("anime"));
  const hasJapaneseOrigin = candidate.original_language === "ja";
  
  // Strict requirement: TMDB tags virtually all anime with "Animation".
  // If it's missing, it's highly likely to be a live-action adaptation or unrelated.
  if (!hasAnimationGenre) {
    return false;
  }

  const titleHasStrongMatch = titles.some((entry) => {
    const normalizedEntry = normalizeTitle(entry);
    const normalizedTitle = normalizeTitle(title);
    return (
      normalizedEntry === normalizedTitle ||
      normalizedTitle.startsWith(normalizedEntry) ||
      normalizedEntry.startsWith(normalizedTitle)
    );
  });

  return hasJapaneseOrigin && titleHasStrongMatch;
}

function dedupeImageUrls(images: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return images.filter((image): image is string => {
    if (!image) return false;
    const key = image.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeMediaItems(items: MediaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.source}-${item.sourceId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getGenreNameFromMap(id: number, type: "movie" | "tv"): string {
  const genreMap = type === "movie" ? cachedMovieGenres : cachedTvGenres;
  return genreMap?.get(id) || "";
}

function mapMovieOrShow(
  item: TmdbListItem,
  type: "movie" | "show",
  genres: Map<number, string>,
  credits?: TmdbCredits,
  images?: TmdbImages,
): MediaItem {
  const title = type === "movie" ? item.title ?? "Untitled" : item.name ?? "Untitled";
  const originalTitle =
    type === "movie" ? item.original_title ?? title : item.original_name ?? title;

  const cast = credits?.cast.slice(0, 4).map((person) => ({
    name: person.name,
    role: "Actor",
    character: person.character,
  })) ?? [];

  const creators = credits?.crew
    .filter((person) => ["Director", "Creator", "Writer"].includes(person.job))
    .slice(0, 3)
    .map((person) => ({
      name: person.name,
      role: person.job,
    })) ?? [];

  const genreNames =
    item.genres?.map((genre) => genre.name) ??
    (item.genre_ids ?? [])
      .map((genreId) => genres.get(genreId))
      .filter((genre): genre is string => Boolean(genre));
  const runtime =
    type === "movie"
      ? item.runtime
        ? `${item.runtime} min`
        : undefined
      : item.episode_run_time?.[0]
        ? `${item.episode_run_time[0]} min episodes`
        : item.number_of_episodes
          ? `${item.number_of_episodes} episodes`
          : undefined;
  const seasonCount = type === "show" ? item.number_of_seasons ?? undefined : undefined;
  const episodeCount = type === "show" ? item.number_of_episodes ?? undefined : undefined;
  const studio =
    (type === "show" ? item.networks?.[0]?.name : undefined) ||
    item.production_companies?.[0]?.name;
  const releaseInfo =
    type === "show" && (seasonCount || episodeCount)
      ? [seasonCount ? `${seasonCount} season${seasonCount === 1 ? "" : "s"}` : "", episodeCount ? `${episodeCount} episodes` : ""]
          .filter(Boolean)
          .join(" · ")
      : undefined;

  const fallbackImage = getMediaFallbackImage({ type });

  return {
    id: `tmdb-${type}-${item.id}`,
    slug: slugify(title),
    source: "tmdb",
    sourceId: String(item.id),
    title,
    originalTitle,
    type,
    year: yearFromDate(type === "movie" ? item.release_date : item.first_air_date),
    rating: Number(item.vote_average?.toFixed(1)) || 0,
    language: item.original_language || "en",
    genres: genreNames,
    coverUrl: buildImage(item.poster_path) ?? fallbackImage,
    backdropUrl: buildImage(item.backdrop_path) ?? fallbackImage,
    screenshots: [
      ...(images?.backdrops?.map((image) => buildImage(image.file_path)).filter((value): value is string => Boolean(value)) ?? []),
      ...(images?.posters?.map((image) => buildImage(image.file_path)).filter((value): value is string => Boolean(value)) ?? []),
    ].slice(0, 8),
    overview: item.overview || "No overview yet.",
    credits: [...cast, ...creators],
    details: {
      runtime,
      status: item.status || undefined,
      releaseDate: cleanReleaseDate(type === "movie" ? item.release_date : item.first_air_date),
      nextEpisodeDate: cleanReleaseDate(item.next_episode_to_air?.air_date),
      lastEpisodeDate: cleanReleaseDate(item.last_episode_to_air?.air_date),
      studio,
      releaseInfo,
      seasonCount,
      episodeCount,
      collectionTitle: item.belongs_to_collection?.name ?? undefined,
      collectionId: item.belongs_to_collection?.id,
      sourceLabel: "TMDB",
      sourceUrl: `https://www.themoviedb.org/${type === "movie" ? "movie" : "tv"}/${item.id}`,
    },
  };
}

function isUsefulMovie(item: MediaItem) {
  const banned = new Set(["News", "Talk"]);
  
  // Only exclude anime from TMDB if it's Japanese animation (which AniList covers better)
  const isJapaneseAnimation = 
    item.language === "ja" && 
    item.genres.some(g => g.toLowerCase().includes("animation"));
  
  return (
    (item.language === "en" || item.language === "ja" || item.language === "ko") &&
    item.year >= 1970 &&
    item.rating >= 5 &&
    !item.genres.some((genre) => banned.has(genre)) &&
    !isJapaneseAnimation
  );
}

function isUsefulShow(item: MediaItem) {
  const banned = new Set(["News", "Talk", "Soap"]);
  
  const isJapaneseAnimation = 
    item.language === "ja" && 
    item.genres.some(g => g.toLowerCase().includes("animation"));
  
  return (
    (item.language === "en" || item.language === "ja") &&
    item.rating >= 6 &&
    item.year >= 1970 &&
    !banned.has(item.genres[0] ?? "") &&
    !isJapaneseAnimation
  );
}

async function getGenreMap(type: "movie" | "tv") {
  if (type === "movie" && cachedMovieGenres) {
    return cachedMovieGenres;
  }
  if (type === "tv" && cachedTvGenres) {
    return cachedTvGenres;
  }

  const payload = await tmdbFetch<{ genres: TmdbGenre[] }>(`/genre/${type}/list?language=en-US`);
  const mapped = new Map(payload.genres.map((genre) => [genre.id, genre.name]));

  if (type === "movie") {
    cachedMovieGenres = mapped;
  } else {
    cachedTvGenres = mapped;
  }

  return mapped;
}

async function getGenreMaps() {
  const [movieGenres, tvGenres] = await Promise.all([getGenreMap("movie"), getGenreMap("tv")]);
  return { movieGenres, tvGenres };
}

function findGenreId(genres: Map<number, string>, genreName?: string) {
  if (!genreName || genreName === "all") return null;

  const normalized = genreName
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const exact = [...genres.entries()].find(([, name]) => name.toLowerCase() === genreName.toLowerCase());
  if (exact) {
    return exact[0];
  }

  const aliasHints: Record<string, string[]> = {
    "sci fi": ["science fiction"],
    comedy: ["comedy"],
    "mystery and thriller": ["thriller", "mystery", "crime"],
    documentary: ["documentary"],
    family: ["family"],
    sports: ["sport", "sports"],
    horror: ["horror"],
    fantasy: ["fantasy"],
    adventure: ["adventure"],
    action: ["action"],
    drama: ["drama"],
    romance: ["romance"],
  };

  const hints = aliasHints[normalized] ?? [normalized];
  for (const hint of hints) {
    const fuzzy = [...genres.entries()].find(([, name]) => {
      const genreValue = name.toLowerCase();
      return genreValue === hint || genreValue.includes(hint) || hint.includes(genreValue);
    });
    if (fuzzy) {
      return fuzzy[0];
    }
  }

  return null;
}

export async function getTmdbStarterCatalog() {
  const [movieGenres, tvGenres, movies, shows] = await Promise.all([
    getGenreMap("movie"),
    getGenreMap("tv"),
    tmdbFetch<{ results: TmdbListItem[] }>(
      "/discover/movie?language=en-US&include_adult=false&sort_by=popularity.desc&page=1&vote_count.gte=250&with_original_language=en",
    ),
    tmdbFetch<{ results: TmdbListItem[] }>(
      "/discover/tv?language=en-US&sort_by=popularity.desc&page=1&vote_count.gte=150&with_original_language=en",
    ),
  ]);

  const movieItems = movies.results
    .map((item) => mapMovieOrShow(item, "movie", movieGenres))
    .filter(isUsefulMovie)
    .slice(0, 12);

  const showItems = shows.results
    .map((item) => mapMovieOrShow(item, "show", tvGenres))
    .filter(isUsefulShow)
    .slice(0, 12);

  const mixed: MediaItem[] = [];
  const buckets = [movieItems, showItems];
  let hasMore = true;

  while (hasMore) {
    hasMore = false;
    for (const bucket of buckets) {
      if (bucket.length) {
        mixed.push(bucket.shift() as MediaItem);
        hasMore = true;
      }
    }
  }

  return mixed;
}

function dedupeBySource(items: MediaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.source}-${item.sourceId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function rankLocalSearchResults(items: MediaItem[], query: string) {
  return rankCandidatesForQuery(dedupeBySource(items), query, { limit: 96, minRank: 8 });
}

async function getTmdbMoviePage(page: number, query?: string, genre?: string) {
  return getTmdbMoviePageWithMode(page, query, genre, "discovery", 1);
}

function getDiscoverySort(seed = 1, salt = 0) {
  // Expanded sort modes: include revenue.desc and primary_release_date variety
  // so we surface genuinely different kinds of content each visit
  const modes = [
    "popularity.desc",
    "vote_average.desc",
    "vote_count.desc",
    "revenue.desc",
    "primary_release_date.desc",
  ] as const;
  return modes[Math.abs(seed * 3 + salt) % modes.length];
}

async function getTmdbMoviePageWithMode(
  page: number,
  query?: string,
  genre?: string,
  sort: "discovery" | "newest" | "rating" | "title" = "discovery",
  seed = 1,
  pageSize = 48,
): Promise<BrowsePayload> {
  const movieGenres = await getGenreMap("movie");
  if (query) {
    const movieGenresForSearch = await getGenreMap("movie");
    const [searchP1, searchP2, ...discoverPages] = await Promise.all([
      tmdbFetch<TmdbPagedResponse>(
        `/search/movie?language=en-US&include_adult=false&query=${encodeURIComponent(query)}&page=1`,
      ).catch(() => ({ page: 1, total_pages: 0, total_results: 0, results: [] as TmdbListItem[] })),
      tmdbFetch<TmdbPagedResponse>(
        `/search/movie?language=en-US&include_adult=false&query=${encodeURIComponent(query)}&page=2`,
      ).catch(() => ({ page: 1, total_pages: 0, total_results: 0, results: [] as TmdbListItem[] })),
      ...[1, 2, 3].map((targetPage) => getTmdbMoviePageWithMode(targetPage, "", genre, sort, seed + targetPage)),
    ]);
    const fromSearch = [...searchP1.results, ...searchP2.results].map((item) => mapMovieOrShow(item, "movie", movieGenresForSearch));
    const fromDiscover = discoverPages.flatMap((entry) => entry.items);
    const rankedItems = rankLocalSearchResults([...fromSearch, ...fromDiscover], query).slice(0, 96);

    return {
      page: 1,
      totalPages: 1,
      totalResults: rankedItems.length,
      items: rankedItems,
    };
  }

  const genreId = findGenreId(movieGenres, genre);
  const sortBy = sort === "newest" ? "primary_release_date.desc" : sort === "discovery" ? getDiscoverySort(seed, 5) : sort === "title" ? "original_title.asc" : sort === "rating" ? "vote_average.desc" : "popularity.desc";
  const requestPage = sort === "discovery" ? Math.max(1, page + (seed % 50)) : page;
  // Lower floors deliberately — discovery should surface underrated gems, not just blockbusters
  const voteFloor =
    sort === "discovery"
      ? sortBy === "vote_average.desc"
        ? 80   // was 350 — allow niche films with strong ratings
        : 30   // was 120 — allow obscure titles
      : 80;
  const path = `/discover/movie?language=en-US&include_adult=false&sort_by=${sortBy}&page=${requestPage}&vote_count.gte=${voteFloor}&with_original_language=en${genreId ? `&with_genres=${genreId}` : ""}`;
  const payload = await tmdbFetch<TmdbPagedResponse>(path);
  let primaryItems = payload.results.map((item) => mapMovieOrShow(item, "movie", movieGenres)).filter(isUsefulMovie);

  const targetCount = pageSize;
  let nextRequestPage = requestPage + 1;
  while (primaryItems.length < targetCount && nextRequestPage <= payload.total_pages && nextRequestPage <= requestPage + 6) {
    const nextPath = path.replace(`page=${requestPage}`, `page=${nextRequestPage}`);
    const nextPage = await tmdbFetch<TmdbPagedResponse>(nextPath).catch(() => ({
      page: nextRequestPage,
      total_pages: payload.total_pages,
      total_results: payload.total_results,
      results: [] as TmdbListItem[],
    }));
    const extraItems = nextPage.results.map((item) => mapMovieOrShow(item, "movie", movieGenres)).filter(isUsefulMovie);
    if (!extraItems.length) {
      break;
    }
    primaryItems = dedupeBySource([...primaryItems, ...extraItems]).slice(0, targetCount);
    nextRequestPage += 1;
  }

  return {
    page,
    totalPages: Math.max(1, payload.total_pages),
    totalResults: payload.total_results,
    items: primaryItems,
  };
}

async function getTmdbShowPage(page: number, query?: string, genre?: string) {
  return getTmdbShowPageWithMode(page, query, genre, "discovery", 1);
}

async function getTmdbShowPageWithMode(
  page: number,
  query?: string,
  genre?: string,
  sort: "discovery" | "newest" | "rating" | "title" = "discovery",
  seed = 1,
  pageSize = 48,
): Promise<BrowsePayload> {
  const tvGenres = await getGenreMap("tv");
  if (query) {
    const tvGenresForSearch = await getGenreMap("tv");
    const [searchP1, searchP2, ...discoverPages] = await Promise.all([
      tmdbFetch<TmdbPagedResponse>(`/search/tv?language=en-US&query=${encodeURIComponent(query)}&page=1`).catch(() => ({
        page: 1,
        total_pages: 0,
        total_results: 0,
        results: [] as TmdbListItem[],
      })),
      tmdbFetch<TmdbPagedResponse>(`/search/tv?language=en-US&query=${encodeURIComponent(query)}&page=2`).catch(() => ({
        page: 1,
        total_pages: 0,
        total_results: 0,
        results: [] as TmdbListItem[],
      })),
      ...[1, 2, 3].map((targetPage) => getTmdbShowPageWithMode(targetPage, "", genre, sort, seed + targetPage)),
    ]);
    const fromSearch = [...searchP1.results, ...searchP2.results].map((item) => mapMovieOrShow(item, "show", tvGenresForSearch));
    const fromDiscover = discoverPages.flatMap((entry) => entry.items);
    const rankedItems = rankLocalSearchResults([...fromSearch, ...fromDiscover], query).slice(0, 96);

    return {
      page: 1,
      totalPages: 1,
      totalResults: rankedItems.length,
      items: rankedItems,
    };
  }

  const genreId = findGenreId(tvGenres, genre);
  const sortBy = sort === "newest" ? "first_air_date.desc" : sort === "discovery" ? getDiscoverySort(seed, 11) : sort === "title" ? "original_name.asc" : sort === "rating" ? "vote_average.desc" : "popularity.desc";
  const requestPage = sort === "discovery" ? Math.max(1, page + (seed % 50)) : page;
  const voteFloor =
    sort === "discovery"
      ? sortBy === "vote_average.desc"
        ? 50   // was 220 — surface hidden gem shows
        : 20   // was 100
      : 50;
  const path = `/discover/tv?language=en-US&sort_by=${sortBy}&page=${requestPage}&vote_count.gte=${voteFloor}&with_original_language=en${genreId ? `&with_genres=${genreId}` : ""}`;
  const payload = await tmdbFetch<TmdbPagedResponse>(path);
  let primaryItems = payload.results.map((item) => mapMovieOrShow(item, "show", tvGenres)).filter(isUsefulShow);

  const targetCount = pageSize;
  let nextRequestPage = requestPage + 1;
  while (primaryItems.length < targetCount && nextRequestPage <= payload.total_pages && nextRequestPage <= requestPage + 6) {
    const nextPath = path.replace(`page=${requestPage}`, `page=${nextRequestPage}`);
    const nextPage = await tmdbFetch<TmdbPagedResponse>(nextPath).catch(() => ({
      page: nextRequestPage,
      total_pages: payload.total_pages,
      total_results: payload.total_results,
      results: [] as TmdbListItem[],
    }));
    const extraItems = nextPage.results.map((item) => mapMovieOrShow(item, "show", tvGenres)).filter(isUsefulShow);
    if (!extraItems.length) {
      break;
    }
    primaryItems = dedupeBySource([...primaryItems, ...extraItems]).slice(0, targetCount);
    nextRequestPage += 1;
  }

  return {
    page,
    totalPages: Math.max(1, payload.total_pages),
    totalResults: payload.total_results,
    items: primaryItems,
  };
}

function interleaveCatalog(movieItems: MediaItem[], showItems: MediaItem[]) {
  const movies = [...movieItems];
  const shows = [...showItems];
  const mixed: MediaItem[] = [];

  while (movies.length || shows.length) {
    if (movies.length) mixed.push(movies.shift() as MediaItem);
    if (shows.length) mixed.push(shows.shift() as MediaItem);
  }

  return mixed;
}

export async function browseTmdbCatalog(params: TmdbBrowseParams) {
  const page = Math.max(1, params.page ?? 1);
  const query = params.query?.trim();
  const genre = params.genre?.trim();
  const sort = params.sort ?? "discovery";
  const seed = params.seed ?? 1;
  const pageSize = params.pageSize ?? 48;

  if (params.type === "movie") {
    return getTmdbMoviePageWithMode(page, query, genre, sort, seed, pageSize);
  }

  if (params.type === "show") {
    return getTmdbShowPageWithMode(page, query, genre, sort, seed, pageSize);
  }

  if (params.type === "anime_movie" || params.type === "anime") {
    // For anime types, delegate to AniList anime catalog.
    return browseAniListAnime({
      page,
      query,
      genre,
      sort,
      seed
    });
  }

  const { movieGenres, tvGenres } = await getGenreMaps();
  const movieGenreId = findGenreId(movieGenres, genre);
  const tvGenreId = findGenreId(tvGenres, genre);

  const [movies, shows] = await Promise.all([
    getTmdbMoviePageWithMode(page, query, movieGenreId ? movieGenres.get(movieGenreId) ?? genre : genre, sort, seed),
    getTmdbShowPageWithMode(page, query, tvGenreId ? tvGenres.get(tvGenreId) ?? genre : genre, sort, seed),
  ]);

  return {
    page,
    totalPages: Math.max(movies.totalPages, shows.totalPages),
    totalResults: movies.totalResults + shows.totalResults,
    items: dedupeBySource(interleaveCatalog(movies.items, shows.items)),
  };
}

export async function getTmdbMediaDetails(id: number, type: "movie" | "tv") {
  const [genres, details, credits, images, videos, watchProvidersData] = await Promise.all([
    getGenreMap(type === "movie" ? "movie" : "tv"),
    tmdbFetch<TmdbListItem>(`/${type}/${id}?language=en-US`),
    tmdbFetch<TmdbCredits>(`/${type}/${id}/credits?language=en-US`),
    tmdbFetch<TmdbImages>(`/${type}/${id}/images?include_image_language=en,null`),
    tmdbFetch<TmdbVideos>(`/${type}/${id}/videos?language=en-US`).catch(() => ({ results: [] })),
    tmdbFetch<{ results: Record<string, { flatrate?: Array<{ provider_name: string }>; link?: string }> }>(`/${type}/${id}/watch/providers`).catch(() => ({ results: {} as Record<string, { flatrate?: Array<{ provider_name: string }>; link?: string }> })),
  ]);

  const media = mapMovieOrShow(details, type === "movie" ? "movie" : "show", genres, credits, images);
  const usProviders = (watchProvidersData?.results as Record<string, { flatrate?: Array<{ provider_name: string }>; link?: string }>)?.["US"];
  const providersFlat: Array<{ provider_name: string }> = usProviders?.flatrate || [];
  const validProviders = ["Netflix", "Amazon Prime Video", "Disney+"];
  const externalLinks: Array<{ name: string; url: string }> = providersFlat
    .filter((provider: { provider_name: string }) => validProviders.includes(provider.provider_name))
    .map((provider: { provider_name: string }) => ({ name: provider.provider_name, url: usProviders?.link || "" }));
  // Only use official trailers/teasers — exclude clips, featurettes, BTS, and analysis content
  const ALLOWED_TRAILER_TYPES = new Set(["Trailer", "Teaser"]);
  const EXCLUDED_TRAILER_TYPES = new Set(["Clip", "Featurette", "Behind the Scenes", "Bloopers", "Opening Credits"]);
  const filteredVideos = videos.results.filter(
    (entry) => entry.site === "YouTube" && ALLOWED_TRAILER_TYPES.has(entry.type) && !EXCLUDED_TRAILER_TYPES.has(entry.type),
  );
  const trailer =
    filteredVideos.find((entry) => entry.type === "Trailer" && entry.official) ??
    filteredVideos.find((entry) => entry.type === "Trailer") ??
    filteredVideos.find((entry) => entry.type === "Teaser" && entry.official) ??
    filteredVideos.find((entry) => entry.type === "Teaser");

  return {
    ...media,
    details: {
      ...media.details,
      trailerUrl: trailer?.key ? `https://www.youtube.com/embed/${trailer.key}` : media.details.trailerUrl,
      externalLinks: externalLinks.length > 0 ? externalLinks : media.details.externalLinks,
    },
  };
}

type TmdbCollectionResponse = {
  id: number;
  name: string;
  parts?: TmdbListItem[];
};

/** All movies in a TMDB collection (franchise pack / series). */
export async function getTmdbCollectionItems(collectionId: number): Promise<MediaItem[]> {
  const payload = await tmdbFetch<TmdbCollectionResponse>(`/collection/${collectionId}?language=en-US`);
  const movieGenres = await getGenreMap("movie");
  const parts = payload.parts ?? [];
  return parts
    .map((part) => mapMovieOrShow(part, "movie", movieGenres))
    .filter((item) => item.year >= 1900 && item.rating >= 3.5 && !item.genres.some((g) => ["News", "Talk"].includes(g)));
}

/** Find related series or spin-offs for a show */
export async function getTmdbShowRelations(showId: number): Promise<MediaItem[]> {
  const [recommendations, similar] = await Promise.all([
    tmdbFetch<TmdbPagedResponse>(`/tv/${showId}/recommendations?language=en-US&page=1`).catch(() => ({ results: [] })),
    tmdbFetch<TmdbPagedResponse>(`/tv/${showId}/similar?language=en-US&page=1`).catch(() => ({ results: [] })),
  ]);
  
  const showGenres = await getGenreMap("tv");
  const combined = [...recommendations.results, ...similar.results];
  const seen = new Set<number>();
  
  return combined
    .filter(res => {
      if (seen.has(res.id)) return false;
      seen.add(res.id);
      return true;
    })
    .map(res => mapMovieOrShow(res, "show", showGenres))
    .filter(item => item.year >= 1900 && item.rating >= 4.0);
}

function normalizeFranchiseKey(input: string) {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s]+/g, " ")
    .replace(/\b(the|a|an|series|saga|collection|movie|tv|show)\b/g, " ")
    .replace(/\b(season|part|chapter|episode)\s+\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasStrongTmdbTitleAffinity(baseTitles: string[], candidate: MediaItem) {
  const candidateKeys = [
    candidate.title,
    candidate.originalTitle ?? "",
    candidate.details.collectionTitle ?? "",
  ]
    .map((value) => normalizeFranchiseKey(value))
    .filter(Boolean);

  return baseTitles.some((baseTitle) =>
    candidateKeys.some((candidateTitle) => {
      if (!baseTitle || !candidateTitle) return false;
      if (baseTitle === candidateTitle) return true;
      if (baseTitle.length >= 6 && candidateTitle.length >= 6) {
        return candidateTitle.includes(baseTitle) || baseTitle.includes(candidateTitle);
      }
      return false;
    }),
  );
}

export function getTmdbFranchiseEntries(id: number, type: "movie" | "tv"): Promise<MediaItem[]> {
  return withServerCache(`tmdb:franchise:${id}:${type}`, 60 * 60 * 1000, async () => {
  const mappedType = type === "movie" ? "movie" : "show";
  const genres = await getGenreMap(type === "movie" ? "movie" : "tv");

  const [details, recommendations, similar] = await Promise.all([
    tmdbFetch<TmdbListItem>(`/${type}/${id}?language=en-US`).catch(() => null),
    tmdbFetch<TmdbPagedResponse>(`/${type}/${id}/recommendations?language=en-US&page=1`).catch(() => null),
    tmdbFetch<TmdbPagedResponse>(`/${type}/${id}/similar?language=en-US&page=1`).catch(() => null),
  ]);

  if (!details) {
    return [];
  }

  if (type === "movie" && details.belongs_to_collection?.id) {
    return getTmdbCollectionItems(details.belongs_to_collection.id);
  }

  const titleVariants = [
    details.name,
    details.title,
    details.original_name,
    details.original_title,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim());
  const [searchA, searchB] = await Promise.all([
    titleVariants[0]
      ? tmdbFetch<TmdbPagedResponse>(`/search/${type}?language=en-US&page=1&query=${encodeURIComponent(titleVariants[0])}`).catch(() => null)
      : Promise.resolve(null),
    titleVariants[1] && titleVariants[1] !== titleVariants[0]
      ? tmdbFetch<TmdbPagedResponse>(`/search/${type}?language=en-US&page=1&query=${encodeURIComponent(titleVariants[1])}`).catch(() => null)
      : Promise.resolve(null),
  ]);
  const normalizedTitleVariants = Array.from(new Set(titleVariants.map((value) => normalizeFranchiseKey(value)).filter(Boolean)));
  const candidatePool = [
    ...(recommendations?.results ?? []),
    ...(similar?.results ?? []),
    ...(searchA?.results ?? []),
    ...(searchB?.results ?? []),
  ];

  const mapped = dedupeMediaItems(
    candidatePool
      .map((item) => mapMovieOrShow(item, mappedType, genres))
      .filter((item) => item.year >= 1900 && item.rating >= 3.5),
  );

  const filtered = mapped.filter((item) => {
    return hasStrongTmdbTitleAffinity(normalizedTitleVariants, item);
  });

  return filtered.sort((left, right) => {
    const yearGap = (left.year || 0) - (right.year || 0);
    if (yearGap !== 0) return yearGap;
    return right.rating - left.rating;
  });
  }); // end withServerCache
}

/** Find related movies/shows by title matching when collection data is insufficient */
export async function getTmdbRelatedByFranchise(title: string, type: "movie" | "show", maxResults: number = 12): Promise<MediaItem[]> {
  const genres = await getGenreMap(type === "show" ? "tv" : type);
  const searchQuery = title.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  
  // Search for similar titles
  const searchResults = await tmdbFetch<TmdbPagedResponse>(
    `/search/${type === "show" ? "tv" : type}?query=${encodeURIComponent(searchQuery)}&language=en-US&page=1`
  );

  const items = searchResults.results
    .map(item => mapMovieOrShow(item, type, genres))
    .filter(item => item.year >= 1900 && item.rating >= 3.5);

  // Use improved franchise matching to filter results
  const filteredItems = items.filter((item) =>
    hasStrongTmdbTitleAffinity([normalizeFranchiseKey(title)], item) &&
    matchesFranchise(item.title, item.originalTitle, undefined, [title]),
  );

  return filteredItems.slice(0, maxResults);
}

export async function enrichAnimeImagesFromTmdb(params: {
  titles: string[];
  year?: number;
}) {
  const titles = Array.from(new Set(params.titles.map((title) => title.trim()).filter(Boolean)));
  const cacheKey = JSON.stringify({ titles, year: params.year ?? 0 });
  const cached = animeImageEnrichmentCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  if (!titles.length) {
    const payload = {
      screenshots: [],
    } satisfies TmdbAnimeImageEnrichment;
    animeImageEnrichmentCache.set(cacheKey, {
      expiresAt: Date.now() + TMDB_CACHE_TTL_MS,
      payload,
    });
    return payload;
  }

  const searchTitle = titles[0];
  await getGenreMaps().catch(() => null);
  const [tvResults, movieResults] = await Promise.all([
    tmdbFetch<TmdbPagedResponse>(`/search/tv?language=en-US&page=1&query=${encodeURIComponent(searchTitle)}`).catch(() => null),
    tmdbFetch<TmdbPagedResponse>(`/search/movie?language=en-US&include_adult=false&page=1&query=${encodeURIComponent(searchTitle)}`).catch(
      () => null,
    ),
  ]);

  // Filter candidates to only include anime content
  const candidates = [
    ...(tvResults?.results.map((item) => ({ item, type: "tv" as const })) ?? []),
    ...(movieResults?.results.map((item) => ({ item, type: "movie" as const })) ?? []),
  ]
    .map((entry) => ({
      ...entry,
      score: titleMatchScore(entry.item, titles, params.year),
    }))
    .filter((entry) => {
      // Must have good title match
      if (entry.score < 40) return false;
      
      const genres = entry.item.genre_ids?.map(id => getGenreNameFromMap(id, entry.type === 'movie' ? 'movie' : 'tv')) || [];
      return isSafeAnimeImageCandidate(entry.item, entry.type, genres, titles);
    })
    .sort((left, right) => right.score - left.score);

  const best = candidates[0];
  if (!best) {
    const payload = {
      screenshots: [],
    } satisfies TmdbAnimeImageEnrichment;
    animeImageEnrichmentCache.set(cacheKey, {
      expiresAt: Date.now() + TMDB_CACHE_TTL_MS,
      payload,
    });
    return payload;
  }

  const [details, images] = await Promise.all([
    tmdbFetch<TmdbListItem>(`/${best.type}/${best.item.id}?language=en-US`).catch(() => null),
    tmdbFetch<TmdbImages>(`/${best.type}/${best.item.id}/images?include_image_language=en,null,ja`).catch(() => null),
  ]);

  const coverUrl = buildImage(details?.poster_path ?? best.item.poster_path ?? null) ?? undefined;
  const backdropUrl = buildImage(details?.backdrop_path ?? best.item.backdrop_path ?? null) ?? undefined;
  const screenshots = dedupeImageUrls([
    ...(images?.backdrops?.map((image) => buildImage(image.file_path)) ?? []),
    backdropUrl,
  ]).slice(0, 10);

  const payload = {
    coverUrl,
    backdropUrl,
    screenshots,
  } satisfies TmdbAnimeImageEnrichment;

  animeImageEnrichmentCache.set(cacheKey, {
    expiresAt: Date.now() + TMDB_CACHE_TTL_MS,
    payload,
  });

  return payload;
}



export function getTmdbCuratedSections(type: "movie" | "show", seed: number): Promise<CuratedSection[]> {
  return withServerCache(`tmdb:curated:${type}:${seed}`, 30 * 60 * 1000, async () => {
  const genres = await getGenreMap(type === "show" ? "tv" : type);
  const isMovie = type === "movie";

  const fetchSection = async (
    path: string,
    mapper: (item: TmdbListItem) => MediaItem,
    filterFn: (item: MediaItem) => boolean,
    categorySeed: number
  ): Promise<MediaItem[]> => {
    try {
      const connector = path.includes("?") ? "&" : "?";
      const [p1, p2] = await Promise.all([
        tmdbFetch<TmdbPagedResponse>(`${path}${connector}page=1`).catch(() => null),
        tmdbFetch<TmdbPagedResponse>(`${path}${connector}page=2`).catch(() => null),
      ]);
      const results = [...(p1?.results || []), ...(p2?.results || [])];
      if (!results.length) return [];
      const mapped = results.map(mapper).filter(filterFn);
      const unique = dedupeMediaItems(mapped);
      return seededShuffle(unique, categorySeed).slice(0, 20);
    } catch (err) {
      console.error(`Error fetching TMDB curated section for path ${path}:`, err);
      return [];
    }
  };

  const currentYear = new Date().getFullYear();

  if (isMovie) {
    const movieMapper = (item: TmdbListItem) => mapMovieOrShow(item, "movie", genres);
    const movieFilter = isUsefulMovie;

    const sections = [
      {
        id: "trending",
        title: "Trending Now",
        path: "/trending/movie/week?language=en-US",
        seedOffset: 1,
      },
      {
        id: "top_rated",
        title: "Top Rated Movies",
        path: "/movie/top_rated?language=en-US",
        seedOffset: 2,
      },
      {
        id: "best_year",
        title: `Best Movies of ${currentYear}`,
        path: `/discover/movie?language=en-US&sort_by=vote_average.desc&vote_count.gte=100&primary_release_year=${currentYear}&with_original_language=en`,
        seedOffset: 3,
      },
      {
        id: "nostalgia",
        title: "Nostalgic Hits (80s, 90s, 00s)",
        path: "/discover/movie?language=en-US&sort_by=popularity.desc&primary_release_date.gte=1980-01-01&primary_release_date.lte=2009-12-31&vote_count.gte=1000&with_original_language=en",
        seedOffset: 4,
      },
      {
        id: "hidden_gems",
        title: "Hidden Gems",
        path: "/discover/movie?language=en-US&sort_by=popularity.desc&vote_average.gte=7.5&vote_count.gte=150&vote_count.lte=2000&with_original_language=en",
        seedOffset: 5,
      },
      {
        id: "popcorn_time",
        title: "Popcorn Time: Action & Adventure",
        path: "/discover/movie?language=en-US&sort_by=popularity.desc&with_genres=28,12&with_original_language=en",
        seedOffset: 6,
      },
      {
        id: "critically_acclaimed",
        title: "Critically Acclaimed",
        path: "/discover/movie?language=en-US&sort_by=vote_average.desc&vote_count.gte=3000&with_original_language=en",
        seedOffset: 7,
      },
      {
        id: "random_reel",
        title: "Random Reel: Surprise Picks",
        path: "/discover/movie?language=en-US&sort_by=popularity.desc&page=3&with_original_language=en",
        seedOffset: 8,
      },
    ];

    const results = await Promise.all(
      sections.map(async (sec) => {
        let items = await fetchSection(sec.path, movieMapper, movieFilter, seed + sec.seedOffset);
        if (sec.id === "best_year" && items.length < 8) {
          const prevYear = currentYear - 1;
          const prevItems = await fetchSection(
            `/discover/movie?language=en-US&sort_by=vote_average.desc&vote_count.gte=150&primary_release_year=${prevYear}&with_original_language=en`,
            movieMapper,
            movieFilter,
            seed + sec.seedOffset
          );
          items = dedupeMediaItems([...items, ...prevItems]).slice(0, 20);
        }
        return {
          id: sec.id,
          title: sec.title,
          items,
        };
      })
    );

    return results;
  } else {
    const showMapper = (item: TmdbListItem) => mapMovieOrShow(item, "show", genres);
    const showFilter = isUsefulShow;

    const sections = [
      {
        id: "trending",
        title: "Currently Trending",
        path: "/trending/tv/week?language=en-US",
        seedOffset: 11,
      },
      {
        id: "top_rated",
        title: "Top Rated Shows",
        path: "/tv/top_rated?language=en-US",
        seedOffset: 12,
      },
      {
        id: "binge_mystery",
        title: "Binge-Worthy Mystery & Sci-Fi",
        path: "/discover/tv?language=en-US&sort_by=popularity.desc&with_genres=9648,10765&with_original_language=en",
        seedOffset: 13,
      },
      {
        id: "comedy_gold",
        title: "Laugh Out Loud: Comedy Gold",
        path: "/discover/tv?language=en-US&sort_by=popularity.desc&with_genres=35&with_original_language=en",
        seedOffset: 14,
      },
      {
        id: "tv_nostalgia",
        title: "Nostalgic TV Throwback",
        path: "/discover/tv?language=en-US&sort_by=popularity.desc&first_air_date.gte=1990-01-01&first_air_date.lte=2015-12-31&vote_count.gte=300&with_original_language=en",
        seedOffset: 15,
      },
      {
        id: "hidden_gems",
        title: "Hidden Gems",
        path: "/discover/tv?language=en-US&sort_by=popularity.desc&vote_average.gte=7.8&vote_count.gte=50&vote_count.lte=1000&with_original_language=en",
        seedOffset: 16,
      },
      {
        id: "random_channel",
        title: "Chaotic Channel: Random TV",
        path: "/discover/tv?language=en-US&sort_by=popularity.desc&page=3&with_original_language=en",
        seedOffset: 17,
      },
    ];

    const results = await Promise.all(
      sections.map(async (sec) => {
        const items = await fetchSection(sec.path, showMapper, showFilter, seed + sec.seedOffset);
        return {
          id: sec.id,
          title: sec.title,
          items,
        };
      })
    );

    return results;
  }
  }); // end withServerCache
}

