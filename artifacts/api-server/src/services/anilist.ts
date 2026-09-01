import { fetchWithCache } from "./cache";
import { UnifiedMedia, slugify, toFiveStarRating } from "./types";

const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";
const JIKAN_BASE_URL = "https://api.jikan.moe/v4";
const TMDB_API_KEY = (typeof process !== "undefined" && process?.env?.TMDB_API_KEY) ? process.env.TMDB_API_KEY : "e992852c2a6404df9d6218982f12c36e";

const HENTAI_BLACKLIST = [
  "hentai",
  "overflow",
  "erotica",
  "porn",
  "boku no pico",
  "aki sora",
  "euphoria",
  "discipline",
  "shoujo ramune",
  "resort boin",
  "itadaki seieki",
  "mankitsu happening",
  "nozoki ana",
  "tsunlise",
  "kuroinu",
];

export function isHentaiOrAdult(item: any): boolean {
  if (!item) return false;
  if (item.isAdult === true) return true;

  // Check Jikan rating (e.g. "Rx - Hentai", "Rx")
  if (item.rating && typeof item.rating === "string") {
    const r = item.rating.toLowerCase();
    if (r.includes("hentai") || r.includes("explicit") || r.includes("erotica") || r.includes("rx -")) {
      return true;
    }
  }

  // Check Jikan explicit_genres
  if (Array.isArray(item.explicit_genres) && item.explicit_genres.length > 0) {
    return true;
  }

  // Check genres
  const genres = Array.isArray(item.genres) ? item.genres : [];
  for (const g of genres) {
    const genreStr = typeof g === "string" ? g : g?.name || "";
    const lower = genreStr.toLowerCase();
    if (lower === "hentai" || lower === "erotica" || lower === "explicit") {
      return true;
    }
  }

  // Check titles (English, Romaji, Native, Japanese, UserPreferred, etc.)
  const titles = [
    item.title?.english,
    item.title?.romaji,
    item.title?.native,
    item.title?.userPreferred,
    item.title,
    item.originalTitle,
    item.original_title,
    item.title_english,
    item.title_japanese,
    item.name,
    item.slug,
  ]
    .filter(Boolean)
    .map((t) => String(t).toLowerCase());

  for (const t of titles) {
    for (const kw of HENTAI_BLACKLIST) {
      if (t.includes(kw)) return true;
    }
  }

  // Check synopsis/overview for explicit hentai tags
  const desc = (item.description || item.overview || item.synopsis || "").toLowerCase();
  if (
    desc.includes("hentai") ||
    desc.includes("uncensored hentai") ||
    desc.includes("erotic animation") ||
    desc.includes("adult anime")
  ) {
    return true;
  }

  return false;
}

const isAdultContent = isHentaiOrAdult;

function formatAniList(item: any): UnifiedMedia {
  const title = item.title?.english || item.title?.romaji || item.title?.userPreferred || "Untitled Anime";
  const year = String(item.seasonYear || item.startDate?.year || "2024");
  const rawScore = item.averageScore ? item.averageScore / 10 : 8.0;

  return {
    id: `anilist-${item.id}`,
    slug: slugify(title),
    title,
    originalTitle: item.title?.native,
    type: "Anime",
    year,
    rating: toFiveStarRating(rawScore),
    genre: item.genres?.[0] || "Anime",
    genres: item.genres?.length > 0 ? item.genres : ["Anime", "Action"],
    poster: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || "https://image.tmdb.org/t/p/w500/dqzenchTd7lp5zht7BdlqM7RBhD.jpg",
    backdrop: item.bannerImage || undefined,
    overview: (item.description || "No description provided.").replace(/<[^>]*>/g, ""),
    runtime: item.episodes ? `${item.episodes} Episodes` : undefined,
    studio: item.studios?.nodes?.[0]?.name,
    source: "anilist",
    sourceId: String(item.id),
  };
}

