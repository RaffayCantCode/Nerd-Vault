import { UnifiedMedia, HomeFeedData, DiscoverOptions } from "./types";
import { tmdbService, isNews, resolveTmdbGenreId } from "./tmdb";
import { anilistService, isHentaiOrAdult, isEcchi, fetchKitsuById, fetchKitsuByTitle } from "./anilist";
import { igdbService } from "./igdb";
import { mediaCache } from "./cache";

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export function isOfficiallyReleased(item: UnifiedMedia | null | undefined): boolean {
  if (!item) return false;
  if (isHentaiOrAdult(item)) return false;

  if (item.airingStatus && item.airingStatus.toLowerCase() === "upcoming") {
    return false;
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentYear = now.getFullYear();

  // Must have a release date or year; reject future years strictly
  if (item.year) {
    const parsedYear = parseInt(item.year, 10);
    if (!isNaN(parsedYear) && parsedYear > currentYear) {
      return false;
    }
  } else if (!item.releaseDate) {
    return false;
  }

  // If exact releaseDate is present, strictly require releaseDate <= today (only show once release day arrives)
  if (item.releaseDate) {
    const d = item.releaseDate.slice(0, 10);
    if (d > today) {
      return false;
    }
  }

  return true;
}

function pickHeroCandidates(
  pool: UnifiedMedia[],
  count: number = 2,
  tag: string = "Featured"
): UnifiedMedia[] {
  if (!pool || pool.length === 0) return [];

  // Filter for valid 1080p widescreen backdrop, rich overview, officially released, strictly exclude Ecchi and News
  const prime = pool.filter(
    (item) =>
      item &&
      isOfficiallyReleased(item) &&
      !isEcchi(item) &&
      !isNews(item) &&
      item.backdrop &&
      item.backdrop.length > 10 &&
      item.backdrop !== item.poster &&
      item.overview &&
      item.overview.trim().length >= 20 &&
      Number(item.rating) >= 3.7
  );

  const fallback = pool.filter(
    (item) =>
      item &&
      isOfficiallyReleased(item) &&
      !isEcchi(item) &&
      !isNews(item) &&
      item.backdrop &&
      item.backdrop.length > 10 &&
      item.backdrop !== item.poster
  );

  const candidates = prime.length >= count ? prime : (fallback.length > 0 ? fallback : pool.filter((i) => !isEcchi(i) && !isNews(i)));
  const shuffled = shuffleArray(candidates);
  return shuffled.slice(0, count).map((item) => ({
    ...item,
    highlightTag: tag,
  }));
}

function getThisWeekWindow(): { weekStart: string; today: string; weekStartSec: number; nowSec: number } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekStart = start.toISOString().slice(0, 10);
  return {
    weekStart,
    today,
    weekStartSec: Math.floor(start.getTime() / 1000),
    nowSec: Math.floor(now.getTime() / 1000),
  };
}

function dedupeList(items: UnifiedMedia[]): UnifiedMedia[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  return items.filter((item) => {
    if (!item || !item.id || !item.title) return false;
    const baseTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    const key = `${baseTitle}-${item.type}`;
    if (seenIds.has(item.id) || (baseTitle && seenTitles.has(key))) return false;
    seenIds.add(item.id);
    if (baseTitle) seenTitles.add(key);
    return true;
  });
}

function isReleasedThisWeek(item: UnifiedMedia | null | undefined, weekStart: string, today: string): boolean {
  if (!item || !item.releaseDate) return false;
  const d = item.releaseDate.slice(0, 10);
  return d >= weekStart && d <= today;
}

