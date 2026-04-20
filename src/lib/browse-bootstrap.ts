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

export async function getBrowseBootstrapCatalog(seed: number) {
  const fallback = emptyBrowsePayload();
  
  // Load all media types with generous timeouts to ensure complete data
  const [movies, shows, anime, games] = await Promise.all([
    withTimeout(
      browseTmdbCatalog({ type: "movie", page: 1, query: "", genre: "", sort: "discovery", seed: seed + 1 }).catch(() => fallback),
      fallback,
      3000, // Increased from 900ms
    ),
    withTimeout(
      browseTmdbCatalog({ type: "show", page: 1, query: "", genre: "", sort: "discovery", seed: seed + 2 }).catch(() => fallback),
      fallback,
      3000, // Increased from 900ms
    ),
    withTimeout(
      browseJikanAnime({ page: 1, query: "", genre: "", sort: "discovery", seed: seed + 3 }).catch(() => fallback),
      fallback,
      4000, // Increased from 1200ms
    ),
    withTimeout(
      browseIgdbGames({ page: 1, query: "", genre: "", sort: "discovery", seed: seed + 4 }).catch(() => fallback),
      fallback,
      8000, // Increased from 2600ms to ensure games load
    ),
  ]);

  // Ensure we always have games by trying multiple strategies if needed
  let guaranteedGameItems = games.items;
  
  if (!guaranteedGameItems.length) {
    console.log("Primary games fetch failed, trying backup strategy...");
    guaranteedGameItems = (
      await withTimeout(
        browseIgdbGames({ page: 1, query: "", genre: "", sort: "rating", seed: seed + 44 }).catch(() => fallback),
        fallback,
        10000, // Increased from 3600ms
      )
    ).items;
  }
  
  // Final fallback - try with different parameters
  if (!guaranteedGameItems.length) {
    console.log("Backup games fetch failed, trying final fallback...");
    guaranteedGameItems = (
      await withTimeout(
        browseIgdbGames({ page: 1, query: "", genre: "", sort: "newest", seed: seed + 88 }).catch(() => fallback),
        fallback,
        12000, // Extended timeout for final attempt
      )
    ).items;
  }

  // Ensure we have items from each category, use fallbacks if needed
  const finalMovies = movies.items.length ? movies.items : fallback.items;
  const finalShows = shows.items.length ? shows.items : fallback.items;
  const finalAnime = anime.items.length ? anime.items : fallback.items;
  const finalGames = guaranteedGameItems.length ? guaranteedGameItems : fallback.items;

  console.log(`Browse catalog loaded - Movies: ${finalMovies.length}, Shows: ${finalShows.length}, Anime: ${finalAnime.length}, Games: ${finalGames.length}`);

  return dedupeItems(
    interleaveBootstrapBuckets(
      pickFirstUnique(finalMovies, 3),
      pickFirstUnique(finalShows, 3),
      pickFirstUnique(finalAnime, 3),
      pickFirstUnique(finalGames, 3),
    ),
  ).slice(0, 12);
}
