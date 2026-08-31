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
    // Parallel fetch with fast 2.5s timeouts so slow external APIs never delay the home feed
    const [
      trendingMovies,
      topRatedMovies,
      trendingShows,
      topRatedShows,
      topAnime,
      popularAnime,
      popularGames,
    ] = await Promise.all([
      withTimeout(tmdbService.getTrendingMovies(1).catch(() => []), 2500, []),
      withTimeout(tmdbService.getTopRatedMovies(1).catch(() => []), 2500, []),
      withTimeout(tmdbService.getTrendingShows(1).catch(() => []), 2500, []),
      withTimeout(tmdbService.getTopRatedShows(1).catch(() => []), 2500, []),
      withTimeout(anilistService.getTrendingAnime(1).catch(() => []), 2500, []),
      withTimeout(anilistService.getPopularAnime(undefined, 1).catch(() => []), 2500, []),
      withTimeout(igdbService.getPopularGames(undefined, 1).catch(() => []), 2500, []),
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
          tmdbService.discover({ type: "Movie", page }).catch(() => []),
          tmdbService.getTopRatedMovies(page).catch(() => []),
          tmdbService.getCultAndNiche("Movie", page).catch(() => []),
        ]);
        items = shuffleArray([...trending, ...topRated, ...niche]);
      } else if (type === "Series") {
        const [trending, topRated, niche] = await Promise.all([
          tmdbService.discover({ type: "Series", page }).catch(() => []),
          tmdbService.getTopRatedShows(page).catch(() => []),
          tmdbService.getCultAndNiche("Series", page).catch(() => []),
        ]);
        items = shuffleArray([...trending, ...topRated, ...niche]);
      } else if (type === "Anime") {
        const [trending, popular] = await Promise.all([
          anilistService.getTrendingAnime(page).catch(() => []),
          anilistService.getPopularAnime(genre !== "All genres" ? genre : undefined, page).catch(() => []),
        ]);
        items = shuffleArray([...trending, ...popular]);
      } else if (type === "Game") {
        items = shuffleArray(await igdbService.getPopularGames(genre !== "All genres" ? genre : undefined, page).catch(() => []));
      }

      if (genre && genre !== "All genres") {
        items = items.filter((i) =>
          i.genre.toLowerCase() === genre.toLowerCase() ||
          i.genres.some((g) => g.toLowerCase() === genre.toLowerCase())
        );
      }
    } else {
      // 100% REAL LIVE MULTI-SOURCE NERD HAVEN (Trending + Top-Rated + Cult/Niche)
      const [
        trendingMovies,
        nicheMovies,
        trendingShows,
        nicheShows,
        trendingAnime,
        popularAnime,
        games,
      ] = await Promise.all([
        tmdbService.getTrendingMovies(page).catch(() => []),
        tmdbService.getCultAndNiche("Movie", page).catch(() => []),
        tmdbService.getTrendingShows(page).catch(() => []),
        tmdbService.getCultAndNiche("Series", page).catch(() => []),
        anilistService.getTrendingAnime(page).catch(() => []),
        anilistService.getPopularAnime(undefined, page).catch(() => []),
        igdbService.getPopularGames(undefined, page).catch(() => []),
      ]);

      let poolMovies = shuffleArray([...trendingMovies, ...nicheMovies]);
      let poolShows = shuffleArray([...trendingShows, ...nicheShows]);
      let poolAnime = shuffleArray([...trendingAnime, ...popularAnime]);
      let poolGames = shuffleArray(games);

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
      tmdbService.search(query).catch(() => []),
      anilistService.search(query).catch(() => []),
      igdbService.search(query).catch(() => []),
    ]);

    const combined: UnifiedMedia[] = [];
    const maxLen = Math.max(tmdbResults.length, anilistResults.length, igdbResults.length);

    for (let i = 0; i < maxLen; i++) {
      if (tmdbResults[i]) combined.push(tmdbResults[i]);
      if (anilistResults[i]) combined.push(anilistResults[i]);
      if (igdbResults[i]) combined.push(igdbResults[i]);
    }

    return combined;
  },

  async getMediaDetails(id: string): Promise<UnifiedMedia | null> {
    if (id.startsWith("anilist-") || id.startsWith("tmdb-anime-")) {
      return await anilistService.getDetails(id);
    }
    if (id.startsWith("igdb-")) {
      const rawId = id.replace("igdb-", "");
      return await igdbService.getDetails(rawId);
    }
    if (id.startsWith("tmdb-tv-") || id.startsWith("tmdb-series-")) {
      const rawId = id.replace(/^(tmdb-tv-|tmdb-series-)/, "");
      return await tmdbService.getDetails(rawId, "Series");
    }
    if (id.startsWith("tmdb-movie-") || id.startsWith("tmdb-")) {
      const rawId = id.replace(/^(tmdb-movie-|tmdb-)/, "");
      return await tmdbService.getDetails(rawId, "Movie");
    }
    return null;
  },
};