export const catalogAggregator = {
  async getHomeFeed(): Promise<HomeFeedData> {
    const { weekStart, today, weekStartSec, nowSec } = getThisWeekWindow();

    // Ultra-fast memory cache with stale-while-revalidate; only cache when all 4 categories succeeded
    const rawPools = await mediaCache.getOrFetch(
      `home:raw_feed_pools:${today}`,
      async () => {
        const [
          trendingMovies,
          topRatedMovies,
          trendingShows,
          topRatedShows,
          seasonalAnime,
          popularAnime,
          trendingGames,
          popularGames,
          weeklyMovies,
          weeklyShows,
          weeklyAnime,
          weeklyGames,
        ] = await Promise.all([
          withTimeout(tmdbService.getTrendingMovies(1).catch(() => []), 6500, []),
          withTimeout(tmdbService.getTopRatedMovies(1).catch(() => []), 6500, []),
          withTimeout(tmdbService.getTrendingShows(1).catch(() => []), 6500, []),
          withTimeout(tmdbService.getTopRatedShows(1).catch(() => []), 6500, []),
          withTimeout(anilistService.getSeasonalAnime(1).catch(() => []), 6500, []),
          withTimeout(anilistService.getPopularAnime(undefined, 1).catch(() => []), 6500, []),
          withTimeout(igdbService.getTrendingGames(undefined, 1).catch(() => []), 6500, []),
          withTimeout(igdbService.getPopularGames(undefined, 1).catch(() => []), 6500, []),
          withTimeout(tmdbService.getWeeklyMovies(weekStart, today).catch(() => []), 6500, []),
          withTimeout(tmdbService.getWeeklyShows(weekStart, today).catch(() => []), 6500, []),
          withTimeout(anilistService.getWeeklyAnime(weekStart, today).catch(() => []), 6500, []),
          withTimeout(igdbService.getWeeklyGames(weekStartSec, nowSec).catch(() => []), 6500, []),
        ]);
        return {
          trendingMovies,
          topRatedMovies,
          trendingShows,
          topRatedShows,
          seasonalAnime,
          popularAnime,
          trendingGames,
          popularGames,
          weeklyMovies,
          weeklyShows,
          weeklyAnime,
          weeklyGames,
        };
      },
      1000 * 60 * 15,
      1000 * 60 * 60,
      (pools) =>
        pools.trendingMovies.length > 0 &&
        pools.trendingShows.length > 0 &&
        (pools.seasonalAnime.length >= 6 || pools.popularAnime.length >= 6) &&
        (pools.trendingGames.length > 0 || pools.popularGames.length > 0)
    );

    const {
      trendingMovies,
      topRatedMovies,
      trendingShows,
      topRatedShows,
      seasonalAnime,
      popularAnime,
      trendingGames,
      popularGames,
      weeklyMovies,
      weeklyShows,
      weeklyAnime,
      weeklyGames,
    } = rawPools;

    // Deduplicated movies & shows
    const allMovies = dedupeList([...trendingMovies, ...shuffleArray(topRatedMovies)]).filter(isOfficiallyReleased);
    const allShows = dedupeList([...trendingShows, ...shuffleArray(topRatedShows)]).filter((s) => isOfficiallyReleased(s) && !isNews(s));

    // Top Anime This Season: current seasonal & new trending anime; failsafe top-up with popularAnime if < 10
    const rawSeasonal = dedupeList(seasonalAnime || []).filter(isOfficiallyReleased);
    const nonEcchiSeasonal = rawSeasonal.filter((a) => !isEcchi(a));
    const ecchiSeasonal = rawSeasonal.filter((a) => isEcchi(a));
    let allAnime = [...nonEcchiSeasonal, ...ecchiSeasonal];
    if (allAnime.length < 10 && popularAnime && popularAnime.length > 0) {
      const topUp = popularAnime.filter((a) => isOfficiallyReleased(a) && !isEcchi(a));
      allAnime = dedupeList([...allAnime, ...topUp]);
    }
    const nonEcchiAnime = allAnime.filter((a) => !isEcchi(a));

    // Games: combine trending and classic games, deduplicate by ID and base title
    const rawGames = shuffleArray([...(trendingGames || []), ...(popularGames || [])]).filter(isOfficiallyReleased);
    const gameSeenIds = new Set<string>();
    const gameSeenTitles = new Set<string>();
    const allGames = rawGames.filter((g) => {
      const baseTitle = g.title.toLowerCase().replace(/(:.*|-.*|\(.*\))/g, "").trim();
      if (gameSeenIds.has(g.id) || gameSeenTitles.has(baseTitle)) return false;
      gameSeenIds.add(g.id);
      gameSeenTitles.add(baseTitle);
      return true;
    });

    // Curate exactly 4 Hero Slides: 1 Trending Movie, 1 Trending TV Series, 1 Trending Anime, 1 Trending Game (failsafe fallback per category)
    const heroMovie =
      pickHeroCandidates(trendingMovies, 1, "Trending Movie")[0] ||
      pickHeroCandidates(topRatedMovies, 1, "Featured Movie")[0] ||
      (allMovies[0] ? { ...allMovies[0], highlightTag: "Trending Movie" } : undefined);
    const heroShow =
      pickHeroCandidates(trendingShows, 1, "Trending Series")[0] ||
      pickHeroCandidates(topRatedShows, 1, "Featured Series")[0] ||
      (allShows[0] ? { ...allShows[0], highlightTag: "Trending Series" } : undefined);
    const heroAnime =
      pickHeroCandidates(nonEcchiAnime, 1, "Trending Anime")[0] ||
      pickHeroCandidates(popularAnime, 1, "Featured Anime")[0] ||
      (nonEcchiAnime[0] ? { ...nonEcchiAnime[0], highlightTag: "Trending Anime" } : undefined);
    const heroGame =
      pickHeroCandidates(trendingGames || [], 1, "Trending Game")[0] ||
      pickHeroCandidates(popularGames || [], 1, "Featured Game")[0] ||
      (allGames[0] ? { ...allGames[0], highlightTag: "Trending Game" } : undefined);

    const featuredSlides = [heroMovie, heroShow, heroAnime, heroGame].filter(
      (item): item is UnifiedMedia =>
        Boolean(item && isOfficiallyReleased(item) && !isEcchi(item) && !isNews(item))
    );

    // Curated Weekly Drop: STRICTLY entries released THIS week (within the last 7 days up to today)
    const cleanWeeklyMovies = (weeklyMovies || []).filter((i) => isReleasedThisWeek(i, weekStart, today) && !isEcchi(i) && !isNews(i));
    const cleanWeeklyShows = (weeklyShows || []).filter((i) => isReleasedThisWeek(i, weekStart, today) && !isEcchi(i) && !isNews(i));
    const cleanWeeklyAnime = (weeklyAnime || []).filter((i) => isReleasedThisWeek(i, weekStart, today) && !isEcchi(i) && !isNews(i));
    const cleanWeeklyGames = (weeklyGames || []).filter((i) => isReleasedThisWeek(i, weekStart, today) && !isEcchi(i) && !isNews(i));

    const interleavedWeekly: UnifiedMedia[] = [];
    const maxWeeklyLen = Math.max(
      cleanWeeklyMovies.length,
      cleanWeeklyShows.length,
      cleanWeeklyAnime.length,
      cleanWeeklyGames.length
    );
    for (let i = 0; i < maxWeeklyLen; i++) {
      if (cleanWeeklyMovies[i]) interleavedWeekly.push(cleanWeeklyMovies[i]);
      if (cleanWeeklyShows[i]) interleavedWeekly.push(cleanWeeklyShows[i]);
      if (cleanWeeklyAnime[i]) interleavedWeekly.push(cleanWeeklyAnime[i]);
      if (cleanWeeklyGames[i]) interleavedWeekly.push(cleanWeeklyGames[i]);
    }
    const weeklyDrop = dedupeList(interleavedWeekly).slice(0, 16);

    return {
      featured: featuredSlides[0] || null,
      featuredSlides,
      trendingMovies: allMovies.slice(0, 16),
      trendingShows: allShows.slice(0, 16),
      topAnime: allAnime.slice(0, 16),
      popularGames: allGames.slice(0, 16),
      weeklyDrop,
    };
  },

  async discover(options: DiscoverOptions): Promise<{ items: UnifiedMedia[]; total: number; hasMore: boolean }> {
    const { type, genre, mood, sort, curation } = options;
    const searchQuery = options.search || options.query;

    if (searchQuery && searchQuery.trim()) {
      let results = await this.search(searchQuery.trim(), type);

      if (type && type !== "All types") {
        results = results.filter((i) => (i.type || "").toLowerCase() === type.toLowerCase());
      }

      if (genre && genre !== "All genres") {
        const matchGenre = (i: UnifiedMedia) =>
          (i.genre && i.genre.toLowerCase() === genre.toLowerCase()) ||
          (i.genres && i.genres.some((g) => g.toLowerCase() === genre.toLowerCase()));
        results = results.filter(matchGenre);
      }

      if (mood) {
        if (mood === "slow-burn") {
          results = results.filter((i) => i.genres?.some((g) => ["Drama", "Mystery", "Thriller", "Sci-Fi"].includes(g)));
        } else if (mood === "otherworldly") {
          results = results.filter((i) => i.genres?.some((g) => ["Sci-Fi", "Fantasy", "Animation", "Adventure"].includes(g)));
        } else if (mood === "beautiful-chaos") {
          results = results.filter((i) => i.genres?.some((g) => ["Action", "Cyberpunk", "Animation", "Crime"].includes(g)));
        } else if (mood === "one-more-run") {
          results = results.filter((i) => i.type === "Game" || i.genres?.some((g) => ["Action", "Roguelike", "Indie"].includes(g)));
        }
      }

      if (sort === "Highest rated") {
        results.sort((a, b) => Number(b.rating) - Number(a.rating));
      } else if (sort === "Newest") {
        results.sort((a, b) => Number(b.year) - Number(a.year));
      }

      // Deduplicate results and enforce released status
      const seenIds = new Set<string>();
      const seenTitles = new Set<string>();
      results = results.filter((item) => {
        if (!item || !isOfficiallyReleased(item)) return false;
        const key = `${item.title.toLowerCase().trim()}-${item.type}`;
        if (seenIds.has(item.id) || seenTitles.has(key)) return false;
        seenIds.add(item.id);
        seenTitles.add(key);
        return true;
      });

      return { items: results, total: results.length, hasMore: false };
    }
    const page = options.page || 1;

    // Seed-based dynamic visit offset so every visit shows fresh, different entries
    let seedNum = 0;
    if (typeof options.seed === "number") {
      seedNum = Math.abs(options.seed);
    } else if (typeof options.seed === "string" && options.seed.trim()) {
      seedNum = Math.abs(options.seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0));
    } else {
      seedNum = 1;
    }

    // Offset starting page across APIs based on visit seed (cycles 0..2 for fast cache reuse + fresh variety)
    const startOffset = seedNum % 3;
    const fetchPage = page + startOffset;

    // Helper to ensure mutual exclusivity and strict deduplication across curation tiers
    const separateTiers = (trending: UnifiedMedia[], popular: UnifiedMedia[], niche: UnifiedMedia[]) => {
      const seen = new Set<string>();
      const filterUnique = (list: UnifiedMedia[]) => {
        const res: UnifiedMedia[] = [];
        for (const item of list) {
          if (!item || !isOfficiallyReleased(item) || isNews(item)) continue;
          const key = `${item.title.toLowerCase().trim()}-${item.type}`;
          if (!seen.has(item.id) && !seen.has(key)) {
            seen.add(item.id);
            seen.add(key);
            res.push(item);
          }
        }
        return res;
      };

      return {
        trending: filterUnique(shuffleArray(trending)),
        popular: filterUnique(shuffleArray(popular)),
        niche: filterUnique(shuffleArray(niche)),
      };
    };

    const isSingleType = type && type !== "All types";
    const activeGenre = genre && genre !== "All genres" ? genre : undefined;
    const activeCuration = curation && !curation.startsWith("All ") ? curation : undefined;
    let items: UnifiedMedia[] = [];

    const matchMood = (i: UnifiedMedia): boolean => {
      if (!mood) return true;
      if (mood === "slow-burn") {
        return i.genres.some((g) => ["Drama", "Mystery", "Thriller", "Sci-Fi"].includes(g));
      }
      if (mood === "otherworldly") {
        return i.genres.some((g) => ["Sci-Fi", "Fantasy", "Animation", "Adventure"].includes(g));
      }
      if (mood === "beautiful-chaos") {
        return i.genres.some((g) => ["Action", "Cyberpunk", "Animation", "Crime"].includes(g));
      }
      if (mood === "one-more-run") {
        return i.type === "Game" || i.genres.some((g) => ["Action", "Roguelike", "Indie"].includes(g));
      }
      return true;
    };

    if (isSingleType) {
      // User picked a single media type (Movie, Series, Anime, or Game) — query natively with type-specific filters
      const cacheKey = `discover:single:${type}:c:${activeCuration || "all"}:g:${activeGenre || "all"}:p:${fetchPage}`;

      if (type === "Movie") {
        const genreId = resolveTmdbGenreId("Movie", activeGenre);
        const fetched = await mediaCache.getOrFetch(
          cacheKey,
          async () => {
            if (activeCuration === "Trending") {
              return genreId
                ? withTimeout(tmdbService.discover({ type: "Movie", genreId, sort: "popularity.desc", page: fetchPage }).catch(() => []), 3500, [])
                : withTimeout(tmdbService.getTrendingMovies(fetchPage).catch(() => []), 3500, []);
            }
            if (activeCuration === "Popular") {
              return genreId
                ? withTimeout(tmdbService.discover({ type: "Movie", genreId, sort: "popularity.desc", page: fetchPage }).catch(() => []), 3500, [])
                : withTimeout(tmdbService.getPopularMovies(fetchPage).catch(() => []), 3500, []);
            }
            if (activeCuration === "Critically Acclaimed" || activeCuration === "Top Rated") {
              return genreId
                ? withTimeout(tmdbService.discover({ type: "Movie", genreId, sort: "vote_average.desc", minVotes: 250, page: fetchPage }).catch(() => []), 3500, [])
                : withTimeout(tmdbService.getTopRatedMovies(fetchPage).catch(() => []), 3500, []);
            }
            if (activeCuration === "Hidden Gems" || activeCuration === "Niche") {
              return genreId
                ? withTimeout(tmdbService.discover({ type: "Movie", genreId, sort: "vote_average.desc", minVotes: 80, page: fetchPage + 1 }).catch(() => []), 3500, [])
                : withTimeout(tmdbService.getCultAndNiche("Movie", fetchPage).catch(() => []), 3500, []);
            }
            if (genreId) {
              const [pop, top] = await Promise.all([
                withTimeout(tmdbService.discover({ type: "Movie", genreId, sort: "popularity.desc", page: fetchPage }).catch(() => []), 3500, []),
                withTimeout(tmdbService.discover({ type: "Movie", genreId, sort: "vote_average.desc", minVotes: 150, page: fetchPage }).catch(() => []), 3500, []),
              ]);
              return dedupeList([...pop, ...top]);
            }
            const [trending, popular, niche] = await Promise.all([
              withTimeout(tmdbService.getTrendingMovies(fetchPage).catch(() => []), 3500, []),
              withTimeout(tmdbService.getPopularMovies(fetchPage).catch(() => []), 3500, []),
              withTimeout(tmdbService.getCultAndNiche("Movie", fetchPage).catch(() => []), 3500, []),
            ]);
            const tiers = separateTiers(trending, popular, niche);
            const merged: UnifiedMedia[] = [];
            const maxLen = Math.max(tiers.trending.length, tiers.popular.length, tiers.niche.length);
            for (let i = 0; i < maxLen; i++) {
              if (tiers.trending[i]) merged.push(tiers.trending[i]);
              if (tiers.popular[i]) merged.push(tiers.popular[i]);
              if (tiers.niche[i]) merged.push(tiers.niche[i]);
            }
            return merged;
          },
          1000 * 60 * 15
        );
        items = fetched.filter((i) => isOfficiallyReleased(i) && !isNews(i) && matchMood(i));
      } else if (type === "Series") {
        const genreId = resolveTmdbGenreId("Series", activeGenre);
        const fetched = await mediaCache.getOrFetch(
          cacheKey,
          async () => {
            if (activeCuration === "Trending") {
              return genreId
                ? withTimeout(tmdbService.discover({ type: "Series", genreId, sort: "popularity.desc", page: fetchPage }).catch(() => []), 3500, [])
                : withTimeout(tmdbService.getTrendingShows(fetchPage).catch(() => []), 3500, []);
            }
            if (activeCuration === "Popular") {
              return genreId
                ? withTimeout(tmdbService.discover({ type: "Series", genreId, sort: "popularity.desc", page: fetchPage }).catch(() => []), 3500, [])
                : withTimeout(tmdbService.getPopularShows(fetchPage).catch(() => []), 3500, []);
            }
            if (activeCuration === "Critically Acclaimed" || activeCuration === "Top Rated") {
              return genreId
                ? withTimeout(tmdbService.discover({ type: "Series", genreId, sort: "vote_average.desc", minVotes: 150, page: fetchPage }).catch(() => []), 3500, [])
                : withTimeout(tmdbService.getTopRatedShows(fetchPage).catch(() => []), 3500, []);
            }
            if (activeCuration === "Hidden Gems" || activeCuration === "Niche") {
              return genreId
                ? withTimeout(tmdbService.discover({ type: "Series", genreId, sort: "vote_average.desc", minVotes: 60, page: fetchPage + 1 }).catch(() => []), 3500, [])
                : withTimeout(tmdbService.getCultAndNiche("Series", fetchPage).catch(() => []), 3500, []);
            }
            if (genreId) {
              const [pop, top] = await Promise.all([
                withTimeout(tmdbService.discover({ type: "Series", genreId, sort: "popularity.desc", page: fetchPage }).catch(() => []), 3500, []),
                withTimeout(tmdbService.discover({ type: "Series", genreId, sort: "vote_average.desc", minVotes: 120, page: fetchPage }).catch(() => []), 3500, []),
              ]);
              return dedupeList([...pop, ...top]);
            }
            const [trending, popular, niche] = await Promise.all([
              withTimeout(tmdbService.getTrendingShows(fetchPage).catch(() => []), 3500, []),
              withTimeout(tmdbService.getPopularShows(fetchPage).catch(() => []), 3500, []),
              withTimeout(tmdbService.getCultAndNiche("Series", fetchPage).catch(() => []), 3500, []),
            ]);
            const tiers = separateTiers(trending, popular, niche);
            const merged: UnifiedMedia[] = [];
            const maxLen = Math.max(tiers.trending.length, tiers.popular.length, tiers.niche.length);
            for (let i = 0; i < maxLen; i++) {
              if (tiers.trending[i]) merged.push(tiers.trending[i]);
              if (tiers.popular[i]) merged.push(tiers.popular[i]);
              if (tiers.niche[i]) merged.push(tiers.niche[i]);
            }
            return merged;
          },
          1000 * 60 * 15
        );
        items = fetched.filter((i) => isOfficiallyReleased(i) && !isNews(i) && matchMood(i));
      } else if (type === "Anime") {
        const fetched = await mediaCache.getOrFetch(
          cacheKey,
          async () => {
            if (activeCuration === "This Season") {
              return withTimeout(anilistService.getSeasonalAnime(fetchPage, activeGenre).catch(() => []), 6500, []);
            }
            if (activeCuration === "Trending") {
              return withTimeout(anilistService.getTrendingAnime(fetchPage, activeGenre).catch(() => []), 6500, []);
            }
            if (activeCuration === "Top Rated" || activeCuration === "Popular") {
              return withTimeout(anilistService.getPopularAnime(activeGenre, fetchPage).catch(() => []), 6500, []);
            }
            if (activeCuration === "Hidden Gems" || activeCuration === "Niche") {
              return withTimeout(anilistService.getNicheAnime(activeGenre, fetchPage).catch(() => []), 6500, []);
            }
            const [trending, popular, niche] = await Promise.all([
              withTimeout(anilistService.getTrendingAnime(fetchPage, activeGenre).catch(() => []), 6500, []),
              withTimeout(anilistService.getPopularAnime(activeGenre, fetchPage).catch(() => []), 6500, []),
              withTimeout(anilistService.getNicheAnime(activeGenre, fetchPage).catch(() => []), 6500, []),
            ]);
            const tiers = separateTiers(trending, popular, niche);
            const merged: UnifiedMedia[] = [];
            const maxLen = Math.max(tiers.trending.length, tiers.popular.length, tiers.niche.length);
            for (let i = 0; i < maxLen; i++) {
              if (tiers.trending[i]) merged.push(tiers.trending[i]);
              if (tiers.popular[i]) merged.push(tiers.popular[i]);
              if (tiers.niche[i]) merged.push(tiers.niche[i]);
            }
            if (merged.length > 0) return merged;
            return withTimeout(anilistService.getPopularAnime(activeGenre, 1).catch(() => []), 6500, []);
          },
          1000 * 60 * 15
        );
        items = fetched.filter((i) => isOfficiallyReleased(i) && matchMood(i));
      } else if (type === "Game") {
        const fetched = await mediaCache.getOrFetch(
          cacheKey,
          async () => {
            if (activeCuration === "AAA") {
              const res = await withTimeout(igdbService.getAAAGames(activeGenre, fetchPage).catch(() => []), 6500, []);
              return res.length > 0 ? res : withTimeout(igdbService.getAAAGames(activeGenre, 1).catch(() => []), 6500, []);
            }
            if (activeCuration === "Indie") {
              const res = await withTimeout(igdbService.getIndieGames(activeGenre, fetchPage).catch(() => []), 6500, []);
              return res.length > 0 ? res : withTimeout(igdbService.getIndieGames(activeGenre, 1).catch(() => []), 6500, []);
            }
            if (activeCuration === "Trending") {
              const res = await withTimeout(igdbService.getTrendingGames(activeGenre, fetchPage).catch(() => []), 6500, []);
              return res.length > 0 ? res : withTimeout(igdbService.getTrendingGames(activeGenre, 1).catch(() => []), 6500, []);
            }
            if (activeCuration === "Popular" || activeCuration === "Top Rated") {
              const res = await withTimeout(igdbService.getPopularGames(activeGenre, fetchPage).catch(() => []), 6500, []);
              return res.length > 0 ? res : withTimeout(igdbService.getPopularGames(activeGenre, 1).catch(() => []), 6500, []);
            }
            if (activeCuration === "Hidden Gems" || activeCuration === "Niche") {
              const res = await withTimeout(igdbService.getNicheGames(activeGenre, fetchPage).catch(() => []), 6500, []);
              return res.length > 0 ? res : withTimeout(igdbService.getNicheGames(activeGenre, 1).catch(() => []), 6500, []);
            }
            const [trending, popular, niche] = await Promise.all([
              withTimeout(igdbService.getTrendingGames(activeGenre, fetchPage).catch(() => []), 6500, []),
              withTimeout(igdbService.getPopularGames(activeGenre, fetchPage).catch(() => []), 6500, []),
              withTimeout(igdbService.getNicheGames(activeGenre, fetchPage).catch(() => []), 6500, []),
            ]);
            const tiers = separateTiers(trending, popular, niche);
            const merged: UnifiedMedia[] = [];
            const maxLen = Math.max(tiers.trending.length, tiers.popular.length, tiers.niche.length);
            for (let i = 0; i < maxLen; i++) {
              if (tiers.trending[i]) merged.push(tiers.trending[i]);
              if (tiers.popular[i]) merged.push(tiers.popular[i]);
              if (tiers.niche[i]) merged.push(tiers.niche[i]);
            }
            if (merged.length > 0) return merged;
            // Failsafe fallback to page 1 popular games if offset page returned empty
            return withTimeout(igdbService.getPopularGames(activeGenre, 1).catch(() => []), 6500, []);
          },
          1000 * 60 * 15
        );
        items = fetched.filter((i) => isOfficiallyReleased(i) && matchMood(i));
      }
    } else {
      // All types: build 4 clean queues and strictly interleave Movie -> Series -> Anime -> Game repeating!
      const matrixPools = await mediaCache.getOrFetch(
        `discover:matrix:p:${fetchPage}`,
        async () => {
          const [
            movieTrending, moviePopular, movieNiche,
            seriesTrending, seriesPopular, seriesNiche,
            animeTrending, animePopular, animeNiche,
            gameTrending, gamePopular, gameNiche,
          ] = await Promise.all([
            withTimeout(tmdbService.getTrendingMovies(fetchPage).catch(() => []), 6500, []),
            withTimeout(tmdbService.getPopularMovies(fetchPage).catch(() => []), 6500, []),
            withTimeout(tmdbService.getCultAndNiche("Movie", fetchPage).catch(() => []), 6500, []),

            withTimeout(tmdbService.getTrendingShows(fetchPage).catch(() => []), 6500, []),
            withTimeout(tmdbService.getPopularShows(fetchPage).catch(() => []), 6500, []),
            withTimeout(tmdbService.getCultAndNiche("Series", fetchPage).catch(() => []), 6500, []),

            withTimeout(anilistService.getTrendingAnime(fetchPage).catch(() => []), 6500, []),
            withTimeout(anilistService.getPopularAnime(undefined, fetchPage).catch(() => []), 6500, []),
            withTimeout(anilistService.getNicheAnime(undefined, fetchPage).catch(() => []), 6500, []),

            withTimeout(igdbService.getTrendingGames(undefined, fetchPage).catch(() => []), 6500, []),
            withTimeout(igdbService.getPopularGames(undefined, fetchPage).catch(() => []), 6500, []),
            withTimeout(igdbService.getNicheGames(undefined, fetchPage).catch(() => []), 6500, []),
          ]);
          return {
            movieTrending, moviePopular, movieNiche,
            seriesTrending, seriesPopular, seriesNiche,
            animeTrending, animePopular, animeNiche,
            gameTrending, gamePopular, gameNiche,
          };
        },
        1000 * 60 * 15,
        1000 * 60 * 60,
        (pools) =>
          (pools.movieTrending.length > 0 || pools.moviePopular.length > 0) &&
          (pools.seriesTrending.length > 0 || pools.seriesPopular.length > 0) &&
          (pools.animeTrending.length > 0 || pools.animePopular.length > 0) &&
          (pools.gameTrending.length > 0 || pools.gamePopular.length > 0)
      );

      const {
        movieTrending, moviePopular, movieNiche,
        seriesTrending, seriesPopular, seriesNiche,
        animeTrending, animePopular, animeNiche,
        gameTrending, gamePopular, gameNiche,
      } = matrixPools;

      const movies = separateTiers(movieTrending, moviePopular, movieNiche);
      const series = separateTiers(seriesTrending, seriesPopular, seriesNiche);
      const animes = separateTiers(animeTrending, animePopular, animeNiche);
      const games = separateTiers(gameTrending, gamePopular, gameNiche);

      const buildTypeQueue = (tiers: { trending: UnifiedMedia[]; popular: UnifiedMedia[]; niche: UnifiedMedia[] }) => {
        let list: UnifiedMedia[] = [];
        if (activeCuration === "Trending") {
          list = tiers.trending;
        } else if (activeCuration === "Popular") {
          list = tiers.popular;
        } else if (activeCuration === "Niche" || activeCuration === "Hidden Gems") {
          list = tiers.niche;
        } else {
          const maxLen = Math.max(tiers.trending.length, tiers.popular.length, tiers.niche.length);
          for (let i = 0; i < maxLen; i++) {
            if (tiers.trending[i]) list.push(tiers.trending[i]);
            if (tiers.popular[i]) list.push(tiers.popular[i]);
            if (tiers.niche[i]) list.push(tiers.niche[i]);
          }
        }

        if (activeGenre) {
          const gLower = activeGenre.toLowerCase();
          list = list.filter(
            (i) =>
              i.genre.toLowerCase() === gLower ||
              i.genres.some((g) => g.toLowerCase() === gLower)
          );
        }

        if (mood) {
          list = list.filter(matchMood);
        }

        return dedupeList(list).filter(isOfficiallyReleased);
      };

      const movieQueue = buildTypeQueue(movies);
      const seriesQueue = buildTypeQueue(series);
      const animeQueue = buildTypeQueue(animes);
      const gameQueue = buildTypeQueue(games);

      const hasAllFour =
        movieQueue.length > 0 &&
        seriesQueue.length > 0 &&
        animeQueue.length > 0 &&
        gameQueue.length > 0;

      if (hasAllFour) {
        // Strict repeating cadence: Movie -> Series -> Anime -> Game -> Movie -> Series -> Anime -> Game...
        const quadCount = Math.min(movieQueue.length, seriesQueue.length, animeQueue.length, gameQueue.length);
        for (let i = 0; i < quadCount; i++) {
          items.push(movieQueue[i], seriesQueue[i], animeQueue[i], gameQueue[i]);
        }
      } else {
        // Graceful fallback if a specific genre/mood has 0 entries in one of the 4 mediums
        const maxLen = Math.max(movieQueue.length, seriesQueue.length, animeQueue.length, gameQueue.length);
        for (let i = 0; i < maxLen; i++) {
          if (movieQueue[i]) items.push(movieQueue[i]);
          if (seriesQueue[i]) items.push(seriesQueue[i]);
          if (animeQueue[i]) items.push(animeQueue[i]);
          if (gameQueue[i]) items.push(gameQueue[i]);
        }
      }
    }

    // Final deduplication (already deduped per bucket in All-types mode so quad order is preserved!)
    const finalSeenIds = new Set<string>();
    const finalSeenTitles = new Set<string>();
    items = items.filter((item) => {
      if (!isOfficiallyReleased(item)) return false;
      const key = `${item.title.toLowerCase().trim()}-${item.type}`;
      if (finalSeenIds.has(item.id) || finalSeenTitles.has(key)) return false;
      finalSeenIds.add(item.id);
      finalSeenTitles.add(key);
      return true;
    });

    if (sort === "Highest rated") {
      items.sort((a, b) => Number(b.rating) - Number(a.rating));
    } else if (sort === "Newest") {
      items.sort((a, b) => Number(b.year) - Number(a.year));
    }

    return { items, total: items.length, hasMore: items.length > 0 };
  },

  async search(query: string, filterType?: string): Promise<UnifiedMedia[]> {
    if (!query.trim()) return [];

    const normType = (filterType || "").trim().toLowerCase();

    if (normType === "anime") {
      const anilistResults = await withTimeout(anilistService.search(query).catch(() => []), 6000, []);
      return anilistResults.filter((i) => isOfficiallyReleased(i) && (i.type || "").toLowerCase() === "anime");
    }

    if (normType === "game") {
      const igdbResults = await withTimeout(igdbService.search(query).catch(() => []), 5000, []);
      return igdbResults.filter((i) => isOfficiallyReleased(i) && (i.type || "").toLowerCase() === "game");
    }

    if (normType === "movie") {
      const tmdbResults = await withTimeout(tmdbService.search(query).catch(() => []), 5000, []);
      return tmdbResults.filter((i) => isOfficiallyReleased(i) && (i.type || "").toLowerCase() === "movie");
    }

    if (normType === "series" || normType === "show" || normType === "tv") {
      const tmdbResults = await withTimeout(tmdbService.search(query).catch(() => []), 5000, []);
      return tmdbResults.filter((i) => isOfficiallyReleased(i) && !isNews(i) && (i.type || "").toLowerCase() === "series");
    }

    const [tmdbResults, anilistResults, igdbResults] = await Promise.all([
      withTimeout(tmdbService.search(query).catch(() => []), 3000, []),
      withTimeout(anilistService.search(query).catch(() => []), 3000, []),
      withTimeout(igdbService.search(query).catch(() => []), 3000, []),
    ]);

    const cleanAnilistRaw = anilistResults.filter(isOfficiallyReleased);
    const cleanAnilist = [
      ...cleanAnilistRaw.filter((a) => !isEcchi(a)),
      ...cleanAnilistRaw.filter((a) => isEcchi(a)),
    ];
    const cleanTmdb = tmdbResults.filter((i) => isOfficiallyReleased(i) && !isNews(i));
    const cleanIgdb = igdbResults.filter(isOfficiallyReleased);

    const combined: UnifiedMedia[] = [];
    const maxLen = Math.max(cleanTmdb.length, cleanAnilist.length, cleanIgdb.length);

    for (let i = 0; i < maxLen; i++) {
      if (cleanTmdb[i]) combined.push(cleanTmdb[i]);
      if (cleanAnilist[i]) combined.push(cleanAnilist[i]);
      if (cleanIgdb[i]) combined.push(cleanIgdb[i]);
    }

    return combined;
  },

  async getMediaDetails(id: string): Promise<UnifiedMedia | null> {
    try {
      const cleanId = id.trim();

      // 0. Kitsu directly (e.g. kitsu-12345)
      if (cleanId.startsWith("kitsu-")) {
        const item = await fetchKitsuById(cleanId).catch(() => null);
        if (item) return item;
      }

      // 1. AniList (e.g. anilist-12345, anilist-anime-12345, anilist-mal-12345)
      if (cleanId.startsWith("anilist-")) {
        if (cleanId.startsWith("anilist-mal-")) {
          const malId = cleanId.replace(/^anilist-mal-/i, "");
          const malItem = await anilistService.getDetailsByMalId(malId).catch(() => null);
          if (malItem) return malItem;
        }
        const realId = cleanId.replace(/^anilist-(anime-|mal-)?/i, "");
        const item = await anilistService.getDetails(realId).catch(() => null);
        if (item) return item;

        // Fallback to Kitsu if AniList details failed
        const kitsuFallback = await fetchKitsuById(realId).catch(() => null);
        if (kitsuFallback) return kitsuFallback;
      }

      // 2. IGDB (e.g. igdb-12345, igdb-game-12345)
      if (cleanId.startsWith("igdb-")) {
        const realId = cleanId.replace(/^igdb-(game-)?/i, "");
        const item = await igdbService.getDetails(realId).catch(() => null);
        if (item) return item;
      }

      // 3. TMDB (e.g. tmdb-movie-123, tmdb-series-123, tmdb-show-123, tmdb-anime-123, tmdb-tv-123)
      if (cleanId.startsWith("tmdb-")) {
        const realId = cleanId.replace(/^tmdb-(movie|series|show|tv|anime)-/i, "").replace(/^tmdb-/i, "");
        const isExplicitMovie = cleanId.startsWith("tmdb-movie-");
        const isExplicitTv = cleanId.startsWith("tmdb-series-") || cleanId.startsWith("tmdb-show-") || cleanId.startsWith("tmdb-tv-");

        if (isExplicitMovie) {
          const movie = await tmdbService.getDetails(realId, "Movie").catch(() => null);
          if (movie) return movie;
          const tv = await tmdbService.getDetails(realId, "Series").catch(() => null);
          if (tv) return tv;
        } else if (isExplicitTv) {
          const tv = await tmdbService.getDetails(realId, "Series").catch(() => null);
          if (tv) return tv;
          const movie = await tmdbService.getDetails(realId, "Movie").catch(() => null);
          if (movie) return movie;
        } else {
          // For tmdb-anime- or generic tmdb-: try TV first, then Movie
          const tv = await tmdbService.getDetails(realId, "Series").catch(() => null);
          if (tv) return tv;
          const movie = await tmdbService.getDetails(realId, "Movie").catch(() => null);
          if (movie) return movie;
        }
      }

      // 4. Raw numeric ID - try AniList, TMDB TV, TMDB Movie, IGDB, Kitsu
      if (/^\d+$/.test(cleanId)) {
        const tv = await tmdbService.getDetails(cleanId, "Series").catch(() => null);
        if (tv) return tv;
        const movie = await tmdbService.getDetails(cleanId, "Movie").catch(() => null);
        if (movie) return movie;
        const anime = await anilistService.getDetails(cleanId).catch(() => null);
        if (anime) return anime;
        const game = await igdbService.getDetails(cleanId).catch(() => null);
        if (game) return game;
        const kitsu = await fetchKitsuById(cleanId).catch(() => null);
        if (kitsu) return kitsu;
      }

      // 5. Fallback - search by title/query
      const searchRes = await this.search(cleanId).catch(() => []);
      if (searchRes && searchRes.length > 0) {
        return searchRes[0];
      }

      return null;
    } catch {
      return null;
    }
  },
};
