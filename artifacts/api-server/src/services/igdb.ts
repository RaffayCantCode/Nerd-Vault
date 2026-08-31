import { fetchWithCache } from "./cache";
import { UnifiedMedia, slugify, toFiveStarRating } from "./types";

const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID || "3ps9klwc40rb0dk0qyvvjfg5io7v4s";
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET || "g1sq4t45e6sg8m7un9apull1vd1f44";
const IGDB_API_URL = "https://api.igdb.com/v4";

let oauthToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (oauthToken && oauthToken.expiresAt > Date.now() + 60000) {
    return oauthToken.token;
  }

  const tokenUrl = `https://id.twitch.tv/oauth2/token?client_id=${IGDB_CLIENT_ID}&client_secret=${IGDB_CLIENT_SECRET}&grant_type=client_credentials`;
  const res = await fetch(tokenUrl, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Failed to get IGDB OAuth token: ${res.statusText}`);
  }
  const data = await res.json();
  oauthToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };
  return oauthToken.token;
}

function formatGame(item: any): UnifiedMedia {
  const coverUrl = item.cover?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.jpg`
    : "https://images.igdb.com/igdb/image/upload/t_cover_big/co3xjm.jpg";

  const backdropUrl = item.screenshots?.[0]?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_1080p/${item.screenshots[0].image_id}.jpg`
    : undefined;

  const year = item.first_release_date
    ? new Date(item.first_release_date * 1000).getFullYear().toString()
    : "2024";

  const genres = (item.genres || []).map((g: any) => g.name);
  const platforms = (item.platforms || []).map((p: any) => p.name).join(", ");
  const rawRating = item.rating || item.total_rating || 85;

  return {
    id: `igdb-${item.id}`,
    slug: slugify(item.name || `game-${item.id}`),
    title: item.name || "Untitled Game",
    type: "Game",
    year,
    rating: toFiveStarRating(rawRating / 10),
    genre: genres[0] || "Game",
    genres: genres.length > 0 ? genres : ["Game", "Action"],
    poster: coverUrl,
    backdrop: backdropUrl,
    overview: item.summary || "No description available.",
    platform: platforms || undefined,
    studio: item.involved_companies?.[0]?.company?.name,
    source: "igdb",
    sourceId: String(item.id),
  };
}

async function queryIGDB(endpoint: string, queryBody: string): Promise<any> {
  const token = await getAccessToken();
  const cacheKey = `igdb:${endpoint}:${queryBody}`;

  return fetchWithCache(
    cacheKey,
    1000 * 60 * 30,
    async () => {
      const res = await fetch(`${IGDB_API_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          "Client-ID": IGDB_CLIENT_ID,
          Authorization: `Bearer ${token}`,
          "Content-Type": "text/plain",
        },
        body: queryBody,
      });

      if (!res.ok) {
        throw new Error(`IGDB query failed: ${res.status} ${res.statusText}`);
      }
      return res.json();
    }
  );
}

export const igdbService = {
  async getPopularGames(genre?: string, page: number = 1): Promise<UnifiedMedia[]> {
    try {
      const offset = (page - 1) * 18;
      const whereClause = genre
        ? `where genres.name = "${genre}" & rating != null & cover != null;`
        : `where rating != null & rating_count > 20 & cover != null;`;

      const body = `
        fields name, summary, first_release_date, rating, total_rating, cover.image_id, screenshots.image_id, genres.name, platforms.name, involved_companies.company.name;
        sort rating desc;
        ${whereClause}
        offset ${offset};
        limit 18;
      `;
      const data = await queryIGDB("games", body);
      return (data || []).map(formatGame);
    } catch {
      return [];
    }
  },

  async search(query: string): Promise<UnifiedMedia[]> {
    if (!query.trim()) return [];
    try {
      const body = `
        search "${query.replace(/"/g, "")}";
        fields name, summary, first_release_date, rating, cover.image_id, screenshots.image_id, genres.name, platforms.name;
        limit 15;
      `;
      const data = await queryIGDB("games", body);
      return (data || []).map(formatGame);
    } catch {
      return [];
    }
  },

  async getDetails(id: string): Promise<UnifiedMedia | null> {
    try {
      const cleanId = id.replace(/^igdb-/, "");
      const body = `
        fields name, summary, first_release_date, rating, total_rating, cover.image_id, screenshots.image_id, genres.name, platforms.name, involved_companies.company.name,
               franchises.name, franchises.games.name, franchises.games.cover.image_id, franchises.games.first_release_date, franchises.games.rating,
               collection.name, collection.games.name, collection.games.cover.image_id, collection.games.first_release_date, collection.games.rating,
               similar_games.name, similar_games.cover.image_id, similar_games.first_release_date, similar_games.rating, similar_games.genres.name;
        where id = ${cleanId};
      `;
      const data = await queryIGDB("games", body);
      if (!data || data.length === 0) return null;

      const item = data[0];
      const media = formatGame(item);

      const franchiseGroup = item.franchises?.[0] || item.collection;
      if (franchiseGroup && franchiseGroup.games && franchiseGroup.games.length > 0) {
        const franchiseGames = franchiseGroup.games
          .map(formatGame)
          .sort((a: UnifiedMedia, b: UnifiedMedia) => Number(a.year) - Number(b.year));

        media.franchise = {
          name: franchiseGroup.name || `${media.title} Series`,
          items: franchiseGames,
        };
      }

      if (item.similar_games && item.similar_games.length > 0) {
        media.similar = item.similar_games.map(formatGame);
      }

      return media;
    } catch {
      return null;
    }
  },
};
