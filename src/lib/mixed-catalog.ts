import { browseIgdbGames } from "@/lib/sources/igdb";
import { browseJikanAnime } from "@/lib/sources/jikan";
import { browseTmdbCatalog } from "@/lib/sources/tmdb";
import { itemMatchesGenre } from "@/lib/catalog-utils";
import { rankCandidatesForQuery } from "@/lib/search-utils";
import { MediaItem } from "@/lib/types";

const MIXED_CACHE_TTL_MS = 1000 * 60 * 10;
const mixedCatalogCache = new Map<
  string,
  {
    expiresAt: number;
    payload: {
      page: number;
      totalPages: number;
      totalResults: number;
      items: MediaItem[];
    };
  }
>();
const mixedSourceFallbackCache = new Map<
  string,
  {
    expiresAt: number;
    payload: {
      page: number;
      totalPages: number;
      totalResults: number;
      items: MediaItem[];
    };
  }
>();
const mixedSourceWarmCache = new Map<
  "movie" | "show" | "anime" | "game",
  {
    expiresAt: number;
    payload: {
      page: number;
      totalPages: number;
      totalResults: number;
      items: MediaItem[];
    };
  }
>();

function rankSearchItems(items: MediaItem[], query: string, limit = 120) {
  if (!query.trim()) return items;
  return rankCandidatesForQuery(items, query, { limit, minRank: 8 });
}

function interleaveBuckets(...buckets: MediaItem[][]) {
  const working = buckets.map((bucket) => [...bucket]);
  const mixed: MediaItem[] = [];

  while (working.some((bucket) => bucket.length)) {
    for (const bucket of working) {
      if (bucket.length) {
        mixed.push(bucket.shift() as MediaItem);
      }
    }
  }

  return mixed;
}

function hashString(input: string) {
  return input.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

function shuffleBySeed(items: MediaItem[], seed: number) {
  return [...items]
    .map((item, index) => ({
      item,
      key: Math.sin(seed + hashString(item.id) + index) * 10000,
    }))
    .sort((left, right) => left.key - right.key)
    .map((entry) => entry.item);
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

function takeBalancedBuckets(buckets: MediaItem[][], perBucketTarget: number, totalTarget: number) {
  const working = buckets.map((bucket) => [...bucket]);
  const picked: MediaItem[] = [];

  for (const bucket of working) {
    picked.push(...bucket.splice(0, perBucketTarget));
  }

  if (picked.length >= totalTarget) {
    return picked.slice(0, totalTarget);
  }

  const overflow = interleaveBuckets(...working);
  return [...picked, ...overflow].slice(0, totalTarget);
}

function interleaveTypePriority(items: MediaItem[], totalTarget: number) {
  const buckets = {
    movie: items.filter((item) => item.type === "movie"),
    show: items.filter((item) => item.type === "show"),
    anime: items.filter((item) => item.type === "anime"),
    game: items.filter((item) => item.type === "game"),
  };

  const guaranteed = [
    ...buckets.movie.splice(0, 3),
    ...buckets.show.splice(0, 3),
    ...buckets.anime.splice(0, 3),
    ...buckets.game.splice(0, 3),
  ];

  const overflow = interleaveBuckets(buckets.movie, buckets.show, buckets.anime, buckets.game);
  return interleaveBuckets(
    guaranteed.filter((item) => item.type === "movie"),
    guaranteed.filter((item) => item.type === "show"),
    guaranteed.filter((item) => item.type === "anime"),
    guaranteed.filter((item) => item.type === "game"),
    overflow,
  ).slice(0, totalTarget);
}

function rotateBuckets<T>(items: T[], offset: number) {
  if (!items.length) return items;
  const normalizedOffset = ((offset % items.length) + items.length) % items.length;
  if (normalizedOffset === 0) return items;
  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)];
}

function buildDiscoverySlice(items: MediaItem[], seed: number, targetSize: number) {
  if (items.length <= targetSize) return items;

  const topBand = shuffleBySeed(items.slice(0, Math.min(12, items.length)), seed + 1).slice(0, Math.min(2, targetSize));
  const middleBand = shuffleBySeed(items.slice(12, Math.min(28, items.length)), seed + 2).slice(
    0,
    Math.min(3, Math.max(0, targetSize - topBand.length)),
  );
  const deepBand = shuffleBySeed(items.slice(28), seed + 3).slice(
    0,
    Math.max(0, targetSize - topBand.length - middleBand.length),
  );

  return dedupeBySource([...topBand, ...middleBand, ...deepBand]).slice(0, targetSize);
}

