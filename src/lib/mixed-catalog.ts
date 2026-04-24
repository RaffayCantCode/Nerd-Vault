import { browseIgdbGames } from "@/lib/sources/igdb";
import { browseJikanAnime } from "@/lib/sources/jikan";
import { browseTmdbCatalog } from "@/lib/sources/tmdb";
import { itemMatchesGenre } from "@/lib/catalog-utils";
import { rankCandidatesForQuery, validateSearchResults, dedupeMediaKey } from "@/lib/search-utils";
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

function flattenBuckets(buckets: MediaItem[][]) {
  return buckets.flatMap((bucket) => bucket);
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

function buildBalancedPageFromBuckets(
  buckets: Record<"movie" | "show" | "anime" | "game", MediaItem[]>,
  page: number,
  pageSize: number,
) {
  const types: Array<"movie" | "show" | "anime" | "game"> = ["movie", "show", "anime", "game"];
  const perTypeTarget = Math.max(1, Math.floor(pageSize / types.length));
  const remainderTarget = Math.max(0, pageSize - perTypeTarget * types.length);
  const startIndex = Math.max(0, (page - 1) * perTypeTarget);

  const selectedByType = types.map((type) => buckets[type].slice(startIndex, startIndex + perTypeTarget));
  const underfilled = selectedByType.some((bucket) => bucket.length < perTypeTarget);
  const selectedKeys = new Set(
    flattenBuckets(selectedByType).map((item) => `${item.source}-${item.sourceId}`),
  );
  const overflow = interleaveBuckets(
    ...types.map((type) => buckets[type].filter((item) => !selectedKeys.has(`${item.source}-${item.sourceId}`))),
  );
  const filledTypes = selectedByType.map((bucket) => [...bucket]);

  if (underfilled) {
    for (const bucket of filledTypes) {
      while (bucket.length < perTypeTarget && overflow.length) {
        bucket.push(overflow.shift() as MediaItem);
      }
    }
  }

  const interleaved = interleaveBuckets(...filledTypes);
  if (remainderTarget <= 0) {
    return interleaved.slice(0, pageSize);
  }

  return [...interleaved, ...overflow.slice(0, remainderTarget)].slice(0, pageSize);
}

function estimateBalancedTotalPages(
  buckets: Record<"movie" | "show" | "anime" | "game", MediaItem[]>,
  pageSize: number,
) {
  const perTypeTarget = Math.max(1, Math.floor(pageSize / 4));
  const typeCounts = [buckets.movie.length, buckets.show.length, buckets.anime.length, buckets.game.length];
  const guaranteedPages = Math.max(1, Math.floor(Math.min(...typeCounts) / perTypeTarget));
  return guaranteedPages;
}

function buildTypeBucket(
  items: MediaItem[],
  {
    sort,
    seed,
    minTarget,
  }: {
    sort: "discovery" | "newest" | "rating" | "title";
    seed: number;
    minTarget: number;
  },
) {
  const uniqueItems = dedupeBySource(items);
  if (!uniqueItems.length) {
    return [] as MediaItem[];
  }

  const orderedItems =
    sort === "discovery"
      ? buildDiscoverySlice(uniqueItems, seed, Math.min(uniqueItems.length, Math.max(minTarget, 18)))
      : rotateBuckets(shuffleBySeed(uniqueItems, seed), seed);

  return dedupeBySource(orderedItems);
}

function buildDiscoverySlice(items: MediaItem[], seed: number, targetSize: number) {
  if (items.length <= targetSize) return items;

  // Sort items by rating to identify different tiers
  const sortedByRating = [...items].sort((a, b) => b.rating - a.rating);
  const totalItems = sortedByRating.length;
  
  // More aggressive discovery tiers - reduce popular content significantly
  const popularThreshold = Math.max(8.5, Math.min(9.5, sortedByRating[Math.floor(totalItems * 0.05)]?.rating || 8.5));
  const underratedThreshold = Math.max(6.5, Math.min(7.5, sortedByRating[Math.floor(totalItems * 0.4)]?.rating || 6.5));
  const hiddenGemThreshold = Math.max(5, Math.min(6, sortedByRating[Math.floor(totalItems * 0.7)]?.rating || 5));
  
  const popular = sortedByRating.filter(item => item.rating >= popularThreshold);
  const underrated = sortedByRating.filter(item => item.rating >= underratedThreshold && item.rating < popularThreshold);
  const hiddenGems = sortedByRating.filter(item => item.rating >= hiddenGemThreshold && item.rating < underratedThreshold);
  const deepCuts = sortedByRating.filter(item => item.rating >= 4 && item.rating < hiddenGemThreshold);
  
  // Create discovery mix: 15% popular, 25% underrated, 35% hidden gems, 25% deep cuts
  const popularCount = Math.max(0, Math.floor(targetSize * 0.15));
  const underratedCount = Math.max(1, Math.floor(targetSize * 0.25));
  const hiddenGemCount = Math.max(2, Math.floor(targetSize * 0.35));
  const deepCutCount = targetSize - popularCount - underratedCount - hiddenGemCount;
  
  const selectedPopular = shuffleBySeed(popular, seed + 1).slice(0, popularCount);
  const selectedUnderrated = shuffleBySeed(underrated, seed + 2).slice(0, underratedCount);
  const selectedHiddenGems = shuffleBySeed(hiddenGems, seed + 3).slice(0, hiddenGemCount);
  const selectedDeepCuts = shuffleBySeed(deepCuts, seed + 4).slice(0, deepCutCount);
  
  // If we don't have enough items in any category, fill from others
  const discoveryMix = [...selectedPopular, ...selectedUnderrated, ...selectedHiddenGems, ...selectedDeepCuts];
  const remaining = targetSize - discoveryMix.length;
  
  if (remaining > 0) {
    const fillerItems = shuffleBySeed(
      sortedByRating.filter(item => !discoveryMix.includes(item)), 
      seed + 5
    ).slice(0, remaining);
    discoveryMix.push(...fillerItems);
  }

  // Add variety by year - ensure we get items from different decades
  const currentYear = new Date().getFullYear();
  const decades = [2020, 2010, 2000, 1990, 1980];
  const yearVarietyItems = discoveryMix.filter(item => {
    const itemYear = item.year || 2020;
    return decades.some(decade => 
      itemYear >= decade && itemYear < decade + 10
    );
  });

  return dedupeBySource(discoveryMix).slice(0, targetSize);
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
  let timer: ReturnType<typeof setTimeout> | undefined;
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
  const safePageSize = Math.min(96, Math.max(10, pageSize));
  const safeQuery = query.trim();
  const isSearch = Boolean(safeQuery);
  const cacheKey = JSON.stringify({ page, query: safeQuery, genre, sort, seed, pageSize: safePageSize });
  const cached = mixedCatalogCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const needsBroaderPool = Boolean((genre && genre !== "all") || safeQuery);
  const sourcePageSpan = isSearch ? 1 : Math.max(2, page + (needsBroaderPool ? 1 : 0));
  const sourcePages = Array.from({ length: sourcePageSpan }, (_, index) => index + 1);

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
          safeQuery ? 4200 : 1800,
        ),
      ]);

      return { movieEntry, showEntry, animeEntry, gameEntry };
    }),
  );

  const searchPool = dedupeMediaKey(
    pageResults.flatMap(({ movieEntry, showEntry, animeEntry, gameEntry }) => [
      ...movieEntry.items,
      ...showEntry.items,
      ...animeEntry.items,
      ...gameEntry.items,
    ]),
  );

  const perTypeTarget = Math.max(1, Math.floor(safePageSize / 4));
  const minimumBucketSize = Math.max(safePageSize, (page + 1) * perTypeTarget);
  const allBuckets = safeQuery
    ? {
        movie: [] as MediaItem[],
        show: [] as MediaItem[],
        anime: [] as MediaItem[],
        game: [] as MediaItem[],
      }
    : {
        movie: buildTypeBucket(
          pageResults.flatMap(({ movieEntry }) => movieEntry.items).filter((item) => !genre || genre === "all" || itemMatchesGenre(item, genre)),
          { sort, seed: seed + 101, minTarget: minimumBucketSize },
        ),
        show: buildTypeBucket(
          pageResults.flatMap(({ showEntry }) => showEntry.items).filter((item) => !genre || genre === "all" || itemMatchesGenre(item, genre)),
          { sort, seed: seed + 202, minTarget: minimumBucketSize },
        ),
        anime: buildTypeBucket(
          pageResults.flatMap(({ animeEntry }) => animeEntry.items).filter((item) => !genre || genre === "all" || itemMatchesGenre(item, genre)),
          { sort, seed: seed + 303, minTarget: minimumBucketSize },
        ),
        game: buildTypeBucket(
          pageResults.flatMap(({ gameEntry }) => gameEntry.items).filter((item) => !genre || genre === "all" || itemMatchesGenre(item, genre)),
          { sort, seed: seed + 404, minTarget: minimumBucketSize },
        ),
      };

  const filteredMixed = safeQuery
    ? (genre && genre !== "all" ? searchPool.filter((item) => itemMatchesGenre(item, genre)) : searchPool)
    : dedupeMediaKey(
        interleaveBuckets(allBuckets.movie, allBuckets.show, allBuckets.anime, allBuckets.game),
      ).filter((item): item is MediaItem => Boolean(item));

  const rankedMixed = safeQuery
    ? rankSearchItems(filteredMixed, safeQuery, Math.max(safePageSize * 6, 180))
    : interleaveTypePriority(
        rotateBuckets(shuffleBySeed(filteredMixed, seed + page * 13), seed * 7 + page * 11),
        safePageSize,
      );

  const maxSourcePages = pageResults.reduce((currentMax: number, entry: any) => {
    return Math.max(
      currentMax,
      entry.movieEntry.totalPages ?? 1,
      entry.showEntry.totalPages ?? 1,
      entry.animeEntry.totalPages ?? 1,
      entry.gameEntry.totalPages ?? 1,
    );
  }, 1);

  const finalItems = safeQuery
    ? rankedMixed.slice(0, safePageSize)
    : buildBalancedPageFromBuckets(allBuckets, page, safePageSize);

  const validatedItems = validateSearchResults(finalItems);
  const totalPages = safeQuery
    ? 1
    : estimateBalancedTotalPages(allBuckets, safePageSize);

  const payload = {
    page: isSearch ? 1 : page,
    totalPages: isSearch ? 1 : Math.max(1, Math.min(maxSourcePages, totalPages)),
    totalResults: validatedItems.length,
    items: validatedItems.slice(0, safePageSize),
  };

  mixedCatalogCache.set(cacheKey, {
    expiresAt: Date.now() + MIXED_CACHE_TTL_MS,
    payload,
  });

  return payload;
}
