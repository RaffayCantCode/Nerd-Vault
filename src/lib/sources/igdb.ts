import { MediaItem } from "@/lib/types";
import { rankCandidatesForQuery } from "@/lib/search-utils";

const IGDB_BASE_URL = "https://api.igdb.com/v4";
const IGDB_IMAGE_BASE_URL = "https://images.igdb.com/igdb/image/upload/t_1080p";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_CACHE_TTL_MS = 1000 * 60 * 30;

type IgdbCover = {
  image_id: string;
};

type IgdbScreenshot = {
  image_id: string;
};

type IgdbArtwork = {
  image_id: string;
};

type IgdbGenre = {
  name: string;
};

type IgdbCompany = {
  company?: {
    name: string;
  };
  developer?: boolean;
  publisher?: boolean;
};

type IgdbPlatform = {
  name: string;
};

type IgdbCollection = {
  id: number;
  name?: string;
};

type IgdbGame = {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  storyline?: string;
  total_rating?: number;
  total_rating_count?: number;
  first_release_date?: number;
  cover?: IgdbCover;
  screenshots?: IgdbScreenshot[];
  artworks?: IgdbArtwork[];
  genres?: IgdbGenre[];
  platforms?: IgdbPlatform[];
  involved_companies?: IgdbCompany[];
  status?: number;
  collection?: IgdbCollection;
  similar_games?: number[];
};

type IgdbCountResponse = {
  count: number;
};

type BrowsePayload = {
  page: number;
  totalPages: number;
  totalResults: number;
  items: MediaItem[];
};

let cachedToken: { value: string; expiresAt: number } | null = null;
const igdbResponseCache = new Map<string, { expiresAt: number; payload: unknown }>();

function imageUrl(imageId?: string) {
  return imageId ? `${IGDB_IMAGE_BASE_URL}/${imageId}.jpg` : null;
}

function yearFromTimestamp(timestamp?: number) {
  return timestamp ? new Date(timestamp * 1000).getUTCFullYear() : 0;
}

function isoDateFromTimestamp(timestamp?: number) {
  return timestamp ? new Date(timestamp * 1000).toISOString().slice(0, 10) : undefined;
}

function mapIgdbStatus(status?: number, releaseYear?: number) {
  if (status === 0) return "Released";
  if (status === 2) return "Alpha";
  if (status === 3) return "Beta";
  if (status === 4) return "Early access";
  if (status === 5) return "Offline";
  if (status === 6) return "Cancelled";
  if (status === 7) return "Rumored";
  if (status === 8) return "Delisted";
  if (releaseYear && releaseYear > new Date().getUTCFullYear()) return "Upcoming";
  if (releaseYear) return "Released";
  return "Release window unknown";
}

async function getIgdbToken() {
  const existing = process.env.TWITCH_APP_ACCESS_TOKEN;
  if (existing) return existing;

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing IGDB_CLIENT_ID or IGDB_CLIENT_SECRET");
  }

  const response = await fetch(TWITCH_TOKEN_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to get Twitch app access token: ${details}`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000 - 60_000,
  };

  return payload.access_token;
}

async function igdbFetch<T>(query: string, endpoint = "games") {
  const cacheKey = `${endpoint}:${query}`;
  const cached = igdbResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload as T;
  }

  const clientId = process.env.IGDB_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing IGDB_CLIENT_ID");
  }

  const token = await getIgdbToken();
  const response = await fetch(`${IGDB_BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "text/plain",
    },
    body: query,
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error("IGDB request failed");
  }

  const payload = (await response.json()) as T;
  igdbResponseCache.set(cacheKey, {
    expiresAt: Date.now() + IGDB_CACHE_TTL_MS,
    payload,
  });
  return payload;
}