function emptyPayload(page: number) {
  return {
    page,
    totalPages: 1,
    totalResults: 0,
    items: [] as MediaItem[],
  };
}

function sourceFallbackKey(source: "movie" | "show" | "anime" | "game", page: number, query: string, genre: string, sort: string) {
  return JSON.stringify({ source, page, query, genre, sort });
}

function readSourceFallback(source: "movie" | "show" | "anime" | "game", page: number, query: string, genre: string, sort: string) {
  const key = sourceFallbackKey(source, page, query, genre, sort);
  const cached = mixedSourceFallbackCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const warmCached = mixedSourceWarmCache.get(source);
  if (warmCached && warmCached.expiresAt > Date.now()) {
    return {
      ...warmCached.payload,
      page,
    };
  }

  return emptyPayload(page);
}

function writeSourceFallback(
  source: "movie" | "show" | "anime" | "game",
  page: number,
  query: string,
  genre: string,
  sort: string,
  payload: {
    page: number;
    totalPages: number;
    totalResults: number;
    items: MediaItem[];
  },
) {
  mixedSourceFallbackCache.set(sourceFallbackKey(source, page, query, genre, sort), {
    expiresAt: Date.now() + MIXED_CACHE_TTL_MS,
    payload,
  });

  if (payload.items.length) {
    mixedSourceWarmCache.set(source, {
      expiresAt: Date.now() + MIXED_CACHE_TTL_MS,
      payload,
    });
  }
}

