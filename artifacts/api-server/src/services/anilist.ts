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

export const anilistIdToTitle = new Map<string, string>();
export const anilistItemCache = new Map<string, UnifiedMedia>();

const KITSU_BASE_URL = "https://kitsu.io/api/edge";

function formatKitsu(data: any): UnifiedMedia {
  const attr = data.attributes || {};
  const canonicalTitle = attr.canonicalTitle || attr.titles?.en || attr.titles?.en_jp || "Anime";
  const year = (attr.startDate || "").slice(0, 4) || "2024";
  const rawScore = attr.averageRating ? Number(attr.averageRating) / 10 : 8.2;
  const poster = attr.posterImage?.large || attr.posterImage?.original || "https://image.tmdb.org/t/p/w500/dqzenchTd7lp5zht7BdlqM7RBhD.jpg";
  const backdrop = attr.coverImage?.large || attr.coverImage?.original;

  return {
    id: `kitsu-${data.id}`,
    slug: slugify(canonicalTitle),
    title: canonicalTitle,
    originalTitle: attr.titles?.ja_jp,
    type: "Anime",
    year,
    rating: toFiveStarRating(rawScore),
    genre: "Anime",
    genres: ["Anime"],
    poster,
    backdrop,
    overview: (attr.synopsis || "No description provided.").replace(/<[^>]*>/g, ""),
    runtime: attr.episodeCount ? `${attr.episodeCount} Episodes` : undefined,
    source: "anilist",
    sourceId: String(data.id),
  };
}

export async function fetchKitsuByTitle(title: string): Promise<UnifiedMedia | null> {
  if (!title || !title.trim()) return null;
  const cacheKey = `kitsu:title:${title.toLowerCase().trim()}`;
  return fetchWithCache(cacheKey, 1000 * 60 * 60 * 24, async () => {
    try {
      const url = `${KITSU_BASE_URL}/anime?filter[text]=${encodeURIComponent(title.trim())}&page[limit]=1`;
      const res = await fetch(url, { headers: { Accept: "application/vnd.api+json", "User-Agent": "NerdVault/2.0" } });
      if (!res.ok) return null;
      const data: any = await res.json();
      const raw = data.data?.[0];
      if (!raw) return null;
      return formatKitsu(raw);
    } catch {
      return null;
    }
  });
}

export async function fetchKitsuById(id: string): Promise<UnifiedMedia | null> {
  const cleanId = id.replace(/^kitsu-/i, "").trim();
  const cacheKey = `kitsu:id:${cleanId}`;
  return fetchWithCache(cacheKey, 1000 * 60 * 60 * 24, async () => {
    try {
      const url = `${KITSU_BASE_URL}/anime/${cleanId}`;
      const res = await fetch(url, { headers: { Accept: "application/vnd.api+json", "User-Agent": "NerdVault/2.0" } });
      if (!res.ok) return null;
      const data: any = await res.json();
      if (!data.data) return null;
      return formatKitsu(data.data);
    } catch {
      return null;
    }
  });
}

export async function fetchKitsuTrending(): Promise<UnifiedMedia[]> {
  const cacheKey = "kitsu:trending";
  return fetchWithCache(cacheKey, 1000 * 60 * 60, async () => {
    try {
      const url = `${KITSU_BASE_URL}/trending/anime?limit=20`;
      const res = await fetch(url, { headers: { Accept: "application/vnd.api+json", "User-Agent": "NerdVault/2.0" } });
      if (!res.ok) return [];
      const json: any = await res.json();
      return (json.data || [])
        .filter((d: any) => !isHentaiOrAdult(d))
        .map(formatKitsu);
    } catch {
      return [];
    }
  });
}

export async function fetchKitsuSearch(query: string): Promise<UnifiedMedia[]> {
  if (!query || !query.trim()) return [];
  const cacheKey = `kitsu:search:${query.toLowerCase().trim()}`;
  return fetchWithCache(cacheKey, 1000 * 60 * 30, async () => {
    try {
      const url = `${KITSU_BASE_URL}/anime?filter[text]=${encodeURIComponent(query.trim())}&page[limit]=15`;
      const res = await fetch(url, { headers: { Accept: "application/vnd.api+json", "User-Agent": "NerdVault/2.0" } });
      if (!res.ok) return [];
      const json: any = await res.json();
      return (json.data || [])
        .filter((d: any) => !isHentaiOrAdult(d))
        .map(formatKitsu);
    } catch {
      return [];
    }
  });
}

