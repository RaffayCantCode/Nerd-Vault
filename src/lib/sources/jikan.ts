/**
 * Jikan v4 (MyAnimeList wrapper) client.
 * Used to fetch per-episode data for anime series — episode titles, air dates, and filler flags.
 * Rate limit: 60 req/min, 3 req/sec. We use server-side caching to stay well within limits.
 */

const JIKAN_BASE_URL = "https://api.jikan.moe/v4";
const JIKAN_CACHE_TTL_MS = 1000 * 60 * 30;

export type JikanEpisode = {
  mal_id: number;
  title: string | null;
  title_japanese: string | null;
  aired: string | null;
  score: number | null;
  filler: boolean;
  recap: boolean;
  url: string | null;
};

type JikanEpisodesResponse = {
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
  };
  data: JikanEpisode[];
};

const jikanCache = new Map<string, { expiresAt: number; payload: unknown }>();

async function jikanFetch<T>(path: string): Promise<T> {
  const cacheKey = path;
  const cached = jikanCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload as T;
  }

  const response = await fetch(`${JIKAN_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    if (response.status === 404) {
      // Return a typed empty response rather than throwing — many anime entries
      // exist in AniList but don't have MAL pages with structured episode data.
      return { pagination: { last_visible_page: 1, has_next_page: false }, data: [] } as T;
    }
    throw new Error(`Jikan request failed: ${response.status}`);
  }

  const payload = (await response.json()) as T;
  jikanCache.set(cacheKey, {
    expiresAt: Date.now() + JIKAN_CACHE_TTL_MS,
    payload,
  });

  return payload;
}

/** Fetch a single page of episodes for an anime by its MAL ID. */
export async function getJikanAnimeEpisodes(
  malId: number,
  page: number = 1,
): Promise<JikanEpisodesResponse> {
  return jikanFetch<JikanEpisodesResponse>(`/anime/${malId}/episodes?page=${page}`);
}

/** Fetch ALL episodes for an anime, up to a reasonable cap (500 episodes / 10 pages). */
export async function getAllJikanAnimeEpisodes(malId: number): Promise<JikanEpisode[]> {
  const MAX_PAGES = 10;
  const firstPage = await getJikanAnimeEpisodes(malId, 1).catch(() => null);
  if (!firstPage || !firstPage.data.length) {
    return [];
  }

  const allEpisodes = [...firstPage.data];
  const totalPages = Math.min(firstPage.pagination.last_visible_page, MAX_PAGES);

  if (totalPages > 1) {
    const extraPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        getJikanAnimeEpisodes(malId, index + 2).catch(() => null),
      ),
    );
    for (const page of extraPages) {
      if (page?.data.length) {
        allEpisodes.push(...page.data);
      }
    }
  }

  return allEpisodes;
}
