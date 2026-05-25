import { browseIgdbGames } from "@/lib/sources/igdb";
import { browseAniListAnime } from "@/lib/sources/anilist";
import { browseTmdbCatalog } from "@/lib/sources/tmdb";
import {
  hasActiveBrowseGenre,
  itemMatchesGenre,
  resolveBrowseGenreForSource,
} from "@/lib/catalog-utils";
import { dedupeMediaKey, rankCandidatesForQuery, validateSearchResults } from "@/lib/search-utils";
import { MediaItem } from "@/lib/types";
import {
  isServerlessDeploy,
  MIXED_GENRE_MAX_API_PAGES,
  MIXED_GENRE_MAX_DEPTH_ROUNDS,
} from "@/lib/serverless-limits";

const MIXED_CACHE_TTL_MS = 1000 * 60 * 30;
const SEARCH_FETCH_PAGES = 2;
const MIXED_CACHE_VERSION = "interleaved-v5";
const GENRE_MAX_API_PAGES = MIXED_GENRE_MAX_API_PAGES;
const GENRE_FETCH_TIMEOUT_MS = isServerlessDeploy ? 4500 : 7000;
const DEFAULT_FETCH_TIMEOUT_MS = isServerlessDeploy ? 4000 : 5000;

type BrowsePayload = {
  page: number;
  totalPages: number;
  totalResults: number;
  items: MediaItem[];
};

type MixedSource = "movie" | "show" | "anime" | "game";

type InterleavedSlot = {
  source: MixedSource;
  nativeIndex: number;
  globalIndex: number;
};

const SOURCE_ORDER: MixedSource[] = ["movie", "show", "anime", "game"];
const SOURCE_PAGE_SIZES: Record<MixedSource, number> = {
  movie: 20,
  show: 20,
  anime: 25,
  game: 24,
};

const mixedCatalogCache = new Map<
  string,
  {
    expiresAt: number;
    payload: BrowsePayload;
  }
>();

async function withTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });

  return Promise.race([
    promise.then((result) => {
      if (timeoutId) clearTimeout(timeoutId);
      return result;
    }),
    timeoutPromise,
  ]);
}

function mediaKey(item: MediaItem) {
  return `${item.source}-${item.sourceId}`;
}