function formatAniList(item: any): UnifiedMedia {
  const title = item.title?.english || item.title?.romaji || item.title?.userPreferred || "Untitled Anime";
  const year = String(item.seasonYear || item.startDate?.year || "2024");
  const rawScore = item.averageScore ? item.averageScore / 10 : 8.0;

  const media: UnifiedMedia = {
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

  if (item.id) {
    anilistIdToTitle.set(String(item.id), title);
    anilistItemCache.set(String(item.id), media);
  }

  return media;
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
        .map((m: any) => ({ ...formatAniList(m), curation: "Trending" as const }));

      const seenTitles = new Set(anilistItems.map((a: UnifiedMedia) => a.title.toLowerCase().trim()));
      const uniqueTmdb = (tmdbItems || [])
        .filter((t: UnifiedMedia) => !seenTitles.has(t.title.toLowerCase().trim()))
        .map((t: UnifiedMedia) => ({ ...t, curation: "Trending" as const }));

      const combined = [...anilistItems, ...uniqueTmdb];
      if (combined.length > 0) {
        const withBackdrop = combined.filter((i) => i.backdrop && i.backdrop.length > 5);
        const withoutBackdrop = combined.filter((i) => !i.backdrop || i.backdrop.length <= 5);
        return [...withBackdrop, ...withoutBackdrop].slice(0, 24);
      }
    } catch (err) {
      console.warn("AniList trending live query failed, trying live Jikan SFW fallback:", err);
    }

    const tmdbFallback = await tmdbPromise;
    if (tmdbFallback && tmdbFallback.length > 0) return tmdbFallback.map((t: UnifiedMedia) => ({ ...t, curation: "Trending" as const }));

    const jikanFallback = await fetchJikanTop(page);
    return jikanFallback.map((j: UnifiedMedia) => ({ ...j, curation: "Trending" as const }));
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
        .map((m: any) => ({ ...formatAniList(m), curation: "Popular" as const }));

      const seenTitles = new Set(anilistItems.map((a: UnifiedMedia) => a.title.toLowerCase().trim()));
      const uniqueTmdb = (tmdbItems || [])
        .filter((t: UnifiedMedia) => !seenTitles.has(t.title.toLowerCase().trim()))
        .map((t: UnifiedMedia) => ({ ...t, curation: "Popular" as const }));

      const combined = [...anilistItems, ...uniqueTmdb];
      if (combined.length > 0) {
        const withBackdrop = combined.filter((i) => i.backdrop && i.backdrop.length > 5);
        const withoutBackdrop = combined.filter((i) => !i.backdrop || i.backdrop.length <= 5);
        return [...withBackdrop, ...withoutBackdrop].slice(0, 24);
      }
    } catch (err) {
      console.warn("AniList popular live query failed, trying live Jikan fallback:", err);
    }

    const tmdbFallback = await tmdbPromise;
    if (tmdbFallback && tmdbFallback.length > 0) return tmdbFallback.map((t: UnifiedMedia) => ({ ...t, curation: "Popular" as const }));

    const jikan = await fetchJikanTop(page);
    return jikan.map((j: UnifiedMedia) => ({ ...j, curation: "Popular" as const }));
  },

  async getNicheAnime(genre?: string, page: number = 1): Promise<UnifiedMedia[]> {
    const query = `
      query ($genre: String, $page: Int) {
        Page(page: $page, perPage: 24) {
          media(type: ANIME, isAdult: false, sort: [SCORE_DESC], popularity_greater: 8000, popularity_lesser: 95000, genre: $genre) {
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
      const data = await runGraphQLQuery(query, { genre: genre || undefined, page }).catch(() => null);
      const anilistItems = (data?.Page?.media || [])
        .filter((item: any) => !isAdultContent(item))
        .map((m: any) => ({ ...formatAniList(m), curation: "Niche" as const }));

      if (anilistItems.length > 0) {
        return anilistItems;
      }
    } catch (err) {
      console.warn("AniList niche query failed:", err);
    }

    // Fallback niche anime
    const fallback = await this.getPopularAnime(genre, page + 3);
    return fallback.map((i) => ({ ...i, curation: "Niche" as const }));
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
      console.warn("AniList search live query failed, trying live Kitsu search:", err);
    }

    const kitsuSearch = await fetchKitsuSearch(search);
    if (kitsuSearch.length > 0) return kitsuSearch;

    return [];
  },

  async getDetailsByMalId(malId: string): Promise<UnifiedMedia | null> {
    const cleanMalId = malId.replace(/^mal-/i, "");
    const query = `
      query ($idMal: Int) {
        Media(idMal: $idMal, type: ANIME, isAdult: false) {
          id
          idMal
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
        }
      }
    `;
    try {
      const data = await runGraphQLQuery(query, { idMal: Number(cleanMalId) });
      if (data?.Media && !isAdultContent(data.Media)) return formatAniList(data.Media);
    } catch {}

    // Kitsu fallback
    const kitsuItem = await fetchKitsuById(cleanMalId);
    if (kitsuItem) return kitsuItem;

    return null;
  },

  async getDetails(id: string): Promise<UnifiedMedia | null> {
    const rawId = id.replace(/^(anilist-|anilist-mal-|tmdb-anime-|kitsu-)/i, "").trim();
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
      if (item && !isAdultContent(item)) {
        const media = formatAniList(item);

        const relationEdges = item.relations?.edges || [];
        const franchiseTypes = ["PREQUEL", "SEQUEL", "PARENT", "SIDE_STORY", "SPIN_OFF", "ALTERNATIVE"];
        const franchiseNodes = relationEdges
          .filter((e: any) => e?.node && e.node.type === "ANIME" && !isAdultContent(e.node) && franchiseTypes.includes(e.relationType))
          .map((e: any) => formatAniList(e.node))
          .filter((n: UnifiedMedia) => n.id !== media.id);

        if (franchiseNodes.length > 0) {
          // Use clean copy of item without .franchise property to avoid circular reference in JSON serialization
          const cleanSelf = formatAniList(item);
          const allFranchise = [cleanSelf, ...franchiseNodes].sort((a, b) => Number(a.year) - Number(b.year));
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

        if (!media.backdrop) {
          const kitsu = await fetchKitsuByTitle(media.title).catch(() => null);
          if (kitsu?.backdrop) media.backdrop = kitsu.backdrop;
        }

        return media;
      }
    } catch (err) {
      console.warn(`AniList full getDetails(${rawId}) query note:`, err);
    }

    // Fallback Tier 1: Lean AniList query (without relations/recommendations to avoid heavy sub-query errors)
    try {
      const leanQuery = `
        query ($id: Int) {
          Media(id: $id, type: ANIME, isAdult: false) {
            id
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
          }
        }
      `;
      const leanData = await runGraphQLQuery(leanQuery, { id: Number(rawId) });
      if (leanData?.Media && !isAdultContent(leanData.Media)) {
        const leanMedia = formatAniList(leanData.Media);
        if (!leanMedia.backdrop) {
          const kitsu = await fetchKitsuByTitle(leanMedia.title).catch(() => null);
          if (kitsu?.backdrop) leanMedia.backdrop = kitsu.backdrop;
        }
        return leanMedia;
      }
    } catch {}

    // Fallback Tier 2: Kitsu API using cached title
    const knownTitle = anilistIdToTitle.get(String(rawId));
    if (knownTitle) {
      const kitsuItem = await fetchKitsuByTitle(knownTitle);
      if (kitsuItem) return { ...kitsuItem, id: `anilist-${rawId}` };
    }

    // Fallback Tier 3: In-memory cache from discover or home feed
    const cachedItem = anilistItemCache.get(String(rawId));
    if (cachedItem) {
      return cachedItem;
    }

    // Fallback Tier 4: Direct Kitsu ID lookup
    const directKitsu = await fetchKitsuById(rawId);
    if (directKitsu) {
      return directKitsu;
    }

    return null;
  },
};
