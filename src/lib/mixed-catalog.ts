import { browseIgdbGames } from "@/lib/sources/igdb";
import { browseJikanAnime } from "@/lib/sources/jikan";
import { browseTmdbCatalog } from "@/lib/sources/tmdb";
import { itemMatchesGenre } from "@/lib/catalog-utils";
import { dedupeMediaKey, rankCandidatesForQuery, validateSearchResults } from "@/lib/search-utils";
import { MediaItem } from "@/lib/types";

const MIXED_CACHE_TTL_MS = 1000 * 60 * 10;
const SEARCH_FETCH_PAGES = 2;

type BrowsePayload = {
  page: number;
  totalPages: number;
  totalResults: number;
  items: MediaItem[];
};

type MixedSource = "movie" | "show" | "anime" | "game";

type SourcePlan = {
  allocation: number;
  sourceStartPage: number;
  pagesToFetch: number;
  startOffset: number;
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

function buildSourcePlans(pageSize: number, page: number) {
  const baseAllocation = Math.floor(pageSize / SOURCE_ORDER.length);
  const remainder = pageSize % SOURCE_ORDER.length;

  return SOURCE_ORDER.reduce<Record<MixedSource, SourcePlan>>((plans, source, index) => {
    const allocation = baseAllocation + (index < remainder ? 1 : 0);
    const sourcePageSize = SOURCE_PAGE_SIZES[source];
    const startIndex = Math.max(0, (page - 1) * allocation);
    const sourceStartPage = Math.floor(startIndex / sourcePageSize) + 1;
    const startOffset = startIndex % sourcePageSize;
    const pagesToFetch = Math.max(2, Math.ceil((startOffset + allocation + sourcePageSize) / sourcePageSize));

    plans[source] = {
      allocation,
      sourceStartPage,
      pagesToFetch,
      startOffset,
    };

    return plans;
  }, {} as Record<MixedSource, SourcePlan>);
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
  if (source === "movie" || source === "show") {
    return browseTmdbCatalog({
      type: source,
      page,
      query,
      genre,
      sort,
      seed,
      pageSize: SOURCE_PAGE_SIZES[source],
    });
  }

  if (source === "anime") {
    return browseJikanAnime({
      page,
      query,
      genre,
      sort,
      seed,
      pageSize: SOURCE_PAGE_SIZES[source],
    });
  }

  return browseIgdbGames({
    page,
    query,
    genre,
    sort,
    seed,
    pageSize: SOURCE_PAGE_SIZES[source],
  });
}

async function fetchSourceWindow(
  source: MixedSource,
  plan: SourcePlan,
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
  const pages = Array.from({ length: plan.pagesToFetch }, (_, index) => plan.sourceStartPage + index);
  const payloads = await Promise.all(
    pages.map((targetPage, index) =>
      fetchSourcePage(source, targetPage, {
        query,
        genre,
        sort,
        seed: seed + index,
      }).catch(() => ({
        page: targetPage,
        totalPages: 1,
        totalResults: 0,
        items: [] as MediaItem[],
      })),
    ),
  );

  const totalResults = payloads.find((payload) => payload.totalResults > 0)?.totalResults ?? 0;
  const items = dedupeBySource(
    payloads
      .flatMap((payload) => payload.items)
      .filter((item) => !genre || genre === "all" || itemMatchesGenre(item, genre)),
  );

  return {
    totalResults,
    items: sortMediaItems(items, sort),
  };
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
        pages.map((page) =>
          fetchSourcePage(source, page, {
            query,
            genre,
            sort,
            seed: seed + sourceIndex * 10 + page,
          }).catch(() => ({
            page,
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
    : await (async () => {
        const plans = buildSourcePlans(safePageSize, safePage);
        const windows = await Promise.all(
          SOURCE_ORDER.map(async (source, index) => {
            const result = await fetchSourceWindow(source, plans[source], {
              query: "",
              genre,
              sort,
              seed: seed + index * 100,
            });

            const primarySlice = result.items.slice(plans[source].startOffset, plans[source].startOffset + plans[source].allocation);
            const overflowSlice = result.items.slice(plans[source].startOffset + plans[source].allocation);

            return {
              source,
              totalResults: result.totalResults,
              primarySlice,
              overflowSlice,
            };
          }),
        );

        const pageItems = dedupeBySource(interleaveBuckets(...windows.map((entry) => entry.primarySlice)));
        const seenKeys = new Set(pageItems.map((item) => `${item.source}-${item.sourceId}`));
        const overflowItems = interleaveBuckets(...windows.map((entry) => entry.overflowSlice)).filter((item) => {
          const key = `${item.source}-${item.sourceId}`;
          if (seenKeys.has(key)) {
            return false;
          }
          seenKeys.add(key);
          return true;
        });
        const stableItems = validateSearchResults([...pageItems, ...overflowItems].slice(0, safePageSize));
        const totalResults = windows.reduce((sum, entry) => sum + entry.totalResults, 0);

        return {
          page: safePage,
          totalPages: Math.max(1, Math.ceil(totalResults / safePageSize)),
          totalResults,
          items: stableItems,
        } satisfies BrowsePayload;
      })();

  mixedCatalogCache.set(cacheKey, {
    expiresAt: Date.now() + MIXED_CACHE_TTL_MS,
    payload,
  });

  return payload;
}
