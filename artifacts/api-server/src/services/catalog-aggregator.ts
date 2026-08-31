import { UnifiedMedia, HomeFeedData, DiscoverOptions } from "./types";
import { tmdbService } from "./tmdb";
import { anilistService, isHentaiOrAdult } from "./anilist";
import { igdbService } from "./igdb";

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

export const catalogAggregator = {
  async getHomeFeed(): Promise<HomeFeedData> {
    // Parallel live fetch with 4.5s timeouts so live APIs have sufficient time to respond
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

    // Instant in-memory dynamic shuffle for variety on every single visit with strict hentai filter
    const allMovies = shuffleArray([...trendingMovies, ...topRatedMovies]).filter((i) => !isHentaiOrAdult(i));
    const allShows = shuffleArray([...trendingShows, ...topRatedShows]).filter((i) => !isHentaiOrAdult(i));
    const allAnime = shuffleArray([...topAnime, ...popularAnime]).filter((i) => !isHentaiOrAdult(i));
    const allGames = shuffleArray(popularGames).filter((i) => !isHentaiOrAdult(i));

    // 4 Real Live Featured Hero Slides: 1 Movie, 1 Series, 1 Anime, 1 Game
    const featuredSlides: UnifiedMedia[] = [
      allMovies[0] || trendingMovies[0],
      allShows[0] || trendingShows[0],
      allAnime[0] || topAnime[0],
      allGames[0] || popularGames[0],
    ].filter((i) => Boolean(i) && !isHentaiOrAdult(i));

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

    const { type, genre, mood, sort } = options;
    const page = options.page || 1;

    let items: UnifiedMedia[] = [];

    const isSingleType = type && type !== "All types";

    if (isSingleType) {
      if (type === "Movie") {
        const [trending, topRated, niche] = await Promise.all([
          withTimeout(tmdbService.discover({ type: "Movie", page }).catch(() => []), 4500, []),
          withTimeout(tmdbService.getTopRatedMovies(page).catch(() => []), 4500, []),
          withTimeout(tmdbService.getCultAndNiche("Movie", page).catch(() => []), 4500, []),
        ]);
        items = shuffleArray([...trending, ...topRated, ...niche]).filter((i) => !isHentaiOrAdult(i));
      } else if (type === "Series") {
        const [trending, topRated, niche] = await Promise.all([
          withTimeout(tmdbService.discover({ type: "Series", page }).catch(() => []), 4500, []),
          withTimeout(tmdbService.getTopRatedShows(page).catch(() => []), 4500, []),
          withTimeout(tmdbService.getCultAndNiche("Series", page).catch(() => []), 4500, []),
        ]);
        items = shuffleArray([...trending, ...topRated, ...niche]).filter((i) => !isHentaiOrAdult(i));
      } else if (type === "Anime") {
        const [trending, popular] = await Promise.all([
          withTimeout(anilistService.getTrendingAnime(page).catch(() => []), 4500, []),
          withTimeout(anilistService.getPopularAnime(genre !== "All genres" ? genre : undefined, page).catch(() => []), 4500, []),
        ]);
        items = shuffleArray([...trending, ...popular]).filter((i) => !isHentaiOrAdult(i));
      } else if (type === "Game") {
        const games = await withTimeout(igdbService.getPopularGames(genre !== "All genres" ? genre : undefined, page).catch(() => []), 4500, []);
        items = shuffleArray(games).filter((i) => !isHentaiOrAdult(i));
      }

      if (genre && genre !== "All genres") {
        items = items.filter((i) =>
          i.genre.toLowerCase() === genre.toLowerCase() ||
          i.genres.some((g) => g.toLowerCase() === genre.toLowerCase())
        );
      }
    } else {
      // 100% REAL LIVE MULTI-SOURCE NERD HAVEN (Trending + Top-Rated + Cult/Niche) with 4.5s timeouts
      const [
        trendingMovies,
        nicheMovies,
        trendingShows,
        nicheShows,
        trendingAnime,
        popularAnime,
        games,
      ] = await Promise.all([
        withTimeout(tmdbService.getTrendingMovies(page).catch(() => []), 4500, []),
        withTimeout(tmdbService.getCultAndNiche("Movie", page).catch(() => []), 4500, []),
        withTimeout(tmdbService.getTrendingShows(page).catch(() => []), 4500, []),
        withTimeout(tmdbService.getCultAndNiche("Series", page).catch(() => []), 4500, []),
        withTimeout(anilistService.getTrendingAnime(page).catch(() => []), 4500, []),
        withTimeout(anilistService.getPopularAnime(undefined, page).catch(() => []), 4500, []),
        withTimeout(igdbService.getPopularGames(undefined, page).catch(() => []), 4500, []),
      ]);

      let poolMovies = shuffleArray([...trendingMovies, ...nicheMovies]).filter((i) => !isHentaiOrAdult(i));
      let poolShows = shuffleArray([...trendingShows, ...nicheShows]).filter((i) => !isHentaiOrAdult(i));
      let poolAnime = shuffleArray([...trendingAnime, ...popularAnime]).filter((i) => !isHentaiOrAdult(i));
      let poolGames = shuffleArray(games).filter((i) => !isHentaiOrAdult(i));

      if (genre && genre !== "All genres") {
        const matchGenre = (i: UnifiedMedia) =>
          i.genre.toLowerCase() === genre.toLowerCase() ||
          i.genres.some((g) => g.toLowerCase() === genre.toLowerCase());

        poolMovies = poolMovies.filter(matchGenre);
        poolShows = poolShows.filter(matchGenre);
        poolAnime = poolAnime.filter(matchGenre);
        poolGames = poolGames.filter(matchGenre);
      }

      const count = Math.max(
        poolMovies.length,
        poolShows.length,
        poolAnime.length,
        poolGames.length
      );

      // Strict Equal Interleaving: 1 Movie -> 1 Series -> 1 Anime -> 1 Game
      for (let i = 0; i < count; i++) {
        if (poolMovies[i]) items.push(poolMovies[i]);
        if (poolShows[i]) items.push(poolShows[i]);
        if (poolAnime[i]) items.push(poolAnime[i]);
        if (poolGames[i]) items.push(poolGames[i]);
      }
    }

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

      // 1. AniList (e.g. anilist-12345, anilist-anime-12345)
      if (cleanId.startsWith("anilist-")) {
        const realId = cleanId.replace(/^anilist-(anime-)?/i, "");
        const item = await anilistService.getDetails(realId).catch(() => null);
        if (item) return item;
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

      // 4. Raw numeric ID - try AniList, TMDB TV, TMDB Movie, IGDB
      if (/^\d+$/.test(cleanId)) {
        const tv = await tmdbService.getDetails(cleanId, "Series").catch(() => null);
        if (tv) return tv;
        const movie = await tmdbService.getDetails(cleanId, "Movie").catch(() => null);
        if (movie) return movie;
        const anime = await anilistService.getDetails(cleanId).catch(() => null);
        if (anime) return anime;
        const game = await igdbService.getDetails(cleanId).catch(() => null);
        if (game) return game;
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
