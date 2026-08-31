import { UnifiedMedia, HomeFeedData, DiscoverOptions } from "./types";
import { tmdbService } from "./tmdb";
import { anilistService } from "./anilist";
import { igdbService } from "./igdb";

export const catalogAggregator = {
  async getHomeFeed(): Promise<HomeFeedData> {
    const [trendingMovies, trendingShows, topAnime, popularGames] = await Promise.all([
      tmdbService.getTrendingMovies(1).catch(() => []),
      tmdbService.getTrendingShows(1).catch(() => []),
      anilistService.getTrendingAnime(1).catch(() => []),
      igdbService.getPopularGames(undefined, 1).catch(() => []),
    ]);

    // 4 Real Live Featured Hero Slides: 1 Movie, 1 Series, 1 Anime, 1 Game
    const featuredSlides: UnifiedMedia[] = [
      trendingMovies[0],
      trendingShows[0],
      topAnime[0],
      popularGames[0],
    ].filter(Boolean);

    const weeklyDrop: UnifiedMedia[] = [
      ...trendingMovies.slice(1, 4),
      ...trendingShows.slice(1, 4),
      ...topAnime.slice(1, 4),
      ...popularGames.slice(1, 4),
    ].filter(Boolean);

    return {
      featured: featuredSlides[0] || null,
      featuredSlides,
      trendingMovies,
      trendingShows,
      topAnime,
      popularGames,
      weeklyDrop,
    };
  },

  async discover(options: DiscoverOptions): Promise<{ items: UnifiedMedia[]; total: number; hasMore: boolean }> {
    if (options.search) {
      const results = await this.search(options.search);
      return { items: results, total: results.length, hasMore: false };
    }

    const { type, genre, mood, sort } = options;
    const page = options.page || 1;

    let items: UnifiedMedia[] = [];

    const isSingleType = type && type !== "All types";

    if (isSingleType) {
      if (type === "Movie") {
        items = await tmdbService.discover({ type: "Movie", page });
      } else if (type === "Series") {
        items = await tmdbService.discover({ type: "Series", page });
      } else if (type === "Anime") {
        items = await anilistService.getPopularAnime(genre !== "All genres" ? genre : undefined, page);
      } else if (type === "Game") {
        items = await igdbService.getPopularGames(genre !== "All genres" ? genre : undefined, page);
      }

      if (genre && genre !== "All genres") {
        items = items.filter((i) =>
          i.genre.toLowerCase() === genre.toLowerCase() ||
          i.genres.some((g) => g.toLowerCase() === genre.toLowerCase())
        );
      }
    } else {
      // STRICT EQUAL REAL-TIME INTERLEAVING: 1 Movie, 1 TV Show, 1 Anime, 1 Game
      const [movies, shows, anime, games] = await Promise.all([
        tmdbService.getTrendingMovies(page).catch(() => []),
        tmdbService.getTrendingShows(page).catch(() => []),
        anilistService.getTrendingAnime(page).catch(() => []),
        igdbService.getPopularGames(undefined, page).catch(() => []),
      ]);

      let filteredMovies = movies;
      let filteredShows = shows;
      let filteredAnime = anime;
      let filteredGames = games;

      if (genre && genre !== "All genres") {
        const matchGenre = (i: UnifiedMedia) =>
          i.genre.toLowerCase() === genre.toLowerCase() ||
          i.genres.some((g) => g.toLowerCase() === genre.toLowerCase());

        filteredMovies = movies.filter(matchGenre);
        filteredShows = shows.filter(matchGenre);
        filteredAnime = anime.filter(matchGenre);
        filteredGames = games.filter(matchGenre);
      }

      const count = Math.max(
        filteredMovies.length,
        filteredShows.length,
        filteredAnime.length,
        filteredGames.length
      );

      // Interleave in strict pattern: Movie -> Series -> Anime -> Game
      for (let i = 0; i < count; i++) {
        if (filteredMovies[i]) items.push(filteredMovies[i]);
        if (filteredShows[i]) items.push(filteredShows[i]);
        if (filteredAnime[i]) items.push(filteredAnime[i]);
        if (filteredGames[i]) items.push(filteredGames[i]);
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

    const maxLen = Math.max(tmdbResults.length, anilistResults.length, igdbResults.length);
    const interleaved: UnifiedMedia[] = [];
    for (let i = 0; i < maxLen; i++) {
      if (tmdbResults[i]) interleaved.push(tmdbResults[i]);
      if (anilistResults[i]) interleaved.push(anilistResults[i]);
      if (igdbResults[i]) interleaved.push(igdbResults[i]);
    }

    return interleaved;
  },

  async getMediaDetails(id: string): Promise<UnifiedMedia | null> {
    if (id.startsWith("tmdb-movie-")) {
      const sourceId = id.replace("tmdb-movie-", "");
      return tmdbService.getDetails(sourceId, "Movie");
    }
    if (id.startsWith("tmdb-series-") || id.startsWith("tmdb-tv-")) {
      const sourceId = id.replace(/tmdb-(series|tv)-/, "");
      return tmdbService.getDetails(sourceId, "Series");
    }
    if (id.startsWith("anilist-")) {
      const sourceId = id.replace("anilist-", "");
      return anilistService.getDetails(sourceId);
    }
    if (id.startsWith("igdb-")) {
      const sourceId = id.replace("igdb-", "");
      return igdbService.getDetails(sourceId);
    }

    const movie = await tmdbService.getDetails(id, "Movie").catch(() => null);
    if (movie) return movie;

    const show = await tmdbService.getDetails(id, "Series").catch(() => null);
    if (show) return show;

    const anime = await anilistService.getDetails(id).catch(() => null);
    if (anime) return anime;

    const game = await igdbService.getDetails(id).catch(() => null);
    if (game) return game;

    return null;
  },
};