function mapGame(game: IgdbGame): MediaItem {
  const releaseYear = yearFromTimestamp(game.first_release_date);
  const developers =
    game.involved_companies
      ?.filter((company) => company.developer && company.company?.name)
      .map((company) => ({
        name: company.company!.name,
        role: "Developer",
      })) ?? [];

  const publishers =
    game.involved_companies
      ?.filter((company) => company.publisher && company.company?.name)
      .map((company) => ({
        name: company.company!.name,
        role: "Publisher",
      })) ?? [];

  const screenshotImages =
    game.screenshots?.map((shot) => imageUrl(shot.image_id)).filter((value): value is string => Boolean(value)) ?? [];
  const artworkImages =
    game.artworks?.map((artwork) => imageUrl(artwork.image_id)).filter((value): value is string => Boolean(value)) ?? [];
  const platformNames = game.platforms?.map((platform) => platform.name).filter(Boolean) ?? [];

  return {
    id: `igdb-game-${game.id}`,
    slug: game.slug,
    source: "igdb",
    sourceId: String(game.id),
    title: game.name,
    originalTitle: game.name,
    type: "game",
    year: releaseYear,
    rating: Number(((game.total_rating ?? 0) / 10).toFixed(1)) || 0,
    language: "en",
    genres: game.genres?.map((genre) => genre.name) ?? [],
    coverUrl:
      imageUrl(game.cover?.image_id) ??
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
    backdropUrl:
      screenshotImages[0] ??
      artworkImages[0] ??
      imageUrl(game.cover?.image_id) ??
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1600&q=80",
    screenshots: [...screenshotImages, ...artworkImages],
    overview: game.summary || game.storyline || "No summary yet.",
    credits: [...developers, ...publishers],
    details: {
      platform: platformNames.length ? platformNames.slice(0, 3).join(" · ") : "Platform data unavailable",
      status: mapIgdbStatus(game.status, releaseYear),
      releaseDate: isoDateFromTimestamp(game.first_release_date),
      releaseInfo: releaseYear ? `${releaseYear} release` : undefined,
      studio: developers[0]?.name,
      collectionTitle: game.collection?.name,
      collectionId: game.collection?.id,
    },
  };
}

function isUsefulGame(game: MediaItem) {
  return game.year >= 1980 && game.rating >= 6;
}

function rankLocalSearchResults(items: MediaItem[], query: string) {
  return rankCandidatesForQuery(items, query, { limit: 96, minRank: 8 });
}

