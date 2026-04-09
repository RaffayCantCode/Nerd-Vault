import { browseIgdbGames } from "@/lib/sources/igdb";
import { browseJikanAnime } from "@/lib/sources/jikan";
import { browseTmdbCatalog } from "@/lib/sources/tmdb";
import { itemMatchesGenre } from "@/lib/catalog-utils";
import { itemMatchesSearch, searchScore } from "@/lib/search-utils";
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

function rankSearchItems(items: MediaItem[], query: string) {
  if (!query.trim()) return items;
  return [...items]
    .filter((item) => itemMatchesSearch(item, query))
    .sort((left, right) => {
    const scoreGap = searchScore(right, query) - searchScore(left, query);
    if (scoreGap !== 0) return scoreGap;
    return right.rating - left.rating || right.year - left.year;
  });
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
    ...buckets.movie.splice(0, 4),
    ...buckets.show.splice(0, 4),
    ...buckets.anime.splice(0, 4),
    ...buckets.game.splice(0, 7),
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

  const topBand = shuffleBySeed(items.slice(0, Math.min(8, items.length)), seed + 1).slice(0, Math.min(3, targetSize));
  const middleBand = shuffleBySeed(items.slice(8, Math.min(18, items.length)), seed + 2).slice(
    0,
    Math.min(2, Math.max(0, targetSize - topBand.length)),
  );
  const deepBand = shuffleBySeed(items.slice(18), seed + 3).slice(
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

async function getGuaranteedGameSlice(params: {
  page: number;
  query: string;
  sort: "discovery" | "newest" | "rating" | "title";
  seed: number;
}) {
  const gamePayload = await withTimeout(
    browseIgdbGames({
      page: params.page,
      query: params.query,
      genre: "",
      sort: params.sort === "title" ? "rating" : params.sort,
      seed: params.seed,
    }).catch(() => emptyPayload(params.page)),
    emptyPayload(params.page),
    params.query ? 7000 : 12000,
  );

  return gamePayload.items.slice(0, params.query ? 8 : 10);
}

export async function browseMixedCatalog({
  page,
  query,
  genre,
  sort,
  seed,
}: {
  page: number;
  query: string;
  genre: string;
  sort: "discovery" | "newest" | "rating" | "title";
  seed: number;
}) {
  const safeQuery = query.trim();
  const cacheKey = JSON.stringify({ page, query: safeQuery, genre, sort, seed });
  const cached = mixedCatalogCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const needsBroaderPool = Boolean((genre && genre !== "all") || safeQuery);
  const sourcePages = needsBroaderPool ? [page, page + 1] : [page];

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
    const bucketSize = needsBroaderPool ? 18 : 14;
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
    safeQuery ? searchPool : takeBalancedBuckets(seededBuckets, 7, 28),
  ).filter((item): item is MediaItem => Boolean(item));

  const filteredMixed =
    genre && genre !== "all" ? mixed.filter((item) => itemMatchesGenre(item, genre)) : mixed;

  const rankedMixed = safeQuery
    ? rankSearchItems(filteredMixed, safeQuery).slice(0, 24)
    : interleaveTypePriority(
        rotateBuckets(shuffleBySeed(filteredMixed, seed + page), seed * 7 + page * 5),
        24,
      );

  let finalItems = rankedMixed;

  if (!finalItems.some((item) => item.type === "game")) {
    const guaranteedGames = await getGuaranteedGameSlice({
      page,
      query: safeQuery,
      sort,
      seed: seed + 41,
    });

    if (guaranteedGames.length) {
      finalItems = dedupeBySource([...guaranteedGames, ...finalItems]).slice(0, 24);
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
    page,
    totalPages: Math.max(1, maxSourcePages),
    totalResults: finalItems.length,
    items: finalItems,
  };

  mixedCatalogCache.set(cacheKey, {
    expiresAt: Date.now() + MIXED_CACHE_TTL_MS,
    payload,
  });

  return payload;
}
