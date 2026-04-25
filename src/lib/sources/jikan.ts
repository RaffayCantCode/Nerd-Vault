import { writeBrowsePageCache, writeBrowsePageCacheV2 } from "@/lib/browse-cache";
import { rankCandidatesForQuery } from "@/lib/search-utils";
import { enrichAnimeImagesFromTmdb, TmdbAnimeImageEnrichment } from "@/lib/sources/tmdb";
import { MediaItem } from "@/lib/types";
import { matchesFranchise, normalizeAnimeBaseTitle, isAnimeMovie, groupAnimeByFranchise, isLikelyAnime } from "@/lib/franchise-utils";

const JIKAN_BASE_URL = "https://api.jikan.moe/v4";
const JIKAN_CACHE_TTL_MS = 1000 * 60 * 30;
const jikanResponseCache = new Map<string, { expiresAt: number; payload: unknown }>();

function proxiedImageUrl(url?: string) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.hostname === "myanimelist.net") {
      parsed.hostname = "cdn.myanimelist.net";
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

type JikanGenre = {
  mal_id: number;
  name: string;
};

type JikanAnime = {
  mal_id: number;
  title: string;
  type?: string | null;
  title_english?: string | null;
  titles?: Array<{
    type: string;
    title: string;
  }>;
  synopsis?: string | null;
  score?: number | null;
  year?: number | null;
  episodes?: number | null;
  status?: string | null;
  images?: {
    jpg?: {
      image_url?: string;
      large_image_url?: string;
    };
    webp?: {
      large_image_url?: string;
    };
  };
  trailer?: {
    url?: string | null;
    embed_url?: string | null;
    images?: {
      maximum_image_url?: string;
      large_image_url?: string;
    };
  };
  genres?: JikanGenre[];
  themes?: JikanGenre[];
  demographics?: JikanGenre[];
  explicit_genres?: JikanGenre[];
  studios?: Array<{ name: string }>;
  title_japanese?: string | null;
  aired?: {
    from?: string | null;
    prop?: {
      from?: {
        year?: number | null;
      };
    };
  };
};

type JikanRelationResponse = {
  data: Array<{
    relation: string;
    entry: Array<{
      mal_id: number;
      type: string;
      name: string;
    }>;
  }>;
};

type JikanCharacter = {
  character: {
    name: string;
    images?: {
      jpg?: {
        image_url?: string;
      };
      webp?: {
        image_url?: string;
      };
    };
  };
  role: string;
  voice_actors?: Array<{
    person: { name: string };
    language: string;
  }>;
};

type JikanPagination = {
  current_page: number;
  last_visible_page: number;
  items?: {
    total?: number;
  };
};

type JikanListResponse = {
  data: JikanAnime[];
  pagination: JikanPagination;
};

type JikanCharacterResponse = {
  data: JikanCharacter[];
};

type JikanPicturesResponse = {
  data: Array<{
    jpg?: {
      image_url?: string;
      large_image_url?: string;
    };
    webp?: {
      image_url?: string;
      large_image_url?: string;
    };
  }>;
};

type JikanGenresResponse = {
  data: Array<{
    mal_id: number;
    name: string;
  }>;
};

export type JikanBrowseParams = {
  page?: number;
  query?: string;
  genre?: string;
  sort?: "discovery" | "newest" | "rating" | "title";
  seed?: number;
};

export type AnimeFranchiseEntry = {
  id: number;
  title: string;
  year: number;
  rating: number;
  status?: string;
  episodes?: number;
  type?: string;
  seasonKey?: string;
  releaseDate?: string;
};

async function jikanFetch<T>(path: string) {
  const cached = jikanResponseCache.get(path);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload as T;
  }

  const response = await fetch(`${JIKAN_BASE_URL}${path}`, {
    // @ts-ignore - Next.js specific fetch option
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Jikan request failed for ${path}`);
  }

  const payload = (await response.json()) as T;
  jikanResponseCache.set(path, {
    expiresAt: Date.now() + JIKAN_CACHE_TTL_MS,
    payload,
  });
  return payload;
}

let cachedAnimeGenreMap: Map<string, number> | null = null;

async function getAnimeGenreMap() {
  if (cachedAnimeGenreMap) {
    return cachedAnimeGenreMap;
  }

  const payload = await jikanFetch<JikanGenresResponse>("/genres/anime");
  cachedAnimeGenreMap = new Map(
    payload.data.map((genre) => [genre.name.toLowerCase(), genre.mal_id]),
  );
  return cachedAnimeGenreMap;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getDiscoveryPage(page: number, seed = 1, windowSize = 250, salt = 0) {
  const offset = Math.abs((seed * 29 + salt * 11) % windowSize);
  const stride = 43;
  return ((offset + (page - 1) * stride) % windowSize) + 1;
}

function cleanWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function getDisplayTitle(item: JikanAnime) {
  const englishTitle = item.titles?.find((entry) => entry.type === "English")?.title;
  return item.title_english || englishTitle || item.title;
}

function getAnimeYear(item: JikanAnime) {
  return item.year ?? item.aired?.prop?.from?.year ?? 0;
}


function animeTitleVariants(item: JikanAnime) {
  return Array.from(
    new Set(
      [
        getDisplayTitle(item),
        item.title,
        item.title_english ?? "",
        item.title_japanese ?? "",
        ...(item.titles?.map((entry) => entry.title) ?? []),
      ]
        .map((title) => cleanWhitespace(title))
        .filter(Boolean),
    ),
  );
}

function dedupeImages(images: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return images.filter((image): image is string => {
    if (!image) return false;
    const key = image.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rankLocalSearchResults(items: MediaItem[], query: string) {
  return rankCandidatesForQuery(items, query, { limit: 96, minRank: 8 });
}

function animeMatchesFranchise(item: JikanAnime, franchiseTitles: string[]) {
  return matchesFranchise(
    getDisplayTitle(item),
    item.title_english ?? undefined,
    item.title_japanese ?? undefined,
    franchiseTitles
  );
}

function buildAnimeFranchiseKeys(titles: string[], type?: string | null) {
  return Array.from(
    new Set(
      titles
        .map((title) => normalizeAnimeBaseTitle(title, type ?? undefined))
        .filter(Boolean),
    ),
  );
}

function hasStrictAnimeFranchiseKeyMatch(item: JikanAnime, primaryKeys: string[]) {
  const itemKeys = buildAnimeFranchiseKeys(animeTitleVariants(item), item.type);

  return itemKeys.some((itemKey) =>
    primaryKeys.some((primaryKey) => {
      if (!itemKey || !primaryKey) {
        return false;
      }

      if (itemKey === primaryKey) {
        return true;
      }

      const itemWords = itemKey.split(/\s+/).filter((word) => word.length > 2);
      const primaryWords = primaryKey.split(/\s+/).filter((word) => word.length > 2);
      const commonWords = itemWords.filter((word) => primaryWords.includes(word));
      const firstWordMatches = itemWords[0] && primaryWords[0] && itemWords[0] === primaryWords[0];
      const shorterLength = Math.min(itemKey.length, primaryKey.length);
      const overlapRatio = commonWords.length / Math.max(1, Math.min(itemWords.length, primaryWords.length));

      if (commonWords.length < 2 || shorterLength < 8) {
        return false;
      }

      if (itemKey.includes(primaryKey) || primaryKey.includes(itemKey)) {
        return true;
      }

      return firstWordMatches ? overlapRatio >= 0.7 : overlapRatio >= 0.85;
    }),
  );
}

function mapCredits(characters?: JikanCharacter[]) {
  return (
    characters?.slice(0, 5).flatMap((entry) => {
      const preferredVoiceActor = entry.voice_actors?.find(
        (voiceActor) => voiceActor.language === "Japanese" || voiceActor.language === "English",
      );

      if (!preferredVoiceActor) {
        return [
          {
            name: entry.character.name,
            role: entry.role === "Main" ? "Character" : "Supporting Character",
          },
        ];
      }

      return [
        {
          name: preferredVoiceActor.person.name,
          role: "Voice Actor",
          character: entry.character.name,
        },
      ];
    }) ?? []
  );
}

function mapAnime(
  item: JikanAnime,
  characters?: JikanCharacter[],
  overrides?: {
    title?: string;
    collectionTitle?: string;
    entryCount?: number;
    entryLabel?: string;
    seasonCount?: number;
  },
): MediaItem {
  const title = overrides?.title || getDisplayTitle(item);
  const canonicalTitle = overrides?.collectionTitle || normalizeAnimeBaseTitle(getDisplayTitle(item));

  // Determine if this is an anime movie or series
  const isMovie = isAnimeMovie(title, item.episodes ?? undefined, item.type ?? undefined);
  const animeType = isMovie ? 'anime_movie' : 'anime'; // Use specific anime_movie type for movies

  return {
    id: `jikan-anime-${item.mal_id}`,
    slug: slugify(canonicalTitle || title),
    source: "jikan",
    sourceId: String(item.mal_id),
    type: animeType,
    title,
    originalTitle: item.title_japanese || item.title,
    year: getAnimeYear(item),
    rating: Number((item.score ?? 0).toFixed(1)) || 0,
    language: "ja",
    genres: Array.from(
      new Set([
        ...(item.genres?.map((genre) => genre.name) ?? []),
        ...(item.themes?.map((genre) => genre.name) ?? []),
        ...(item.demographics?.map((genre) => genre.name) ?? []),
        ...(item.explicit_genres?.map((genre) => genre.name) ?? []),
      ]),
    ),
    coverUrl:
      proxiedImageUrl(item.images?.jpg?.large_image_url) ??
      proxiedImageUrl(item.images?.jpg?.image_url) ??
      proxiedImageUrl(item.images?.webp?.large_image_url) ??
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=900&q=80",
    backdropUrl:
      proxiedImageUrl(item.trailer?.images?.maximum_image_url) ??
      proxiedImageUrl(item.trailer?.images?.large_image_url) ??
      proxiedImageUrl(item.images?.jpg?.large_image_url) ??
      proxiedImageUrl(item.images?.jpg?.image_url) ??
      proxiedImageUrl(item.images?.webp?.large_image_url) ??
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1600&q=80",
    screenshots: [
      proxiedImageUrl(item.trailer?.images?.maximum_image_url),
      proxiedImageUrl(item.trailer?.images?.large_image_url),
      ...(characters?.slice(0, 6).map((entry) =>
        proxiedImageUrl(entry.character.images?.jpg?.image_url) ??
        proxiedImageUrl(entry.character.images?.webp?.image_url),
      ) ?? []),
      proxiedImageUrl(item.images?.jpg?.image_url),
    ].filter((value): value is string => Boolean(value)),
    overview: item.synopsis || "No synopsis yet.",
    credits: mapCredits(characters),
    details: {
      runtime: item.episodes ? `${item.episodes} episodes` : undefined,
      studio: item.studios?.map((studio) => studio.name).join(", ") || undefined,
      status: item.status || "Unknown",
      releaseDate: item.aired?.from?.slice(0, 10) || undefined,
      trailerUrl: item.trailer?.embed_url || item.trailer?.url || undefined,
      episodeCount: item.episodes ?? undefined,
      collectionTitle: canonicalTitle,
      entryCount: overrides?.entryCount,
      entryLabel: overrides?.entryLabel,
      seasonCount: overrides?.seasonCount,
    },
  };
}

function isUsefulAnime(item: MediaItem) {
  return item.rating >= 6.5 && (item.year === 0 || item.year >= 1980);
}

async function buildGenreParam(genre?: string) {
  if (!genre || genre === "all") return "";
  const genreMap = await getAnimeGenreMap();
  const genreId = genreMap.get(genre.toLowerCase());
  return genreId ? `&genres=${genreId}` : "";
}

function toFranchiseEntry(item: JikanAnime): AnimeFranchiseEntry {
  return {
    id: item.mal_id,
    title: getDisplayTitle(item),
    year: item.year ?? 0,
    rating: Number((item.score ?? 0).toFixed(1)) || 0,
    status: item.status || undefined,
    episodes: item.episodes ?? undefined,
    type: item.type ?? undefined,
    releaseDate: item.aired?.from?.slice(0, 10) || undefined,
  };
}

function sortFranchiseEntries(entries: AnimeFranchiseEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.year !== right.year) {
      return left.year - right.year;
    }
    return left.title.localeCompare(right.title);
  });
}

function isSupplementalAnimeEntry(entry: AnimeFranchiseEntry) {
  const title = cleanWhitespace(entry.title).toLowerCase();
  const type = cleanWhitespace(entry.type ?? "").toLowerCase();

  return (
    ["movie", "ova", "special", "ona", "music", "pv", "cm"].includes(type) ||
    /\b(movie|ova|special|recap|compilation|picture drama|music video|live action)\b/i.test(title)
  );
}

function inferSeasonKey(entry: AnimeFranchiseEntry) {
  const title = cleanWhitespace(entry.title);
  const normalized = title.toLowerCase();

  if (/final season/i.test(title)) {
    return "season-4";
  }

  const explicitSeason =
    normalized.match(/\bseason\s+(\d+)\b/i)?.[1] ??
    normalized.match(/\b(\d+)(?:st|nd|rd|th)\s+season\b/i)?.[1];
  if (explicitSeason) {
    return `season-${explicitSeason}`;
  }

  if (!isSupplementalAnimeEntry(entry)) {
    return "season-1";
  }

  return undefined;
}

function countDistinctSeasons(entries: AnimeFranchiseEntry[]) {
  const seasonKeys = new Set(
    entries
      .map((entry) => entry.seasonKey)
      .filter((seasonKey): seasonKey is string => Boolean(seasonKey)),
  );

  return seasonKeys.size || entries.length;
}

function collapseAnimeFranchises(items: JikanAnime[]): MediaItem[] {
  // Use enhanced franchise grouping that separates movies from series
  const animeItems = items.map(item => ({
    id: item.mal_id.toString(),
    title: getDisplayTitle(item),
    episodes: item.episodes ?? undefined,
    type: item.type ?? undefined,
    score: item.score ?? undefined,
    year: getAnimeYear(item) ?? undefined,
    originalItem: item
  }));
  
  const { franchises } = groupAnimeByFranchise(animeItems);
  
  // Process all franchise groups (movies and series together)
  const franchiseResults = franchises.map(([collectionTitle, entries]: [string, any[]]) => {
    const sortedByPriority = [...entries].sort((left: any, right: any) => {
      const scoreGap = (right.score ?? 0) - (left.score ?? 0);
      if (scoreGap !== 0) return scoreGap;
      return (left.year ?? 0) - (right.year ?? 0);
    });

    const representative = sortedByPriority[0];
    const years = entries.map((entry: any) => entry.year).filter((year: any): year is number => year !== undefined);
    const earliestYear = years.length ? Math.min(...years) : (representative.year ?? 0);
    const franchiseEntries = sortFranchiseEntries(entries.map((entry: any) => toFranchiseEntry(entry.originalItem)));
    const seasonEntries = franchiseEntries.filter((entry) => {
      const type = cleanWhitespace(entry.type ?? "").toLowerCase();
      return type === "tv" && !isSupplementalAnimeEntry(entry);
    });
    const seasonCount = countDistinctSeasons(
      seasonEntries.map((entry) => ({
        ...entry,
        seasonKey: inferSeasonKey(entry),
      })),
    );

    // Determine if this is mixed content (movies + series)
    const hasMovies = entries.some((entry: any) => entry.type === 'movie' || isAnimeMovie(entry.title, entry.episodes, entry.type));
    const hasSeries = entries.some((entry: any) => entry.type === 'tv' || !isAnimeMovie(entry.title, entry.episodes, entry.type));
    
    return mapAnime(
      representative.originalItem,
      undefined,
      {
        title: collectionTitle,
        collectionTitle,
        entryCount: entries.length,
        seasonCount: hasSeries ? seasonCount : undefined,
        entryLabel: hasMovies && hasSeries 
          ? `${entries.length} entries` 
          : hasMovies 
            ? `${entries.length} movies`
            : seasonCount > 1
              ? `${seasonCount} seasons`
              : representative.originalItem.episodes
                ? `${representative.originalItem.episodes} episodes`
                : undefined,
      },
    );
  });

  return franchiseResults.filter(isUsefulAnime);
}

export async function browseJikanAnime(params: JikanBrowseParams) {
  const page = Math.max(1, params.page ?? 1);
  const query = params.query?.trim();
  const genreParam = await buildGenreParam(params.genre);
  const sort = params.sort ?? "discovery";
  const discoverySeed = params.seed ?? 1;

  if (query) {
    const encoded = encodeURIComponent(query);
    const [textSearch1, textSearch2, ...fallbackResponses] = await Promise.all([
      jikanFetch<JikanListResponse>(`/anime?sfw=true&limit=25&page=1&q=${encoded}${genreParam}`).catch(() => ({
        data: [] as JikanAnime[],
        pagination: { current_page: 1, last_visible_page: 1 },
      })),
      jikanFetch<JikanListResponse>(`/anime?sfw=true&limit=25&page=2&q=${encoded}${genreParam}`).catch(() => ({
        data: [] as JikanAnime[],
        pagination: { current_page: 1, last_visible_page: 1 },
      })),
      jikanFetch<JikanListResponse>(`/anime?page=1&limit=25&sfw=true&order_by=members&sort=desc${genreParam}`).catch(() => ({
        data: [],
        pagination: { current_page: 1, last_visible_page: 1 },
      })),
      jikanFetch<JikanListResponse>(`/anime?page=2&limit=25&sfw=true&order_by=score&sort=desc${genreParam}`).catch(() => ({
        data: [],
        pagination: { current_page: 1, last_visible_page: 1 },
      })),
      jikanFetch<JikanListResponse>(`/anime?page=3&limit=25&sfw=true&order_by=favorites&sort=desc${genreParam}`).catch(() => ({
        data: [],
        pagination: { current_page: 1, last_visible_page: 1 },
      })),
    ]);
    const fromTextSearch = [...textSearch1.data, ...textSearch2.data].map((entry) => mapAnime(entry));
    const fromPopular = fallbackResponses.flatMap((response) => collapseAnimeFranchises(response.data));
    const fallbackItems = rankLocalSearchResults([...fromTextSearch, ...fromPopular], query).slice(0, 96);

    return {
      page: 1,
      totalPages: 1,
      totalResults: fallbackItems.length,
      items: fallbackItems,
    };
  }

  const discoveryOrder = ["members", "score", "favorites"][discoverySeed % 3];
  const requestPage = !query && sort === "discovery" ? getDiscoveryPage(page, discoverySeed, 180, 17) : page;

  const path = sort === "newest"
    ? `/anime?page=${page}&limit=25&sfw=true&order_by=start_date&sort=desc${genreParam}`
    : `/anime?page=${requestPage}&limit=25&sfw=true&order_by=${discoveryOrder}&sort=desc${genreParam}`;

  const payload = await jikanFetch<JikanListResponse>(path);
  const items = collapseAnimeFranchises(payload.data);

  return {
    page,
    totalPages: Math.max(1, payload.pagination.last_visible_page),
    totalResults: items.length,
    items,
  };
}

export async function getJikanAnimeDetails(id: number) {
  const details = await jikanFetch<{ data: JikanAnime }>(`/anime/${id}/full`).catch(() =>
    jikanFetch<{ data: JikanAnime }>(`/anime/${id}`),
  );
  const [characters, pictures, tmdbImages]: [
    JikanCharacterResponse,
    JikanPicturesResponse,
    TmdbAnimeImageEnrichment,
  ] = await Promise.all([
    jikanFetch<JikanCharacterResponse>(`/anime/${id}/characters`).catch(() => ({ data: [] })),
    jikanFetch<JikanPicturesResponse>(`/anime/${id}/pictures`).catch(() => ({ data: [] })),
    enrichAnimeImagesFromTmdb({
      titles: animeTitleVariants(details.data),
      year: getAnimeYear(details.data) || undefined,
    }).catch(
      () =>
        ({
          screenshots: [],
        }) satisfies TmdbAnimeImageEnrichment,
    ),
  ]);

  const canonicalTitle = normalizeAnimeBaseTitle(getDisplayTitle(details.data));
  const media = mapAnime(details.data, characters.data, {
    title: canonicalTitle,
    collectionTitle: canonicalTitle,
  });

  const pictureImages = pictures.data
    .map((entry) =>
      proxiedImageUrl(entry.jpg?.large_image_url) ??
      proxiedImageUrl(entry.webp?.large_image_url) ??
      proxiedImageUrl(entry.jpg?.image_url) ??
      proxiedImageUrl(entry.webp?.image_url),
    )
    .filter((value): value is string => Boolean(value));

  const tmdbGallery = dedupeImages([
    tmdbImages.backdropUrl,
    ...tmdbImages.screenshots,
  ]);
  const fallbackGallery = dedupeImages([
    ...pictureImages,
    ...(media.screenshots ?? []),
  ]);

  const mergedScreenshots =
    tmdbGallery.length >= 3
      ? tmdbGallery
      : dedupeImages([
          ...tmdbGallery,
          ...fallbackGallery.slice(0, 2),
        ]);

  return {
    ...media,
    coverUrl: tmdbImages.coverUrl ?? media.coverUrl,
    backdropUrl: tmdbImages.backdropUrl ?? tmdbImages.coverUrl ?? media.backdropUrl,
    screenshots: mergedScreenshots.slice(0, 10),
  };
}

export async function getJikanAnimeFranchise(id: number) {
  const details = await jikanFetch<{ data: JikanAnime }>(`/anime/${id}/full`);
  const relations = await jikanFetch<JikanRelationResponse>(`/anime/${id}/relations`).catch(() => ({ data: [] }));
  
  const franchiseTitles = animeTitleVariants(details.data).map((title) => normalizeAnimeBaseTitle(title));
  const primaryKeys = buildAnimeFranchiseKeys(animeTitleVariants(details.data), details.data.type);
  const primaryTitle = normalizeAnimeBaseTitle(getDisplayTitle(details.data));
  
  const allowedRelations = new Set([
    "Prequel",
    "Sequel",
    "Spin-off",
    "Side story",
    "Full story",
    "Parent story",
    "Alternative setting",
    "Alternative version",
  ]);
  const relatedIds = new Set<number>();
  relations.data.forEach((rel) => {
    if (allowedRelations.has(rel.relation)) {
      rel.entry.forEach((entry) => {
        if (entry.type === "anime") {
          relatedIds.add(entry.mal_id);
        }
      });
    }
  });

  // Also include the current anime
  relatedIds.add(id);

  const explicitRelationResponses = await Promise.all(
    Array.from(relatedIds).map((relatedId) =>
      jikanFetch<{ data: JikanAnime }>(`/anime/${relatedId}/full`)
        .then((response) => response.data)
        .catch(() => null),
    ),
  );

  const explicitEntries = explicitRelationResponses.filter((entry): entry is JikanAnime => Boolean(entry));

  // To avoid missing niche results, keep a search supplement for cases where the relation graph is sparse.
  const queries = Array.from(
    new Set([
      primaryTitle,
      cleanWhitespace(details.data.title),
      ...animeTitleVariants(details.data),
    ].filter(Boolean)),
  ).slice(0, 6);

  const searches = await Promise.all(
    queries.map((query) =>
      jikanFetch<JikanListResponse>(
        `/anime?q=${encodeURIComponent(query)}&limit=25&sfw=true&order_by=start_date&sort=asc`,
      ),
    ),
  );

  const searchResults = searches.flatMap((result) => result.data);
  const seen = new Set<number>();

  const allCandidates = [...explicitEntries, ...searchResults];

  const filteredEntries = allCandidates.filter((item) => {
    if (seen.has(item.mal_id)) {
      return false;
    }
    seen.add(item.mal_id);
    return relatedIds.has(item.mal_id) || (animeMatchesFranchise(item, franchiseTitles) && hasStrictAnimeFranchiseKeyMatch(item, primaryKeys));
  });

  const entries = sortFranchiseEntries(
    filteredEntries.map((item) => {
      const entry = toFranchiseEntry(item);
      return {
        ...entry,
        seasonKey: inferSeasonKey(entry),
      };
    }),
  );
  const seasonEntries = entries.filter((entry) => {
    const type = cleanWhitespace(entry.type ?? "").toLowerCase();
    return ["tv"].includes(type) && !isSupplementalAnimeEntry(entry);
  });
  const movieEntries = entries.filter((entry) => {
    const type = cleanWhitespace(entry.type ?? "").toLowerCase();
    const title = cleanWhitespace(entry.title).toLowerCase();
    return (
      type === "movie" &&
      !/\b(recap|compilation|summary|digest)\b/i.test(title)
    );
  });
  const seasonCount = countDistinctSeasons(seasonEntries);

  return {
    title: primaryTitle,
    entries,
    seasonEntries,
    movieEntries,
    seasonCount,
  };
}
