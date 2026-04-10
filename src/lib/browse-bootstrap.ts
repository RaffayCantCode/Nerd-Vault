import { browseIgdbGames } from "@/lib/sources/igdb";
import { browseJikanAnime } from "@/lib/sources/jikan";
import { browseTmdbCatalog } from "@/lib/sources/tmdb";
import { MediaItem } from "@/lib/types";

type BrowsePayload = {
  page: number;
  totalPages: number;
  totalResults: number;
  items: MediaItem[];
};

function emptyBrowsePayload(): BrowsePayload {
  return {
    page: 1,
    totalPages: 1,
    totalResults: 0,
    items: [],
  };
}

async function withTimeout<T>(work: Promise<T>, fallback: T, timeoutMs: number) {
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

function dedupeItems(items: MediaItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.source}-${item.sourceId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pickFirstUnique(items: MediaItem[], count: number) {
  return dedupeItems(items).slice(0, count);
}

function interleaveBootstrapBuckets(...buckets: MediaItem[][]) {
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

export async function getBrowseBootstrapCatalog(seed: number) {
  const fallback = emptyBrowsePayload();
  const [movies, shows, anime, games] = await Promise.all([
    withTimeout(
      browseTmdbCatalog({ type: "movie", page: 1, query: "", genre: "", sort: "discovery", seed: seed + 1 }).catch(() => fallback),
      fallback,
      900,
    ),
    withTimeout(
      browseTmdbCatalog({ type: "show", page: 1, query: "", genre: "", sort: "discovery", seed: seed + 2 }).catch(() => fallback),
      fallback,
      900,
    ),
    withTimeout(
      browseJikanAnime({ page: 1, query: "", genre: "", sort: "discovery", seed: seed + 3 }).catch(() => fallback),
      fallback,
      1200,
    ),
    withTimeout(
      browseIgdbGames({ page: 1, query: "", genre: "", sort: "discovery", seed: seed + 4 }).catch(() => fallback),
      fallback,
      2600,
    ),
  ]);

  const guaranteedGameItems = games.items.length
    ? games.items
    : (
        await withTimeout(
          browseIgdbGames({ page: 1, query: "", genre: "", sort: "rating", seed: seed + 44 }).catch(() => fallback),
          fallback,
          3600,
        )
      ).items;

  return dedupeItems(
    interleaveBootstrapBuckets(
      pickFirstUnique(movies.items, 3),
      pickFirstUnique(shows.items, 3),
      pickFirstUnique(anime.items, 3),
      pickFirstUnique(guaranteedGameItems, 3),
    ),
  ).slice(0, 12);
}