function formatJikan(item: any): UnifiedMedia {
  const title = item.title_english || item.title || "Untitled Anime";
  const year = String(item.year || item.aired?.prop?.from?.year || "2024");
  const rawScore = item.score || 8.0;
  const genres = (item.genres || []).map((g: any) => g.name);

  return {
    id: `anilist-mal-${item.mal_id}`,
    slug: slugify(title),
    title,
    originalTitle: item.title_japanese,
    type: "Anime",
    year,
    rating: toFiveStarRating(rawScore),
    genre: genres[0] || "Anime",
    genres: genres.length > 0 ? genres : ["Anime", "Action"],
    poster: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || "https://image.tmdb.org/t/p/w500/dqzenchTd7lp5zht7BdlqM7RBhD.jpg",
    backdrop: undefined,
    overview: (item.synopsis || "No description provided.").replace(/\[Written by MAL Rewrite\]/g, "").trim(),
    runtime: item.episodes ? `${item.episodes} Episodes` : undefined,
    studio: item.studios?.[0]?.name,
    source: "anilist",
    sourceId: String(item.mal_id),
  };
}

async function runGraphQLQuery(query: string, variables: any = {}) {
  const cacheKey = `anilist:${JSON.stringify({ query, variables })}`;
  return fetchWithCache(
    cacheKey,
    1000 * 60 * 30,
    async () => {
      let lastErr: any;
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch(ANILIST_GRAPHQL_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "User-Agent": "Mozilla/5.0 NerdVault/2.0 (https://nerdvault.site)",
            },
            body: JSON.stringify({ query, variables }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.status === 429) {
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }
          if (!res.ok) throw new Error(`AniList returned status ${res.status}`);
          const json: any = await res.json();
          if (json.errors && json.errors.length > 0 && !json.data) {
            throw new Error(`AniList GraphQL error: ${json.errors[0].message}`);
          }
          return json.data;
        } catch (err) {
          clearTimeout(timeoutId);
          lastErr = err;
          if (attempt === 0) await new Promise((r) => setTimeout(r, 300));
        }
      }
      throw lastErr;
    }
  );
}

// Live Jikan Fallback (SFW enforced)
async function fetchJikanTop(page: number = 1): Promise<UnifiedMedia[]> {
  const cacheKey = `jikan:top:${page}`;
  return fetchWithCache(cacheKey, 1000 * 60 * 30, async () => {
    try {
      const url = `${JIKAN_BASE_URL}/top/anime?page=${page}&limit=20&filter=bypopularity&sfw=true`;
      const res = await fetch(url, { headers: { "User-Agent": "NerdVault/2.0" } });
      if (!res.ok) return [];
      const data: any = await res.json();
      return (data.data || [])
        .filter((item: any) => !isAdultContent(item))
        .map(formatJikan);
    } catch {
      return [];
    }
  });
}

