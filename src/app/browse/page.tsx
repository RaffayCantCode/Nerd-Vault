import { unstable_noStore as noStore } from "next/cache";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { BrowseWorkspace } from "@/components/browse-workspace";
import { browseIgdbGames } from "@/lib/sources/igdb";
import { browseJikanAnime } from "@/lib/sources/jikan";
import { browseTmdbCatalog } from "@/lib/sources/tmdb";
import { MediaItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function emptyBrowsePayload() {
  return {
    page: 1,
    totalPages: 1,
    totalResults: 0,
    items: [] as MediaItem[],
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

function dedupeBootstrapItems(items: MediaItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.source}-${item.sourceId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

async function getBootstrapCatalog(seed: number) {
  const fallback = emptyBrowsePayload();
  const [movies, shows, anime, games] = await Promise.all([
    withTimeout(
      browseTmdbCatalog({ type: "movie", page: 1, query: "", genre: "", sort: "discovery", seed: seed + 1 }).catch(() => fallback),
      fallback,
      1200,
    ),
    withTimeout(
      browseTmdbCatalog({ type: "show", page: 1, query: "", genre: "", sort: "discovery", seed: seed + 2 }).catch(() => fallback),
      fallback,
      1200,
    ),
    withTimeout(
      browseJikanAnime({ page: 1, query: "", genre: "", sort: "discovery", seed: seed + 3 }).catch(() => fallback),
      fallback,
      1500,
    ),
    withTimeout(
      browseIgdbGames({ page: 1, query: "", genre: "", sort: "discovery", seed: seed + 4 }).catch(() => fallback),
      fallback,
      1800,
    ),
  ]);

  return dedupeBootstrapItems(
    interleaveBootstrapBuckets(
      movies.items.slice(0, 3),
      shows.items.slice(0, 3),
      anime.items.slice(0, 3),
      games.items.slice(0, 3),
    ),
  ).slice(0, 12);
}

export default async function BrowsePage() {
  noStore();
  const discoverySeed = Date.now() + Math.floor(Math.random() * 10_000);
  const bootstrapCatalog = await getBootstrapCatalog(discoverySeed);
  const session = await auth();
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;

  return (
    <div className="page-shell">
      <div className="app-shell-layout">
        <AppSidebar active="browse" />
        <main className="workspace">
          <AppTopBar
            viewerId={viewerId}
            viewerName={viewerName}
            viewerAvatar={viewerAvatar}
          />
          <BrowseWorkspace
            catalog={bootstrapCatalog}
            discoverySeed={discoverySeed}
            initialBootstrapPageSize={bootstrapCatalog.length || 12}
            initialTotalPages={30}
          />
        </main>
      </div>
    </div>
  );
}
