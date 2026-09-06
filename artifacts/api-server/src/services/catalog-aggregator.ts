import { UnifiedMedia, HomeFeedData, DiscoverOptions } from "./types";
import { tmdbService } from "./tmdb";
import { anilistService, isHentaiOrAdult, fetchKitsuById, fetchKitsuByTitle } from "./anilist";
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

function pickHeroCandidate(pool: UnifiedMedia[]): UnifiedMedia | null {
  if (!pool || pool.length === 0) return null;

  // Tier 1: Acclaimed titles (rating >= 4.0/5), valid widescreen backdrop, rich overview
  const prime = pool.filter(
    (item) =>
      item &&
      !isHentaiOrAdult(item) &&
      item.backdrop &&
      item.backdrop.length > 10 &&
      item.backdrop !== item.poster &&
      item.overview &&
      item.overview.trim().length >= 35 &&
      Number(item.rating) >= 4.0
  );

  if (prime.length > 0) {
    const topN = prime.slice(0, 5);
    return topN[Math.floor(Math.random() * topN.length)];
  }

  // Tier 2: Valid backdrop and rating >= 3.6
  const secondary = pool.filter(
    (item) =>
      item &&
      !isHentaiOrAdult(item) &&
      item.backdrop &&
      item.backdrop.length > 10 &&
      item.backdrop !== item.poster &&
      Number(item.rating) >= 3.6
  );

  if (secondary.length > 0) {
    const topN = secondary.slice(0, 4);
    return topN[Math.floor(Math.random() * topN.length)];
  }

  return pool.find((i) => i && !isHentaiOrAdult(i) && i.backdrop) || pool[0] || null;
}

