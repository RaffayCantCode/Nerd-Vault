export type MediaType = "movie" | "show" | "anime" | "anime_movie" | "game" | "all";

export type MediaPerson = {
  name: string;
  role: string;
  character?: string;
};

export type MediaItem = {
  id: string;
  slug: string;
  source: "local" | "tmdb" | "jikan" | "igdb";
  sourceId: string;
  title: string;
  originalTitle?: string;
  type: MediaType;
  year: number;
  rating: number;
  language: string;
  genres: string[];
  coverUrl: string;
  backdropUrl: string;
  screenshots?: string[];
  overview: string;
  credits: MediaPerson[];
  details: {
    runtime?: string;
    studio?: string;
    platform?: string;
    status?: string;
    releaseDate?: string;
    nextEpisodeDate?: string;
    lastEpisodeDate?: string;
    trailerUrl?: string;
    releaseInfo?: string;
    seasonCount?: number;
    episodeCount?: number;
    collectionTitle?: string;
    /** TMDB / IGDB collection id for franchise siblings */
    collectionId?: number;
    entryCount?: number;
    entryLabel?: string;
  };
};