function dedupeBySource(items: MediaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = mediaKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function sortMediaItems(
  items: MediaItem[],
  sort: "discovery" | "newest" | "rating" | "title",
) {
  if (sort === "title") {
    return [...items].sort((left, right) => left.title.localeCompare(right.title) || (right.year || 0) - (left.year || 0));
  }

  if (sort === "newest") {
    return [...items].sort((left, right) => (right.year || 0) - (left.year || 0) || right.rating - left.rating || left.title.localeCompare(right.title));
  }

  if (sort === "rating") {
    return [...items].sort((left, right) => right.rating - left.rating || (right.year || 0) - (left.year || 0) || left.title.localeCompare(right.title));
  }

  return items;
}

function planInterleavedPage(pageSize: number, page: number) {
  const globalStart = (page - 1) * pageSize;
  const globalEnd = page * pageSize;
  const slots: InterleavedSlot[] = [];
  const maxNativeBySource: Record<MixedSource, number> = {
    movie: 0,
    show: 0,
    anime: 0,
    game: 0,
  };

  for (let globalIndex = globalStart; globalIndex < globalEnd; globalIndex += 1) {
    const sourceIndex = globalIndex % SOURCE_ORDER.length;
    const source = SOURCE_ORDER[sourceIndex];
    const nativeIndex = Math.floor(globalIndex / SOURCE_ORDER.length);
    slots.push({ source, nativeIndex, globalIndex });
    maxNativeBySource[source] = Math.max(maxNativeBySource[source], nativeIndex);
  }

  return { slots, maxNativeBySource, globalStart, globalEnd };
}

function estimateInterleavedCapacity(counts: Record<MixedSource, number>) {
  let maxGlobalEnd = 0;

  SOURCE_ORDER.forEach((source, sourceIndex) => {
    const count = counts[source] ?? 0;
    if (count > 0) {
      maxGlobalEnd = Math.max(maxGlobalEnd, (count - 1) * SOURCE_ORDER.length + sourceIndex + 1);
    }
  });

  return maxGlobalEnd;
}

async function fetchSourcePage(
  source: MixedSource,
  page: number,
  {
    query,
    genre,
    sort,
    seed,
  }: {
    query: string;
    genre: string;
    sort: "discovery" | "newest" | "rating" | "title";
    seed: number;
  },
) {
  const apiGenre = resolveBrowseGenreForSource(genre, source) || genre;

  if (source === "movie" || source === "show") {
    return browseTmdbCatalog({
      type: source,
      page,
      query,
      genre: apiGenre,
      sort,
      seed,
      pageSize: SOURCE_PAGE_SIZES[source],
    });
  }

  if (source === "anime") {
    return browseAniListAnime({
      page,
      query,
      genre: apiGenre,
      sort,
      seed,
      pageSize: SOURCE_PAGE_SIZES[source],
    });
  }

  return browseIgdbGames({
    page,
    query,
    genre: apiGenre,
    sort,
    seed,
    pageSize: SOURCE_PAGE_SIZES[source],
  });
}

async function fetchSourceCatalogUpTo(
  source: MixedSource,
  maxNativeIndex: number,
  {
    query,
    genre,
    sort,
    seed,
  }: {
    query: string;
    genre: string;
    sort: "discovery" | "newest" | "rating" | "title";
    seed: number;
  },
) {
  const genreActive = hasActiveBrowseGenre(genre);
  const minItemsNeeded = maxNativeIndex + 1;
  const perPage = SOURCE_PAGE_SIZES[source];
  const maxApiPages = genreActive
    ? GENRE_MAX_API_PAGES
    : Math.max(3, Math.ceil(minItemsNeeded / perPage) + 3);
  const collected: MediaItem[] = [];
  let totalResults = 0;
  let lastApiTotalPages = 1;
  let emptyStreak = 0;

  for (let apiPage = 1; apiPage <= maxApiPages; apiPage += 1) {
    const payload = await withTimeout(
      fetchSourcePage(source, apiPage, { query, genre, sort, seed }),
      {
        page: apiPage,
        totalPages: 1,
        totalResults: 0,
        items: [] as MediaItem[],
      },
      query ? 3000 : genreActive ? GENRE_FETCH_TIMEOUT_MS : DEFAULT_FETCH_TIMEOUT_MS,
    ).catch(() => ({
      page: apiPage,
      totalPages: 1,
      totalResults: 0,
      items: [] as MediaItem[],
    }));

    lastApiTotalPages = Math.max(1, payload.totalPages || 1);
    totalResults = Math.max(totalResults, payload.totalResults || 0);

    let acceptedThisPage = 0;
    for (const item of payload.items) {
      if (!genreActive || itemMatchesGenre(item, genre)) {
        collected.push(item);
        acceptedThisPage += 1;
      }
    }

    emptyStreak = acceptedThisPage === 0 ? emptyStreak + 1 : 0;

    const sorted = sortMediaItems(dedupeBySource(collected), sort);
    if (sorted.length >= minItemsNeeded) {
      return { items: sorted, totalResults };
    }

    if (!genreActive && apiPage >= lastApiTotalPages) {
      return { items: sorted, totalResults };
    }

    if (genreActive && apiPage >= lastApiTotalPages && emptyStreak >= 2) {
      return { items: sorted, totalResults };
    }

    if (genreActive && apiPage >= maxApiPages) {
      return { items: sorted, totalResults };
    }
  }

  return {
    items: sortMediaItems(dedupeBySource(collected), sort),
    totalResults,
  };
}

function fillInterleavedSlots(
  slots: InterleavedSlot[],
  catalogBySource: Record<MixedSource, MediaItem[]>,
  globalEnd: number,
  pageSize: number,
) {
  const usedOnPage = new Set<string>();

  function takeAtGlobalIndex(globalIndex: number) {
    const source = SOURCE_ORDER[globalIndex % SOURCE_ORDER.length];
    const nativeIndex = Math.floor(globalIndex / SOURCE_ORDER.length);
    const candidate = catalogBySource[source][nativeIndex];
    if (!candidate) {
      return null;
    }

    const key = mediaKey(candidate);
    if (usedOnPage.has(key)) {
      return null;
    }

    usedOnPage.add(key);
    return candidate;
  }

  const pageSlots: Array<MediaItem | null> = slots.map((slot) => takeAtGlobalIndex(slot.globalIndex));

  let cursor = globalEnd;
  const maxCursor = globalEnd + pageSize * SOURCE_ORDER.length * 4;

  for (let slotIndex = 0; slotIndex < pageSlots.length; slotIndex += 1) {
    if (pageSlots[slotIndex]) {
      continue;
    }

    while (cursor < maxCursor && !pageSlots[slotIndex]) {
      pageSlots[slotIndex] = takeAtGlobalIndex(cursor);
      cursor += 1;
    }
  }

  return pageSlots.filter((item): item is MediaItem => item !== null);
}

async function loadCatalogsForPage({
  genre,
  sort,
  seed,
  bufferedMaxNative,
}: {
  genre: string;
  sort: "discovery" | "newest" | "rating" | "title";
  seed: number;
  bufferedMaxNative: Record<MixedSource, number>;
}) {
  const catalogs = await Promise.all(
    SOURCE_ORDER.map((source, index) =>
      fetchSourceCatalogUpTo(source, bufferedMaxNative[source], {
        query: "",
        genre,
        sort,
        seed: seed + index * 100,
      }),
    ),
  );

  return SOURCE_ORDER.reduce(
    (acc, source, index) => {
      acc[source] = catalogs[index].items;
      return acc;
    },
    {} as Record<MixedSource, MediaItem[]>,
  );
}

async function buildInterleavedBrowsePage({
  page,
  pageSize,
  genre,
  sort,
  seed,
}: {
  page: number;
  pageSize: number;
  genre: string;
  sort: "discovery" | "newest" | "rating" | "title";
  seed: number;
}) {
  const genreActive = hasActiveBrowseGenre(genre);
  const { slots, maxNativeBySource, globalEnd } = planInterleavedPage(pageSize, page);

  const baseBuffer = Math.ceil(pageSize / SOURCE_ORDER.length) + 4;
  const genreBufferBoost = genreActive ? Math.ceil(pageSize / 2) : 0;
  let extraDepth = 0;
  const maxDepthRounds = genreActive ? MIXED_GENRE_MAX_DEPTH_ROUNDS : isServerlessDeploy ? 1 : 2;

  let bufferedMaxNative = SOURCE_ORDER.reduce(
    (acc, source) => {
      acc[source] = maxNativeBySource[source] + baseBuffer + genreBufferBoost;
      return acc;
    },
    {} as Record<MixedSource, number>,
  );

  let catalogBySource = await loadCatalogsForPage({ genre, sort, seed, bufferedMaxNative });
  let pageItems = fillInterleavedSlots(slots, catalogBySource, globalEnd, pageSize);

  while (pageItems.length < pageSize && extraDepth < maxDepthRounds) {
    const previousLengths = SOURCE_ORDER.map((source) => catalogBySource[source].length);
    extraDepth += 1;
    const step = Math.ceil(pageSize / SOURCE_ORDER.length) + 2;

    bufferedMaxNative = SOURCE_ORDER.reduce(
      (acc, source) => {
        acc[source] = bufferedMaxNative[source] + step;
        return acc;
      },
      {} as Record<MixedSource, number>,
    );

    catalogBySource = await loadCatalogsForPage({ genre, sort, seed, bufferedMaxNative });
    const nextItems = fillInterleavedSlots(slots, catalogBySource, globalEnd, pageSize);
    if (nextItems.length <= pageItems.length) {
      const grew = SOURCE_ORDER.some((source, index) => catalogBySource[source].length > previousLengths[index]);
      if (!grew) {
        break;
      }
    }
    pageItems = nextItems;
  }

  const counts = SOURCE_ORDER.reduce(
    (acc, source) => {
      acc[source] = catalogBySource[source].length;
      return acc;
    },
    {} as Record<MixedSource, number>,
  );

  const interleavedCapacity = estimateInterleavedCapacity(counts);
  const totalPages = Math.max(1, Math.ceil(interleavedCapacity / pageSize));

  return {
    page,
    totalPages,
    totalResults: interleavedCapacity,
    items: validateSearchResults(pageItems.slice(0, pageSize)),
  } satisfies BrowsePayload;
}

async function buildSearchPayload({
  query,
  genre,
  sort,
  seed,
  pageSize,
}: {
  query: string;
  genre: string;
  sort: "discovery" | "newest" | "rating" | "title";
  seed: number;
  pageSize: number;
}) {
  const perSourceResults = await Promise.all(
    SOURCE_ORDER.map(async (source, sourceIndex) => {
      const pages = Array.from({ length: SEARCH_FETCH_PAGES }, (_, index) => index + 1);
      const payloads = await Promise.all(
        pages.map((apiPage) =>
          withTimeout(
            fetchSourcePage(source, apiPage, {
              query,
              genre,
              sort,
              seed: seed + sourceIndex * 10,
            }),
            {
              page: apiPage,
              totalPages: 1,
              totalResults: 0,
              items: [] as MediaItem[],
            },
            2500,
          ).catch(() => ({
            page: apiPage,
            totalPages: 1,
            totalResults: 0,
            items: [] as MediaItem[],
          })),
        ),
      );

      return payloads.flatMap((payload) => payload.items);
    }),
  );

  const pool = dedupeMediaKey(
    perSourceResults
      .flat()
      .filter((item) => !genre || genre === "all" || itemMatchesGenre(item, genre)),
  );
  const ranked = rankCandidatesForQuery(pool, query, {
    limit: Math.max(pageSize * 4, 192),
    minRank: 8,
  });

  return {
    page: 1,
    totalPages: 1,
    totalResults: ranked.length,
    items: validateSearchResults(ranked.slice(0, pageSize)),
  } satisfies BrowsePayload;
}

export async function browseMixedCatalog({
  page,
  query,
  genre,
  sort,
  seed,
  pageSize = 48,
}: {
  page: number;
  query: string;
  genre: string;
  sort: "discovery" | "newest" | "rating" | "title";
  seed: number;
  pageSize?: number;
}) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(72, Math.max(16, pageSize));
  const safeQuery = query.trim();
  const cacheKey = JSON.stringify({
    v: MIXED_CACHE_VERSION,
    page: safePage,
    query: safeQuery,
    genre,
    sort,
    seed,
    pageSize: safePageSize,
  });
  const cached = mixedCatalogCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const payload = safeQuery
    ? await buildSearchPayload({
        query: safeQuery,
        genre,
        sort,
        seed,
        pageSize: safePageSize,
      })
    : await buildInterleavedBrowsePage({
        page: safePage,
        pageSize: safePageSize,
        genre,
        sort,
        seed,
      });

  mixedCatalogCache.set(cacheKey, {
    expiresAt: Date.now() + MIXED_CACHE_TTL_MS,
    payload,
  });

  return payload;
}