export const catalogAggregator = {
  async getHomeFeed(): Promise<HomeFeedData> {
    // Ultra-fast memory cache for raw pools (15 min TTL) - sub-5ms response time!
    const rawPools = await mediaCache.getOrFetch(
      "home:raw_feed_pools",
      async () => {
        const [
          trendingMovies,
          topRatedMovies,
          trendingShows,
          topRatedShows,
          topAnime,
          popularAnime,
          popularGames,
        ] = await Promise.all([
          withTimeout(tmdbService.getTrendingMovies(1).catch(() => []), 4500, []),
          withTimeout(tmdbService.getTopRatedMovies(1).catch(() => []), 4500, []),
          withTimeout(tmdbService.getTrendingShows(1).catch(() => []), 4500, []),
          withTimeout(tmdbService.getTopRatedShows(1).catch(() => []), 4500, []),
          withTimeout(anilistService.getTrendingAnime(1).catch(() => []), 4500, []),
          withTimeout(anilistService.getPopularAnime(undefined, 1).catch(() => []), 4500, []),
          withTimeout(igdbService.getPopularGames(undefined, 1).catch(() => []), 4500, []),
        ]);
        return {
          trendingMovies,
          topRatedMovies,
          trendingShows,
          topRatedShows,
          topAnime,
          popularAnime,
          popularGames,
        };
      },
      1000 * 60 * 15
    );

    const {
      trendingMovies,
      topRatedMovies,
      trendingShows,
      topRatedShows,
      topAnime,
      popularAnime,
      popularGames,
    } = rawPools;

    // Instant in-memory dynamic shuffle for variety on every single visit with strict hentai filter
    const allMovies = shuffleArray([...trendingMovies, ...topRatedMovies]).filter((i) => !isHentaiOrAdult(i));
    const allShows = shuffleArray([...trendingShows, ...topRatedShows]).filter((i) => !isHentaiOrAdult(i));
    const allAnime = shuffleArray([...topAnime, ...popularAnime]).filter((i) => !isHentaiOrAdult(i));
    const allGames = shuffleArray(popularGames).filter((i) => !isHentaiOrAdult(i));

    // 4 Real Live Featured Hero Slides: 1 Movie, 1 Series, 1 Anime, 1 Game (Acclaimed with genuine widescreen backdrops)
    const heroMovie = pickHeroCandidate(topRatedMovies.length > 0 ? [...topRatedMovies, ...trendingMovies] : trendingMovies);
    const heroShow = pickHeroCandidate(topRatedShows.length > 0 ? [...topRatedShows, ...trendingShows] : trendingShows);
    const heroAnime = pickHeroCandidate(topAnime.length > 0 ? [...topAnime, ...popularAnime] : popularAnime);
    const heroGame = pickHeroCandidate(popularGames);

    const featuredSlides: UnifiedMedia[] = [
      heroMovie,
      heroShow,
      heroAnime,
      heroGame,
    ].filter((i): i is UnifiedMedia => Boolean(i) && !isHentaiOrAdult(i));

    // Curated multi-media drop with randomized assortment
    const weeklyDrop: UnifiedMedia[] = shuffleArray([
      ...allMovies.slice(1, 5),
      ...allShows.slice(1, 5),
      ...allAnime.slice(1, 5),
      ...allGames.slice(1, 5),
    ]).filter((i) => !isHentaiOrAdult(i));

    return {
      featured: featuredSlides[0] || null,
      featuredSlides,
      trendingMovies: allMovies.slice(0, 16),
      trendingShows: allShows.slice(0, 16),
      topAnime: allAnime.slice(0, 16),
      popularGames: allGames.slice(0, 16),
      weeklyDrop: weeklyDrop.slice(0, 16),
    };
  },

  async discover(options: DiscoverOptions): Promise<{ items: UnifiedMedia[]; total: number; hasMore: boolean }> {
    const searchQuery = options.search || options.query;
    if (searchQuery && searchQuery.trim()) {
      const results = await this.search(searchQuery.trim());
      return { items: results, total: results.length, hasMore: false };
    }

    const { type, genre, mood, sort, curation } = options;
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

    // Offset starting page across APIs based on visit seed (cycles 0..4)
    const startOffset = seedNum % 5;
    const fetchPage = page + startOffset;

    // Helper to ensure mutual exclusivity and strict deduplication across curation tiers
    const separateTiers = (trending: UnifiedMedia[], popular: UnifiedMedia[], niche: UnifiedMedia[]) => {
      const seen = new Set<string>();
      const filterUnique = (list: UnifiedMedia[]) => {
        const res: UnifiedMedia[] = [];
        for (const item of list) {
          if (!item || isHentaiOrAdult(item)) continue;
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
    let items: UnifiedMedia[] = [];

    if (isSingleType) {
      // User picked a single media type (Movie, Series, Anime, or Game)
      let tiers = { trending: [] as UnifiedMedia[], popular: [] as UnifiedMedia[], niche: [] as UnifiedMedia[] };

      if (type === "Movie") {
        const [trending, popular, niche] = await mediaCache.getOrFetch(
          `discover:type:Movie:p:${fetchPage}`,
          () =>
            Promise.all([
              withTimeout(tmdbService.getTrendingMovies(fetchPage).catch(() => []), 4500, []),
              withTimeout(tmdbService.getPopularMovies(fetchPage).catch(() => []), 4500, []),
              withTimeout(tmdbService.getCultAndNiche("Movie", fetchPage).catch(() => []), 4500, []),
            ]),
          1000 * 60 * 15
        );
        tiers = separateTiers(trending, popular, niche);
      } else if (type === "Series") {
        const [trending, popular, niche] = await mediaCache.getOrFetch(
          `discover:type:Series:p:${fetchPage}`,
          () =>
            Promise.all([
              withTimeout(tmdbService.getTrendingShows(fetchPage).catch(() => []), 4500, []),
              withTimeout(tmdbService.getPopularShows(fetchPage).catch(() => []), 4500, []),
              withTimeout(tmdbService.getCultAndNiche("Series", fetchPage).catch(() => []), 4500, []),
            ]),
          1000 * 60 * 15
        );
        tiers = separateTiers(trending, popular, niche);
      } else if (type === "Anime") {
        const [trending, popular, niche] = await mediaCache.getOrFetch(
          `discover:type:Anime:p:${fetchPage}`,
          () =>
            Promise.all([
              withTimeout(anilistService.getTrendingAnime(fetchPage).catch(() => []), 4500, []),
              withTimeout(anilistService.getPopularAnime(undefined, fetchPage).catch(() => []), 4500, []),
              withTimeout(anilistService.getNicheAnime(undefined, fetchPage).catch(() => []), 4500, []),
            ]),
          1000 * 60 * 15
        );
        tiers = separateTiers(trending, popular, niche);
      } else if (type === "Game") {
        const [trending, popular, niche] = await mediaCache.getOrFetch(
          `discover:type:Game:p:${fetchPage}`,
          () =>
            Promise.all([
              withTimeout(igdbService.getTrendingGames(undefined, fetchPage).catch(() => []), 4500, []),
              withTimeout(igdbService.getPopularGames(undefined, fetchPage).catch(() => []), 4500, []),
              withTimeout(igdbService.getNicheGames(undefined, fetchPage).catch(() => []), 4500, []),
            ]),
          1000 * 60 * 15
        );
        tiers = separateTiers(trending, popular, niche);
      }

      if (genre && genre !== "All genres") {
        const matchGenre = (i: UnifiedMedia) =>
          i.genre.toLowerCase() === genre.toLowerCase() ||
          i.genres.some((g) => g.toLowerCase() === genre.toLowerCase());
        tiers.trending = tiers.trending.filter(matchGenre);
        tiers.popular = tiers.popular.filter(matchGenre);
        tiers.niche = tiers.niche.filter(matchGenre);
      }

      if (curation === "Trending") {
        items = tiers.trending;
      } else if (curation === "Popular") {
        items = tiers.popular;
      } else if (curation === "Niche") {
        items = tiers.niche;
      } else {
        // Equal 1:1:1 interleaving: Trending -> Popular -> Niche
        const maxLen = Math.max(tiers.trending.length, tiers.popular.length, tiers.niche.length);
        for (let i = 0; i < maxLen; i++) {
          if (tiers.trending[i]) items.push(tiers.trending[i]);
          if (tiers.popular[i]) items.push(tiers.popular[i]);
          if (tiers.niche[i]) items.push(tiers.niche[i]);
        }
      }
    } else {
      // Ultra-fast memory cache for discover matrix pools (15 min TTL)
      const matrixPools = await mediaCache.getOrFetch(
        `discover:matrix:p:${fetchPage}`,
        async () => {
          const [
            movieTrending, moviePopular, movieNiche,
            seriesTrending, seriesPopular, seriesNiche,
            animeTrending, animePopular, animeNiche,
            gameTrending, gamePopular, gameNiche,
          ] = await Promise.all([
            withTimeout(tmdbService.getTrendingMovies(fetchPage).catch(() => []), 4500, []),
            withTimeout(tmdbService.getPopularMovies(fetchPage).catch(() => []), 4500, []),
            withTimeout(tmdbService.getCultAndNiche("Movie", fetchPage).catch(() => []), 4500, []),

            withTimeout(tmdbService.getTrendingShows(fetchPage).catch(() => []), 4500, []),
            withTimeout(tmdbService.getPopularShows(fetchPage).catch(() => []), 4500, []),
            withTimeout(tmdbService.getCultAndNiche("Series", fetchPage).catch(() => []), 4500, []),

            withTimeout(anilistService.getTrendingAnime(fetchPage).catch(() => []), 4500, []),
            withTimeout(anilistService.getPopularAnime(undefined, fetchPage).catch(() => []), 4500, []),
            withTimeout(anilistService.getNicheAnime(undefined, fetchPage).catch(() => []), 4500, []),

            withTimeout(igdbService.getTrendingGames(undefined, fetchPage).catch(() => []), 4500, []),
            withTimeout(igdbService.getPopularGames(undefined, fetchPage).catch(() => []), 4500, []),
            withTimeout(igdbService.getNicheGames(undefined, fetchPage).catch(() => []), 4500, []),
          ]);
          return {
            movieTrending, moviePopular, movieNiche,
            seriesTrending, seriesPopular, seriesNiche,
            animeTrending, animePopular, animeNiche,
            gameTrending, gamePopular, gameNiche,
          };
        },
        1000 * 60 * 15
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

      if (genre && genre !== "All genres") {
        const matchGenre = (i: UnifiedMedia) =>
          i.genre.toLowerCase() === genre.toLowerCase() ||
          i.genres.some((g) => g.toLowerCase() === genre.toLowerCase());

        movies.trending = movies.trending.filter(matchGenre);
        movies.popular = movies.popular.filter(matchGenre);
        movies.niche = movies.niche.filter(matchGenre);

        series.trending = series.trending.filter(matchGenre);
        series.popular = series.popular.filter(matchGenre);
        series.niche = series.niche.filter(matchGenre);

        animes.trending = animes.trending.filter(matchGenre);
        animes.popular = animes.popular.filter(matchGenre);
        animes.niche = animes.niche.filter(matchGenre);

        games.trending = games.trending.filter(matchGenre);
        games.popular = games.popular.filter(matchGenre);
        games.niche = games.niche.filter(matchGenre);
      }

      if (curation === "Trending") {
        const maxLen = Math.max(movies.trending.length, series.trending.length, animes.trending.length, games.trending.length);
        for (let i = 0; i < maxLen; i++) {
          if (movies.trending[i]) items.push(movies.trending[i]);
          if (series.trending[i]) items.push(series.trending[i]);
          if (animes.trending[i]) items.push(animes.trending[i]);
          if (games.trending[i]) items.push(games.trending[i]);
        }
      } else if (curation === "Popular") {
        const maxLen = Math.max(movies.popular.length, series.popular.length, animes.popular.length, games.popular.length);
        for (let i = 0; i < maxLen; i++) {
          if (movies.popular[i]) items.push(movies.popular[i]);
          if (series.popular[i]) items.push(series.popular[i]);
          if (animes.popular[i]) items.push(animes.popular[i]);
          if (games.popular[i]) items.push(games.popular[i]);
        }
      } else if (curation === "Niche") {
        const maxLen = Math.max(movies.niche.length, series.niche.length, animes.niche.length, games.niche.length);
        for (let i = 0; i < maxLen; i++) {
          if (movies.niche[i]) items.push(movies.niche[i]);
          if (series.niche[i]) items.push(series.niche[i]);
          if (animes.niche[i]) items.push(animes.niche[i]);
          if (games.niche[i]) items.push(games.niche[i]);
        }
      } else {
        // Equal 12-cell matrix: 1 Movie, 1 Series, 1 Anime, 1 Game across Trending, Popular, Niche
        const maxLen = Math.max(
          movies.trending.length, movies.popular.length, movies.niche.length,
          series.trending.length, series.popular.length, series.niche.length,
          animes.trending.length, animes.popular.length, animes.niche.length,
          games.trending.length, games.popular.length, games.niche.length
        );

        for (let i = 0; i < maxLen; i++) {
          // Cycle 1: Trending
          if (movies.trending[i]) items.push(movies.trending[i]);
          if (series.trending[i]) items.push(series.trending[i]);
          if (animes.trending[i]) items.push(animes.trending[i]);
          if (games.trending[i]) items.push(games.trending[i]);

          // Cycle 2: Popular
          if (movies.popular[i]) items.push(movies.popular[i]);
          if (series.popular[i]) items.push(series.popular[i]);
          if (animes.popular[i]) items.push(animes.popular[i]);
          if (games.popular[i]) items.push(games.popular[i]);

          // Cycle 3: Niche
          if (movies.niche[i]) items.push(movies.niche[i]);
          if (series.niche[i]) items.push(series.niche[i]);
          if (animes.niche[i]) items.push(animes.niche[i]);
          if (games.niche[i]) items.push(games.niche[i]);
        }
      }
    }

    // Deduplicate across the entire combined list
    const finalSeenIds = new Set<string>();
    const finalSeenTitles = new Set<string>();
    items = items.filter((item) => {
      const key = `${item.title.toLowerCase().trim()}-${item.type}`;
      if (finalSeenIds.has(item.id) || finalSeenTitles.has(key)) return false;
      finalSeenIds.add(item.id);
      finalSeenTitles.add(key);
      return true;
    });

    if (mood) {
      if (mood === "slow-burn") {
        items = items.filter((i) => i.genres.some((g) => ["Drama", "Mystery", "Thriller", "Sci-Fi"].includes(g)));
      } else if (mood === "otherworldly") {
        items = items.filter((i) => i.genres.some((g) => ["Sci-Fi", "Fantasy", "Animation", "Adventure"].includes(g)));
      } else if (mood === "beautiful-chaos") {
        items = items.filter((i) => i.genres.some((g) => ["Action", "Cyberpunk", "Animation", "Crime"].includes(g)));
      } else if (mood === "one-more-run") {
        items = items.filter((i) => i.type === "Game" || i.genres.some((g) => ["Action", "Roguelike", "Indie"].includes(g)));
      }
    }

    if (sort === "Highest rated") {
      items.sort((a, b) => Number(b.rating) - Number(a.rating));
    } else if (sort === "Newest") {
      items.sort((a, b) => Number(b.year) - Number(a.year));
    }

    return { items, total: items.length, hasMore: items.length > 0 };
  },

  async search(query: string): Promise<UnifiedMedia[]> {
    if (!query.trim()) return [];

    const [tmdbResults, anilistResults, igdbResults] = await Promise.all([
      withTimeout(tmdbService.search(query).catch(() => []), 2000, []),
      withTimeout(anilistService.search(query).catch(() => []), 2000, []),
      withTimeout(igdbService.search(query).catch(() => []), 2000, []),
    ]);

    const cleanAnilist = anilistResults.filter((i) => !isHentaiOrAdult(i));
    const cleanTmdb = tmdbResults.filter((i) => !isHentaiOrAdult(i));
    const cleanIgdb = igdbResults.filter((i) => !isHentaiOrAdult(i));

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
