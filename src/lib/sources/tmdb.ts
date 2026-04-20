import { MediaItem } from "@/lib/types";
import { rankCandidatesForQuery } from "@/lib/search-utils";
import { matchesFranchise, isLikelyAnime } from "@/lib/franchise-utils";
import { browseJikanAnime } from "@/lib/sources/jikan";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";
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
};

type TmdbCredits = {
  cast: Array<{ name: string; character?: string }>;
  crew: Array<{ name: string; job: string }>;
};

type TmdbImages = {
  backdrops?: Array<{ file_path: string | null }>;
  posters?: Array<{ file_path: string | null }>;
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
    throw new Error("Missing TMDB_API_KEY");
  }

  const connector = path.includes("?") ? "&" : "?";
  const response = await fetch(`${TMDB_BASE_URL}${path}${connector}api_key=${apiKey}`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed for ${path}`);
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
    coverUrl:
      buildImage(item.poster_path) ??
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
    backdropUrl:
      buildImage(item.backdrop_path) ??
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80",
    screenshots: [
      ...(images?.backdrops?.map((image) => buildImage(image.file_path)).filter((value): value is string => Boolean(value)) ?? []),
      ...(images?.posters?.map((image) => buildImage(image.file_path)).filter((value): value is string => Boolean(value)) ?? []),
    ].slice(0, 8),
    overview: item.overview || "No overview yet.",
    credits: [...cast, ...creators],
    details: {
      runtime,
      status: item.status || "Released",
      releaseDate: cleanReleaseDate(type === "movie" ? item.release_date : item.first_air_date),
      nextEpisodeDate: cleanReleaseDate(item.next_episode_to_air?.air_date),
      lastEpisodeDate: cleanReleaseDate(item.last_episode_to_air?.air_date),
      studio,
      releaseInfo,
      seasonCount,
      episodeCount,
      collectionTitle: item.belongs_to_collection?.name ?? undefined,
      collectionId: item.belongs_to_collection?.id,
    },
  };
}

function isUsefulMovie(item: MediaItem) {
  const banned = new Set(["News", "Talk"]);
  return (
    item.language === "en" &&
    item.year >= 1980 &&
    item.rating >= 5 &&
    !item.genres.some((genre) => banned.has(genre))
  );
}

function isUsefulShow(item: MediaItem) {
  const banned = new Set(["News", "Talk", "Soap"]);
  
  // Filter out anime content from TMDB show API
  const isAnimeContent = isLikelyAnime(item.title, item.genres, item.overview, 'tv');
  
  return (
    item.language === "en" &&
    item.rating >= 6.5 &&
    item.year >= 1980 &&
    !banned.has(item.genres[0] ?? "") &&
    !isAnimeContent // Exclude anime from show results
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
  const match = [...genres.entries()].find(([, name]) => name.toLowerCase() === genreName.toLowerCase());
  return match?.[0] ?? null;
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

function getDiscoveryPage(page: number, seed = 1, windowSize = 48, salt = 0) {
  const offset = Math.abs((seed * 131 + salt * 17) % windowSize);
  const stride = 37;
  return ((offset + (page - 1) * stride) % windowSize) + 1;
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
  const sortBy = sort === "newest" ? "primary_release_date.desc" : sort === "discovery" ? getDiscoverySort(seed, 5) : "popularity.desc";
  const requestPage = !query && sort === "discovery" ? getDiscoveryPage(page, seed, 200, 5) : page;
  // Lower floors deliberately — discovery should surface underrated gems, not just blockbusters
  const voteFloor =
    sort === "discovery"
      ? sortBy === "vote_average.desc"
        ? 80   // was 350 — allow niche films with strong ratings
        : 30   // was 120 — allow obscure titles
      : 80;
  const path = `/discover/movie?language=en-US&include_adult=false&sort_by=${sortBy}&page=${requestPage}&vote_count.gte=${voteFloor}&with_original_language=en${genreId ? `&with_genres=${genreId}` : ""}`;
  const payload = await tmdbFetch<TmdbPagedResponse>(path);
  const primaryItems = payload.results.map((item) => mapMovieOrShow(item, "movie", movieGenres)).filter(isUsefulMovie);

  return {
    page: payload.page,
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
  const sortBy = sort === "newest" ? "first_air_date.desc" : sort === "discovery" ? getDiscoverySort(seed, 11) : "popularity.desc";
  const requestPage = !query && sort === "discovery" ? getDiscoveryPage(page, seed, 200, 11) : page;
  const voteFloor =
    sort === "discovery"
      ? sortBy === "vote_average.desc"
        ? 50   // was 220 — surface hidden gem shows
        : 20   // was 100
      : 50;
  const path = `/discover/tv?language=en-US&sort_by=${sortBy}&page=${requestPage}&vote_count.gte=${voteFloor}&with_original_language=en${genreId ? `&with_genres=${genreId}` : ""}`;
  const payload = await tmdbFetch<TmdbPagedResponse>(path);
  const primaryItems = payload.results.map((item) => mapMovieOrShow(item, "show", tvGenres)).filter(isUsefulShow);

  return {
    page: payload.page,
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

  if (params.type === "movie") {
    return getTmdbMoviePageWithMode(page, query, genre, sort, seed);
  }

  if (params.type === "show") {
    return getTmdbShowPageWithMode(page, query, genre, sort, seed);
  }

  if (params.type === "anime_movie" || params.type === "anime") {
    // For anime types, delegate to Jikan anime catalog
    return browseJikanAnime({
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
  const [genres, details, credits, images] = await Promise.all([
    getGenreMap(type === "movie" ? "movie" : "tv"),
    tmdbFetch<TmdbListItem>(`/${type}/${id}?language=en-US`),
    tmdbFetch<TmdbCredits>(`/${type}/${id}/credits?language=en-US`),
    tmdbFetch<TmdbImages>(`/${type}/${id}/images?include_image_language=en,null`),
  ]);

  return mapMovieOrShow(details, type === "movie" ? "movie" : "show", genres, credits, images);
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
  const filteredItems = items.filter(item => 
    matchesFranchise(item.title, item.originalTitle, undefined, [title])
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
      
      // Check if content is likely anime using multiple indicators
      const genres = entry.item.genre_ids?.map(id => getGenreNameFromMap(id, entry.type === 'movie' ? 'movie' : 'tv')) || [];
      const overview = entry.item.overview || '';
      const title = entry.item.title || entry.item.name || '';
      
      return isLikelyAnime(title, genres, overview, entry.type === 'movie' ? 'movie' : 'tv');
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
