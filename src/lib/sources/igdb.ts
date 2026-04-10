import { MediaItem } from "@/lib/types";

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
};

type IgdbCountResponse = {
  count: number;
};

let cachedToken: { value: string; expiresAt: number } | null = null;
const igdbResponseCache = new Map<string, { expiresAt: number; payload: unknown }>();

function imageUrl(imageId?: string) {
  return imageId ? `${IGDB_IMAGE_BASE_URL}/${imageId}.jpg` : null;
}

function yearFromTimestamp(timestamp?: number) {
  return timestamp ? new Date(timestamp * 1000).getUTCFullYear() : 0;
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
      releaseInfo: releaseYear ? `${releaseYear} release` : undefined,
      studio: developers[0]?.name,
    },
  };
}

function isUsefulGame(game: MediaItem) {
  return game.year >= 1980 && game.rating >= 6;
}

export async function browseIgdbGames(params: {
  page?: number;
  query?: string;
  genre?: string;
  sort?: "discovery" | "newest" | "rating" | "title";
  seed?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const queryText = params.query?.trim();
  const sort = params.sort ?? "discovery";
  const discoverySeed = params.seed ?? 1;
  const requestPage =
    !queryText && sort === "discovery"
      ? ((Math.abs((discoverySeed * 17) % 18) + (page - 1) * 5) % 18) + 1
      : page;
  const offset = (requestPage - 1) * 24;
  const escapedQuery = queryText?.replace(/"/g, '\\"');
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
  ].join(",");

  const whereParts = [
    "version_parent = null",
    "cover != null",
  ];

  if (genreFilter) {
    whereParts.push(`genres.name ~ *"${genreFilter}"*`);
  }

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
  const query = escapedQuery
    ? `search "${escapedQuery}"; fields ${fields}; where ${whereParts.join(" & ")}; limit 24; offset ${offset};`
    : `fields ${fields}; where ${whereParts.join(" & ")}; ${sortClause} limit 24; offset ${offset};`;
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

export async function getIgdbGameDetails(id: number) {
  const fields = [
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
  ].join(",");

  const games = await igdbFetch<IgdbGame[]>(`fields ${fields}; where id = ${id}; limit 1;`);
  const game = games[0];
  if (!game) {
    throw new Error("Game not found in IGDB");
  }
  return mapGame(game);
}