async function withTimeout<T>(work: Promise<T>, fallback: T, timeoutMs = 1800) {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function browseMixedCatalog({
  page,
  query,
  genre,
  sort,
  seed,
  pageSize = 24,
}: {
  page: number;
  query: string;
  genre: string;
  sort: "discovery" | "newest" | "rating" | "title";
  seed: number;
  pageSize?: number;
}) {
  const safePageSize = Math.min(36, Math.max(10, pageSize));
  const safeQuery = query.trim();
  const isSearch = Boolean(safeQuery);
  const cacheKey = JSON.stringify({ page, query: safeQuery, genre, sort, seed, pageSize: safePageSize });
  const cached = mixedCatalogCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const needsBroaderPool = Boolean((genre && genre !== "all") || safeQuery);
  const sourcePageSpan = isSearch ? 4 : genre && genre !== "all" ? 2 : 1;
  const sourcePages = isSearch
    ? Array.from({ length: sourcePageSpan }, (_, index) => index + 1)
    : Array.from(
        { length: needsBroaderPool ? Math.max(2, sourcePageSpan) : sourcePageSpan },
        (_, index) => page + index,
      );

  const pageResults = await Promise.all(
    sourcePages.map(async (sourcePage, index) => {
      const sourceSeed = seed + index;
      const [movieEntry, showEntry, animeEntry, gameEntry] = await Promise.all([
        withTimeout(
          browseTmdbCatalog({
            type: "movie",
            page: sourcePage,
            query: safeQuery,
            genre: "",
            sort,
            seed: sourceSeed + 1,
          }).then((payload) => {
            writeSourceFallback("movie", sourcePage, safeQuery, "", sort, payload);
            return payload;
          }),
          readSourceFallback("movie", sourcePage, safeQuery, "", sort),
          safeQuery ? 4200 : 1800,
        ),
        withTimeout(
          browseTmdbCatalog({
            type: "show",
            page: sourcePage,
            query: safeQuery,
            genre: "",
            sort,
            seed: sourceSeed + 2,
          }).then((payload) => {
            writeSourceFallback("show", sourcePage, safeQuery, "", sort, payload);
            return payload;
          }),
          readSourceFallback("show", sourcePage, safeQuery, "", sort),
          safeQuery ? 4200 : 1800,
        ),
        withTimeout(
          browseJikanAnime({
            page: sourcePage,
            query: safeQuery,
            genre: "",
            sort,
            seed: sourceSeed + 3,
          })
            .then((payload) => {
              writeSourceFallback("anime", sourcePage, safeQuery, "", sort, payload);
              return payload;
            })
            .catch(() => readSourceFallback("anime", sourcePage, safeQuery, "", sort)),
          readSourceFallback("anime", sourcePage, safeQuery, "", sort),
          safeQuery ? 6500 : 1800,
        ),
        withTimeout(
          browseIgdbGames({
            page: sourcePage,
            query: safeQuery,
            genre: "",
            sort,
            seed: sourceSeed + 4,
          })
            .then((payload) => {
              writeSourceFallback("game", sourcePage, safeQuery, "", sort, payload);
              return payload;
            })
            .catch(() => readSourceFallback("game", sourcePage, safeQuery, "", sort)),
          readSourceFallback("game", sourcePage, safeQuery, "", sort),
          safeQuery ? 5200 : 8500,
        ),
      ]);

      return { movieEntry, showEntry, animeEntry, gameEntry };
    }),
  );

  const searchPool = dedupeBySource(
    pageResults.flatMap(({ movieEntry, showEntry, animeEntry, gameEntry }) => [
      ...movieEntry.items,
      ...showEntry.items,
      ...animeEntry.items,
      ...gameEntry.items,
    ]),
  );

  const seededBuckets = pageResults.flatMap(({ movieEntry, showEntry, animeEntry, gameEntry }, index) => {
    const bucketSeed = seed + page + index;
    const bucketSize = Math.max(14, Math.ceil(safePageSize / 2));
    const useDiscoveryBlend = !safeQuery && sort === "discovery";

    return [
      useDiscoveryBlend
        ? buildDiscoverySlice(movieEntry.items, bucketSeed + 1, bucketSize)
        : rotateBuckets(shuffleBySeed(movieEntry.items, bucketSeed + 1), bucketSeed + 1).slice(0, bucketSize),
      useDiscoveryBlend
        ? buildDiscoverySlice(showEntry.items, bucketSeed + 2, bucketSize)
        : rotateBuckets(shuffleBySeed(showEntry.items, bucketSeed + 2), bucketSeed + 2).slice(0, bucketSize),
      useDiscoveryBlend
        ? buildDiscoverySlice(animeEntry.items, bucketSeed + 3, bucketSize)
        : rotateBuckets(shuffleBySeed(animeEntry.items, bucketSeed + 3), bucketSeed + 3).slice(0, bucketSize),
      useDiscoveryBlend
        ? buildDiscoverySlice(gameEntry.items, bucketSeed + 4, bucketSize)
        : rotateBuckets(shuffleBySeed(gameEntry.items, bucketSeed + 4), bucketSeed + 4).slice(0, bucketSize),
    ];
  });

  const mixed = dedupeBySource(
    safeQuery ? searchPool : takeBalancedBuckets(seededBuckets, Math.max(7, Math.ceil(safePageSize / 4)), safePageSize + 6),
  ).filter((item): item is MediaItem => Boolean(item));

  const filteredMixed =
    genre && genre !== "all" ? mixed.filter((item) => itemMatchesGenre(item, genre)) : mixed;

  const rankedMixed = safeQuery
    ? rankSearchItems(filteredMixed, safeQuery, Math.max(safePageSize * 4, 120))
    : interleaveTypePriority(
        rotateBuckets(shuffleBySeed(filteredMixed, seed + page), seed * 7 + page * 5),
        safePageSize,
      );

  let finalItems = rankedMixed;

  if (!safeQuery && !needsBroaderPool && page > 1) {
    const seenAcrossPages = new Set<string>();

    for (let previousPage = 1; previousPage < page; previousPage += 1) {
      const previousCacheKey = JSON.stringify({
        page: previousPage,
        query: safeQuery,
        genre,
        sort,
        seed,
        pageSize: safePageSize,
      });
      const previousPayload = mixedCatalogCache.get(previousCacheKey)?.payload;
      previousPayload?.items.forEach((item) => seenAcrossPages.add(`${item.source}-${item.sourceId}`));
    }

    if (seenAcrossPages.size) {
      finalItems = finalItems.filter((item) => !seenAcrossPages.has(`${item.source}-${item.sourceId}`));
    }
  }

  const maxSourcePages = pageResults.reduce((currentMax, entry) => {
    return Math.max(
      currentMax,
      entry.movieEntry.totalPages ?? 1,
      entry.showEntry.totalPages ?? 1,
      entry.animeEntry.totalPages ?? 1,
      entry.gameEntry.totalPages ?? 1,
    );
  }, 1);

  const payload = {
    page: isSearch ? 1 : page,
    totalPages: isSearch ? 1 : Math.max(1, maxSourcePages),
    totalResults: finalItems.length,
    items: finalItems,
  };

  mixedCatalogCache.set(cacheKey, {
    expiresAt: Date.now() + MIXED_CACHE_TTL_MS,
    payload,
  });

  return payload;
}
