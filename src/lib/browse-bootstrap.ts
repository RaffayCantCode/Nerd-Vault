import { browseIgdbGames } from "@/lib/sources/igdb";
import { browseJikanAnime } from "@/lib/sources/jikan";
import { browseTmdbCatalog } from "@/lib/sources/tmdb";
import { MediaItem } from "@/lib/types";

const BOOTSTRAP_SOURCE_TTL_MS = 1000 * 60 * 30;
const DISCOVERY_SEED_WINDOW_MS = 1000 * 60 * 10;

type BootstrapSource = "movie" | "show" | "anime" | "game";

const bootstrapSourceCache = new Map<
  BootstrapSource,
  {
    expiresAt: number;
    items: MediaItem[];
  }
>();

type BrowsePayload = {
  page: number;
  totalPages: number;
  totalResults: number;
  items: MediaItem[];
};

type BootstrapCatalog = {
  surfacing: MediaItem[];
  catalog: MediaItem[];
};

export function getBrowseDiscoverySeed(timestamp = Date.now()) {
  return Math.floor(timestamp / DISCOVERY_SEED_WINDOW_MS) * 97;
}

function emptyBrowsePayload(): BrowsePayload {
  return {
    page: 1,
    totalPages: 1,
    totalResults: 0,
    items: [],
  };
}

async function withTimeout<T>(work: Promise<T>, fallback: T, timeoutMs: number) {
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

function readBootstrapSourceCache(source: BootstrapSource) {
  const cached = bootstrapSourceCache.get(source);
  if (!cached || cached.expiresAt <= Date.now()) {
    return null;
  }

  return cached.items;
}

function writeBootstrapSourceCache(source: BootstrapSource, items: MediaItem[]) {
  if (!items.length) {
    return;
  }

  bootstrapSourceCache.set(source, {
    expiresAt: Date.now() + BOOTSTRAP_SOURCE_TTL_MS,
    items: dedupeItems(items),
  });
}

function rotateBySeed(items: MediaItem[], seed: number) {
  if (!items.length) return items;
  const offset = Math.abs(seed) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

async function getBootstrapSource(source: BootstrapSource, seed: number) {
  const cached = readBootstrapSourceCache(source);
  if (cached?.length) {
    return rotateBySeed(cached, seed);
  }

  const fallback = emptyBrowsePayload();

  if (source === "movie" || source === "show") {
    const attempts = await Promise.all([
      withTimeout(
        browseTmdbCatalog({ type: source, page: 1, query: "", genre: "", sort: "discovery", seed }).catch(() => fallback),
        fallback,
        2200,
      ),
      withTimeout(
        browseTmdbCatalog({ type: source, page: 1, query: "", genre: "", sort: "rating", seed: seed + 11 }).catch(() => fallback),
        fallback,
        2600,
      ),
      withTimeout(
        browseTmdbCatalog({ type: source, page: 2, query: "", genre: "", sort: "discovery", seed: seed + 17 }).catch(() => fallback),
        fallback,
        2600,
      ),
    ]);
    const items = dedupeItems(attempts.flatMap((payload) => payload.items));
    writeBootstrapSourceCache(source, items);
    return rotateBySeed(items, seed);
  }

  if (source === "anime") {
    const attempts = await Promise.all([
      withTimeout(
        browseJikanAnime({ page: 1, query: "", genre: "", sort: "discovery", seed }).catch(() => fallback),
        fallback,
        2600,
      ),
      withTimeout(
        browseJikanAnime({ page: 1, query: "", genre: "", sort: "rating", seed: seed + 13 }).catch(() => fallback),
        fallback,
        3200,
      ),
      withTimeout(
        browseJikanAnime({ page: 2, query: "", genre: "", sort: "discovery", seed: seed + 19 }).catch(() => fallback),
        fallback,
        3200,
      ),
    ]);
    const items = dedupeItems(attempts.flatMap((payload) => payload.items));
    writeBootstrapSourceCache(source, items);
    return rotateBySeed(items, seed);
  }

  const gameAttempts = await Promise.all([
    withTimeout(
      browseIgdbGames({ page: 1, query: "", genre: "", sort: "discovery", seed }).catch(() => fallback),
      fallback,
      3400,
    ),
    withTimeout(
      browseIgdbGames({ page: 1, query: "", genre: "", sort: "rating", seed: seed + 17 }).catch(() => fallback),
      fallback,
      4200,
    ),
    withTimeout(
      browseIgdbGames({ page: 2, query: "", genre: "", sort: "discovery", seed: seed + 23 }).catch(() => fallback),
      fallback,
      4200,
    ),
  ]);
  const gameItems = dedupeItems(gameAttempts.flatMap((payload) => payload.items));

  writeBootstrapSourceCache("game", gameItems);
  return rotateBySeed(gameItems, seed);
}

export async function getBrowseBootstrapCatalog(seed: number): Promise<BootstrapCatalog> {
  const [movies, shows, anime, games] = await Promise.all([
    getBootstrapSource("movie", seed + 1),
    getBootstrapSource("show", seed + 2),
    getBootstrapSource("anime", seed + 3),
    getBootstrapSource("game", seed + 4),
  ]);

  const surfacing = dedupeItems([
    ...pickFirstUnique(movies, 1),
    ...pickFirstUnique(shows, 1),
    ...pickFirstUnique(games, 1),
    ...pickFirstUnique(anime, 1),
  ]).slice(0, 4);

  const catalog = dedupeItems(
    interleaveBootstrapBuckets(
      pickFirstUnique(movies, 3),
      pickFirstUnique(shows, 3),
      pickFirstUnique(anime, 3),
      pickFirstUnique(games, 3),
    ),
  ).slice(0, 12);

  return {
    surfacing,
    catalog,
  };
}