// Live TMDB Animation Fallback
async function fetchTmdbAnimation(page: number = 1): Promise<UnifiedMedia[]> {
  const cacheKey = `tmdb:anime:${page}`;
  return fetchWithCache(cacheKey, 1000 * 60 * 30, async () => {
    try {
      const url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&include_adult=false&page=${page}`;
      const res = await fetch(url, { headers: { "User-Agent": "NerdVault/2.0" } });
      if (!res.ok) return [];
      const data: any = await res.json();
      return (data.results || []).map((m: any) => ({
        id: `tmdb-anime-${m.id}`,
        slug: slugify(m.name || m.original_name || `anime-${m.id}`),
        title: m.name || m.original_name || "Anime",
        originalTitle: m.original_name,
        type: "Anime" as const,
        year: (m.first_air_date || "").slice(0, 4) || "2024",
        rating: toFiveStarRating(m.vote_average || 8.0),
        genre: "Anime",
        genres: ["Anime", "Action", "Fantasy"],
        poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "https://image.tmdb.org/t/p/w500/dqzenchTd7lp5zht7BdlqM7RBhD.jpg",
        backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : undefined,
        overview: m.overview || "Popular Japanese anime series.",
        source: "tmdb" as const,
        sourceId: String(m.id),
      }));
    } catch {
      return [];
    }
  });
}

export const anilistService = {
  async getTrendingAnime(page: number = 1): Promise<UnifiedMedia[]> {
    const tmdbPromise = fetchTmdbAnimation(page).catch(() => []);
    const query = `
      query ($page: Int) {
        Page(page: $page, perPage: 24) {
          media(type: ANIME, isAdult: false, sort: [TRENDING_DESC, POPULARITY_DESC]) {
            id
            isAdult
            title { romaji english native }
            seasonYear
            startDate { year }
            coverImage { large extraLarge }
            bannerImage
            averageScore
            genres
            description
            episodes
            studios(isMain: true) { nodes { name } }
          }
        }
      }
    `;

    try {
      const [data, tmdbItems] = await Promise.all([
        runGraphQLQuery(query, { page }).catch(() => null),
        tmdbPromise,
      ]);

      const anilistItems = (data?.Page?.media || [])
        .filter((item: any) => !isAdultContent(item))
        .map(formatAniList);

      const combined = [...anilistItems, ...(tmdbItems || [])];
      if (combined.length > 0) {
        // Prioritize items with genuine HD widescreen backdrops
        const withBackdrop = combined.filter((i) => i.backdrop && i.backdrop.length > 5);
        const withoutBackdrop = combined.filter((i) => !i.backdrop || i.backdrop.length <= 5);
        return [...withBackdrop, ...withoutBackdrop].slice(0, 24);
      }
    } catch (err) {
      console.warn("AniList trending live query failed, trying live Jikan SFW fallback:", err);
    }

    const tmdbFallback = await tmdbPromise;
    if (tmdbFallback && tmdbFallback.length > 0) return tmdbFallback;

    // Live SFW Fallback: Jikan API
    return await fetchJikanTop(page);
  },

  async getPopularAnime(genre?: string, page: number = 1): Promise<UnifiedMedia[]> {
    const tmdbPromise = fetchTmdbAnimation(page).catch(() => []);
    const query = `
      query ($genre: String, $page: Int) {
        Page(page: $page, perPage: 24) {
          media(type: ANIME, isAdult: false, sort: [SCORE_DESC, POPULARITY_DESC], genre: $genre) {
            id
            isAdult
            title { romaji english native }
            seasonYear
            startDate { year }
            coverImage { large extraLarge }
            bannerImage
            averageScore
            genres
            description
            episodes
            studios(isMain: true) { nodes { name } }
          }
        }
      }
    `;

    try {
      const [data, tmdbItems] = await Promise.all([
        runGraphQLQuery(query, { genre: genre || undefined, page }).catch(() => null),
        tmdbPromise,
      ]);

      const anilistItems = (data?.Page?.media || [])
        .filter((item: any) => !isAdultContent(item))
        .map(formatAniList);

      const combined = [...anilistItems, ...(tmdbItems || [])];
      if (combined.length > 0) {
        const withBackdrop = combined.filter((i) => i.backdrop && i.backdrop.length > 5);
        const withoutBackdrop = combined.filter((i) => !i.backdrop || i.backdrop.length <= 5);
        return [...withBackdrop, ...withoutBackdrop].slice(0, 24);
      }
    } catch (err) {
      console.warn("AniList popular live query failed, trying live Jikan fallback:", err);
    }

    const tmdbFallback = await tmdbPromise;
    if (tmdbFallback && tmdbFallback.length > 0) return tmdbFallback;

    return await fetchJikanTop(page);
  },

  async search(search: string): Promise<UnifiedMedia[]> {
    if (!search.trim()) return [];
    const query = `
      query ($search: String) {
        Page(page: 1, perPage: 20) {
          media(type: ANIME, isAdult: false, search: $search, sort: SEARCH_MATCH) {
            id
            isAdult
            title { romaji english native }
            seasonYear
            startDate { year }
            coverImage { large extraLarge }
            bannerImage
            averageScore
            genres
            description
            episodes
            studios(isMain: true) { nodes { name } }
          }
        }
      }
    `;

    try {
      const data = await runGraphQLQuery(query, { search });
      const items = (data?.Page?.media || [])
        .filter((item: any) => !isAdultContent(item))
        .map(formatAniList);
      if (items.length > 0) return items;
    } catch (err) {
      console.warn("AniList search live query failed, trying live Jikan search:", err);
    }

    try {
      const url = `${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(search)}&limit=15&sfw=true`;
      const res = await fetch(url, { headers: { "User-Agent": "NerdVault/2.0" } });
      if (res.ok) {
        const data: any = await res.json();
        return (data.data || [])
          .filter((item: any) => !isAdultContent(item))
          .map(formatJikan);
      }
    } catch {}

    return [];
  },

  async getDetailsByMalId(malId: string): Promise<UnifiedMedia | null> {
    const cleanMalId = malId.replace(/^mal-/i, "");
    try {
      const url = `${JIKAN_BASE_URL}/anime/${cleanMalId}/full`;
      const res = await fetch(url, { headers: { "User-Agent": "NerdVault/2.0" } });
      if (res.ok) {
        const data: any = await res.json();
        if (data.data && !isAdultContent(data.data)) return formatJikan(data.data);
      }
    } catch {}

    const query = `
      query ($idMal: Int) {
        Media(idMal: $idMal, type: ANIME, isAdult: false) {
          id
          idMal
          title { romaji english native }
          seasonYear
          startDate { year }
          coverImage { large extraLarge }
          bannerImage
          averageScore
          genres
          description
          episodes
          studios(isMain: true) { nodes { name } }
        }
      }
    `;
    try {
      const data = await runGraphQLQuery(query, { idMal: Number(cleanMalId) });
      if (data?.Media && !isAdultContent(data.Media)) return formatAniList(data.Media);
    } catch {}

    return null;
  },

  async getDetails(id: string): Promise<UnifiedMedia | null> {
    const rawId = id.replace(/^(anilist-|anilist-mal-|tmdb-anime-)/i, "");
    if (!rawId || isNaN(Number(rawId))) return null;

    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME, isAdult: false) {
          id
          idMal
          isAdult
          title { romaji english native userPreferred }
          seasonYear
          startDate { year }
          coverImage { large extraLarge }
          bannerImage
          averageScore
          genres
          description
          episodes
          studios(isMain: true) { nodes { name } }
          relations {
            edges {
              relationType
              node {
                id
                isAdult
                title { romaji english native }
                type
                format
                seasonYear
                startDate { year }
                coverImage { large }
                averageScore
                genres
              }
            }
          }
          recommendations(page: 1, perPage: 16) {
            nodes {
              mediaRecommendation {
                id
                isAdult
                title { romaji english native }
                type
                seasonYear
                startDate { year }
                coverImage { large }
                averageScore
                genres
                description
              }
            }
          }
        }
      }
    `;

    try {
      const data = await runGraphQLQuery(query, { id: Number(rawId) });
      const item = data?.Media;
      if (!item || isAdultContent(item)) throw new Error("No AniList item found");

      const media = formatAniList(item);

      const relationEdges = item.relations?.edges || [];
      const franchiseTypes = ["PREQUEL", "SEQUEL", "PARENT", "SIDE_STORY", "SPIN_OFF", "ALTERNATIVE"];
      const franchiseNodes = relationEdges
        .filter((e: any) => e?.node && e.node.type === "ANIME" && !isAdultContent(e.node) && franchiseTypes.includes(e.relationType))
        .map((e: any) => formatAniList(e.node));

      if (franchiseNodes.length > 0) {
        const allFranchise = [media, ...franchiseNodes].sort((a, b) => Number(a.year) - Number(b.year));
        media.franchise = {
          name: `${media.title} Universe`,
          items: allFranchise,
        };
      }

      const recNodes = (item.recommendations?.nodes || [])
        .map((n: any) => n?.mediaRecommendation)
        .filter((r: any) => r && r.id && r.id !== item.id && !isAdultContent(r))
        .map(formatAniList);

      media.similar = recNodes;
      return media;
    } catch (err) {
      console.warn(`AniList getDetails(${rawId}) query note:`, err);
      // Fallback Tier 1: Live Jikan search by ID
      try {
        const url = `${JIKAN_BASE_URL}/anime/${rawId}/full`;
        const res = await fetch(url, { headers: { "User-Agent": "NerdVault/2.0" } });
        if (res.ok) {
          const data: any = await res.json();
          if (data.data && !isAdultContent(data.data)) return formatJikan(data.data);
        }
      } catch {}

      return null;
    }
  },
};