export async function browseIgdbGames(params: {
  page?: number;
  query?: string;
  genre?: string;
  sort?: "discovery" | "newest" | "rating" | "title";
  seed?: number;
}): Promise<BrowsePayload> {
  const page = Math.max(1, params.page ?? 1);
  const queryText = params.query?.trim();
  const sort = params.sort ?? "discovery";
  const discoverySeed = params.seed ?? 1;
  const genreFilter = params.genre && params.genre !== "all" ? params.genre.replace(/"/g, '\\"') : null;

  const fields = [
    "name",
    "slug",
    "summary",
    "storyline",
    "total_rating",
    "total_rating_count",
    "first_release_date",
    "cover.image_id",
    "screenshots.image_id",
    "artworks.image_id",
    "genres.name",
    "platforms.name",
    "involved_companies.company.name",
    "involved_companies.developer",
    "involved_companies.publisher",
    "status",
    "collection.id",
    "collection.name",
  ].join(",");

  const whereParts = [
    "version_parent = null",
    "cover != null",
  ];

  if (genreFilter) {
    whereParts.push(`genres.name ~ *"${genreFilter}"*`);
  }

  if (queryText) {
    const escaped = queryText.replace(/"/g, '\\"');
    const searchRows = await igdbFetch<IgdbGame[]>(
      `search "${escaped}"; fields ${fields}; where ${whereParts.join(" & ")}; limit 45;`,
    ).catch(() => [] as IgdbGame[]);
    const fromSearch = searchRows.map(mapGame).filter((item) => (item.year || 0) >= 1970);

    const fallbackPages = await Promise.all([
      browseIgdbGames({ page: 1, genre: params.genre, sort: "discovery", seed: discoverySeed + 51 }),
      browseIgdbGames({ page: 2, genre: params.genre, sort: "discovery", seed: discoverySeed + 57 }),
      browseIgdbGames({ page: 3, genre: params.genre, sort: "discovery", seed: discoverySeed + 63 }),
    ]);
    const rankedItems = rankLocalSearchResults(
      [...fromSearch, ...fallbackPages.flatMap((entry) => entry.items)],
      queryText,
    ).slice(0, 96);

    return {
      page: 1,
      totalPages: 1,
      totalResults: rankedItems.length,
      items: rankedItems,
    };
  }

  const requestPage =
    !queryText && sort === "discovery"
      ? ((Math.abs((discoverySeed * 17) % 18) + (page - 1) * 5) % 18) + 1
      : page;
  const offset = (requestPage - 1) * 24;
  const escapedQuery = queryText?.replace(/"/g, '\\"');

  const discoverySorts = [
    "sort total_rating_count desc;",
    "sort total_rating desc;",
    "sort first_release_date desc;",
    "sort total_rating_count asc;",   // surface obscure titles
    "sort hypes desc;",               // upcoming/anticipated
  ];
  const sortClause =
    sort === "newest"
      ? "sort first_release_date desc;"
      : sort === "discovery"
        ? discoverySorts[discoverySeed % discoverySorts.length]
        : "sort total_rating_count desc;";
  const query = `fields ${fields}; where ${whereParts.join(" & ")}; ${sortClause} limit 24; offset ${offset};`;
  const games = await igdbFetch<IgdbGame[]>(query);
  const items = games.map(mapGame).filter(isUsefulGame);

  const countQuery = escapedQuery
    ? `search "${escapedQuery}"; where ${whereParts.join(" & ")};`
    : `where ${whereParts.join(" & ")};`;
  const countPayload = await igdbFetch<IgdbCountResponse>(countQuery, "games/count").catch(() => ({ count: items.length }));
  const totalPages = Math.max(1, Math.ceil((countPayload.count || items.length || 1) / 24));

  return {
    page,
    totalPages,
    totalResults: items.length,
    items,
  };
}

const IGDB_GAME_DETAIL_FIELDS = [
  "name",
  "slug",
  "summary",
  "storyline",
  "total_rating",
  "first_release_date",
  "cover.image_id",
  "screenshots.image_id",
  "artworks.image_id",
  "genres.name",
  "platforms.name",
  "involved_companies.company.name",
  "involved_companies.developer",
  "involved_companies.publisher",
  "status",
  "collection.id",
  "collection.name",
  "similar_games",
].join(",");

export async function getIgdbGameDetails(id: number) {
  const games = await igdbFetch<IgdbGame[]>(`fields ${IGDB_GAME_DETAIL_FIELDS}; where id = ${id}; limit 1;`);
  const game = games[0];
  if (!game) {
    throw new Error("Game not found in IGDB");
  }
  return mapGame(game);
}

/** Other games in the same IGDB collection (franchise / series entries). */
export async function getIgdbCollectionNeighbors(gameId: number): Promise<MediaItem[]> {
  const rows = await igdbFetch<Array<{ id: number; collection?: IgdbCollection }>>(
    `fields id, collection.id; where id = ${gameId}; limit 1;`,
  );
  const collectionId = rows[0]?.collection?.id;
  if (!collectionId) {
    return [];
  }

  const games = await igdbFetch<IgdbGame[]>(
    `fields ${IGDB_GAME_DETAIL_FIELDS}; where collection = ${collectionId} & version_parent = null; sort first_release_date asc; limit 40;`,
  );
  return games.map(mapGame).filter((item) => (item.year || 0) >= 1970);
}

/** Resolve IGDB similar_games ids into full cards (best-effort). */
export async function getIgdbGamesByIds(ids: number[]): Promise<MediaItem[]> {
  const unique = Array.from(new Set(ids.filter((id) => Number.isFinite(id) && id > 0))).slice(0, 24);
  if (!unique.length) {
    return [];
  }

  const games = await igdbFetch<IgdbGame[]>(
    `fields ${IGDB_GAME_DETAIL_FIELDS}; where id = (${unique.join(",")}); limit ${unique.length};`,
  );
  return games.map(mapGame).filter((item) => (item.year || 0) >= 1970);
}

/** Games IGDB marks as similar to this one (often same universe or genre). */
export async function getIgdbSimilarGamesForGame(gameId: number): Promise<MediaItem[]> {
  const rows = await igdbFetch<Array<{ similar_games?: number[] }>>(
    `fields similar_games; where id = ${gameId}; limit 1;`,
  );
  const ids = rows[0]?.similar_games ?? [];
  return getIgdbGamesByIds(ids);
}
