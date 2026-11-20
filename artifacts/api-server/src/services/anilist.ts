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

export function isEcchi(item: any): boolean {
  if (!item) return false;
  const genres = Array.isArray(item.genres) ? item.genres : [];
  for (const g of genres) {
    const genreStr = typeof g === "string" ? g : g?.name || "";
    if (genreStr.toLowerCase() === "ecchi") return true;
  }
  if (typeof item.genre === "string" && item.genre.toLowerCase() === "ecchi") return true;

  const tags = Array.isArray(item.tags) ? item.tags : [];
  for (const t of tags) {
    const tagStr = typeof t === "string" ? t : t?.name || "";
    if (tagStr.toLowerCase() === "ecchi") return true;
  }

  const desc = (item.description || item.overview || item.synopsis || "").toLowerCase();
  if (
    desc.includes("ecchi") ||
    desc.includes("fanservice-heavy") ||
    desc.includes("harem fanservice") ||
    desc.includes("scantily clad")
  ) {
    return true;
  }

  return false;
}

const isAdultContent = isHentaiOrAdult;

export const anilistIdToTitle = new Map<string, string>();
export const anilistItemCache = new Map<string, UnifiedMedia>();

const KITSU_BASE_URL = "https://kitsu.io/api/edge";

export function isReleasedKitsu(item: any): boolean {
  if (!item) return false;
  const attr = item.attributes || {};
  if (attr.status === "unreleased" || attr.status === "upcoming") return false;
  const today = new Date().toISOString().slice(0, 10);
  if (attr.startDate && String(attr.startDate).slice(0, 10) > today) {
    return false;
  }
  const currentYear = new Date().getFullYear();
  const year = parseInt((attr.startDate || "").slice(0, 4), 10);
  if (!isNaN(year) && year > currentYear) {
    return false;
  }
  return true;
}

export function isReleasedAniList(item: any): boolean {
  if (!item) return false;
  if (item.status === "NOT_YET_RELEASED") return false;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (item.seasonYear && item.seasonYear > currentYear) return false;
  if (!item.startDate?.year) return false;
  if (item.startDate.year > currentYear) return false;

  // If startDate is in the current year but month/day is TBA, treat conservatively as unreleased unless RELEASING/FINISHED
  if (item.startDate.year === currentYear) {
    if (!item.startDate.month) {
      return item.status === "RELEASING" || item.status === "FINISHED";
    }
    if (item.startDate.month > currentMonth) return false;
    if (item.startDate.month === currentMonth && !item.startDate.day) {
      return item.status === "RELEASING" || item.status === "FINISHED";
    }
  }

  const y = String(item.startDate.year).padStart(4, "0");
  const m = item.startDate.month ? String(item.startDate.month).padStart(2, "0") : "01";
  const d = item.startDate.day ? String(item.startDate.day).padStart(2, "0") : "01";
  if (`${y}-${m}-${d}` > today) return false;
  return true;
}

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
    releaseDate: attr.startDate ? String(attr.startDate).slice(0, 10) : undefined,
    rating: toFiveStarRating(rawScore),
    genre: "Anime",
    genres: ["Anime"],
    poster,
    backdrop,
    overview: (attr.synopsis || "No description provided.").replace(/<[^>]*>/g, ""),
    runtime: attr.episodeCount ? `${attr.episodeCount} Episodes` : undefined,
    airingStatus: attr.status === "finished"
      ? "Completed"
      : attr.status === "current"
      ? "Ongoing"
      : attr.status === "upcoming" || attr.status === "unapproved"
      ? "Upcoming"
      : undefined,
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
      const res = await fetch(url, { headers: { Accept: "application/vnd.api+json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" } });
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
      const res = await fetch(url, { headers: { Accept: "application/vnd.api+json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" } });
      if (!res.ok) return [];
      const json: any = await res.json();
      return (json.data || [])
        .filter((d: any) => !isHentaiOrAdult(d) && isReleasedKitsu(d))
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
      const res = await fetch(url, { headers: { Accept: "application/vnd.api+json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" } });
      if (!res.ok) return [];
      const json: any = await res.json();
      return (json.data || [])
        .filter((d: any) => !isHentaiOrAdult(d) && isReleasedKitsu(d))
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

  let releaseDate: string | undefined;
  if (item.startDate?.year) {
    const y = String(item.startDate.year).padStart(4, "0");
    const m = item.startDate.month ? String(item.startDate.month).padStart(2, "0") : "01";
    const d = item.startDate.day ? String(item.startDate.day).padStart(2, "0") : "01";
    releaseDate = `${y}-${m}-${d}`;
  }

  const media: UnifiedMedia = {
    id: `anilist-${item.id}`,
    slug: slugify(title),
    title,
    originalTitle: item.title?.native,
    type: "Anime",
    year,
    releaseDate,
    rating: toFiveStarRating(rawScore),
    genre: item.genres?.[0] || "Anime",
    genres: item.genres?.length > 0 ? item.genres : ["Anime", "Action"],
    poster: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || "https://image.tmdb.org/t/p/w500/dqzenchTd7lp5zht7BdlqM7RBhD.jpg",
    backdrop: item.bannerImage || undefined,
    overview: (item.description || "No description provided.").replace(/<[^>]*>/g, ""),
    runtime: item.episodes ? `${item.episodes} Episodes` : undefined,
    airingStatus: item.status === "FINISHED" || item.status === "CANCELLED"
      ? "Completed"
      : item.status === "RELEASING" || item.status === "HIATUS"
      ? "Ongoing"
      : item.status === "NOT_YET_RELEASED"
      ? "Upcoming"
      : undefined,
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
  const releaseDate = item.aired?.from ? String(item.aired.from).slice(0, 10) : undefined;

  return {
    id: `anilist-mal-${item.mal_id}`,
    slug: slugify(title),
    title,
    originalTitle: item.title_japanese,
    type: "Anime",
    year,
    releaseDate,
    rating: toFiveStarRating(rawScore),
    genre: genres[0] || "Anime",
    genres: genres.length > 0 ? genres : ["Anime", "Action"],
    poster: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || "https://image.tmdb.org/t/p/w500/dqzenchTd7lp5zht7BdlqM7RBhD.jpg",
    backdrop: undefined,
    overview: (item.synopsis || "No description provided.").replace(/\[Written by MAL Rewrite\]/g, "").trim(),
    runtime: item.episodes ? `${item.episodes} Episodes` : undefined,
    airingStatus: typeof item.status === "string" && item.status.toLowerCase().includes("finish")
      ? "Completed"
      : typeof item.status === "string" && item.status.toLowerCase().includes("not yet")
      ? "Upcoming"
      : "Ongoing",
    studio: item.studios?.[0]?.name,
    source: "anilist",
    sourceId: String(item.mal_id),
  };
}

let anilistDownUntil = 0;

function getCurrentAnimeSeason(): { season: "WINTER" | "SPRING" | "SUMMER" | "FALL"; seasonYear: number } {
  const now = new Date();
  const month = now.getMonth() + 1; // 1..12
  const seasonYear = now.getFullYear();
  if (month <= 3) return { season: "WINTER", seasonYear };
  if (month <= 6) return { season: "SPRING", seasonYear };
  if (month <= 9) return { season: "SUMMER", seasonYear };
  return { season: "FALL", seasonYear };
}

function dedupeAnime(items: UnifiedMedia[]): UnifiedMedia[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  return items.filter((item) => {
    if (!item || !item.id || !item.title) return false;
    const normTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    if (seenIds.has(item.id) || (normTitle && seenTitles.has(normTitle))) return false;
    seenIds.add(item.id);
    if (normTitle) seenTitles.add(normTitle);
    return true;
  });
}

async function runGraphQLQuery(query: string, variables: any = {}) {
  if (Date.now() < anilistDownUntil) {
    throw new Error("AniList API is temporarily disabled upstream");
  }
  const cacheKey = `anilist:${JSON.stringify({ query, variables })}`;
  return fetchWithCache(
    cacheKey,
    1000 * 60 * 30,
    async () => {
      let lastErr: any;
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3200);
        try {
          const res = await fetch(ANILIST_GRAPHQL_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            },
            body: JSON.stringify({ query, variables }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.status === 429) {
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
          if (res.status === 403) {
            anilistDownUntil = Date.now() + 1000 * 60 * 5;
            throw new Error(`AniList returned status 403 (disabled upstream)`);
          }
          if (!res.ok) throw new Error(`AniList returned status ${res.status}`);
          const json: any = await res.json();
          if (json.errors && json.errors.length > 0 && !json.data) {
            throw new Error(`AniList GraphQL error: ${json.errors[0].message}`);
          }
          return json.data;
        } catch (err: any) {
          clearTimeout(timeoutId);
          lastErr = err;
          if (err?.message?.includes("403") || err?.message?.includes("disabled")) {
            break;
          }
          if (attempt === 0) await new Promise((r) => setTimeout(r, 250));
        }
      }
      throw lastErr;
    }
  );
}

// Live Jikan Seasonal Fallback (SFW enforced, timeout-guarded)
async function fetchJikanSeasonal(page: number = 1): Promise<UnifiedMedia[]> {
  const cacheKey = `jikan:seasonal:${page}`;
  return fetchWithCache(cacheKey, 1000 * 60 * 30, async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const url = `${JIKAN_BASE_URL}/seasons/now?page=${page}&limit=20&sfw=true`;
      const res = await fetch(url, { headers: { "User-Agent": "NerdVault/2.0" }, signal: controller.signal });
      if (!res.ok) return [];
      const data: any = await res.json();
      const today = new Date().toISOString().slice(0, 10);
      return dedupeAnime(
        (data.data || [])
          .filter((item: any) => {
            if (isAdultContent(item)) return false;
            if (item.status === "Not yet aired") return false;
            if (item.aired?.from && String(item.aired.from).slice(0, 10) > today) return false;
            return true;
          })
          .map(formatJikan)
      );
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  });
}

// Live Jikan Top Fallback (SFW enforced, timeout-guarded)
async function fetchJikanTop(page: number = 1): Promise<UnifiedMedia[]> {
  const cacheKey = `jikan:top:${page}`;
  return fetchWithCache(cacheKey, 1000 * 60 * 30, async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const url = `${JIKAN_BASE_URL}/top/anime?page=${page}&limit=20&filter=bypopularity&sfw=true`;
      const res = await fetch(url, { headers: { "User-Agent": "NerdVault/2.0" }, signal: controller.signal });
      if (!res.ok) return [];
      const data: any = await res.json();
      const today = new Date().toISOString().slice(0, 10);
      return dedupeAnime(
        (data.data || [])
          .filter((item: any) => {
            if (isAdultContent(item)) return false;
            if (item.status === "Not yet aired") return false;
            if (item.aired?.from && String(item.aired.from).slice(0, 10) > today) return false;
            return true;
          })
          .map(formatJikan)
      );
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  });
}

// Live TMDB Animation Fallback (strictly recent + English titles only)
async function fetchTmdbAnimation(page: number = 1): Promise<UnifiedMedia[]> {
  const cacheKey = `tmdb:anime:recent:${page}`;
  return fetchWithCache(cacheKey, 1000 * 60 * 30, async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3200);
    try {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const twoYearsAgo = `${now.getFullYear() - 2}-01-01`;
      const url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=en-US&with_genres=16&with_original_language=ja&sort_by=popularity.desc&include_adult=false&first_air_date.gte=${twoYearsAgo}&first_air_date.lte=${today}&page=${page}`;
      const res = await fetch(url, { headers: { "User-Agent": "NerdVault/2.0" }, signal: controller.signal });
      if (!res.ok) return [];
      const data: any = await res.json();
      return dedupeAnime(
        (data.results || [])
          .filter((m: any) => {
            const date = m.first_air_date || "";
            return date && date.slice(0, 10) <= today && m.poster_path;
          })
          .map((m: any) => ({
            id: `tmdb-anime-${m.id}`,
            slug: slugify(m.name || m.original_name || `anime-${m.id}`),
            title: m.name || m.original_name || "Anime",
            originalTitle: m.original_name,
            type: "Anime" as const,
            year: (m.first_air_date || "").slice(0, 4) || String(now.getFullYear()),
            releaseDate: m.first_air_date || undefined,
            rating: toFiveStarRating(m.vote_average || 8.0),
            genre: "Anime",
            genres: ["Anime", "Action", "Fantasy"],
            poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "https://image.tmdb.org/t/p/w500/dqzenchTd7lp5zht7BdlqM7RBhD.jpg",
            backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : undefined,
            overview: m.overview || "Popular Japanese anime series.",
            source: "tmdb" as const,
            sourceId: String(m.id),
          }))
      );
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  });
}

export const anilistService = {
  async getSeasonalAnime(page: number = 1, genre?: string): Promise<UnifiedMedia[]> {
    const { season, seasonYear } = getCurrentAnimeSeason();
    const cleanGenre = genre && genre !== "All genres" ? genre : undefined;
    const seasonalQuery = `
      query ($page: Int, $season: MediaSeason, $seasonYear: Int, $genre: String) {
        Page(page: $page, perPage: 24) {
          media(
            type: ANIME,
            isAdult: false,
            season: $season,
            seasonYear: $seasonYear,
            genre: $genre,
            format_in: [TV, TV_SHORT, ONA, MOVIE],
            status_in: [RELEASING, FINISHED],
            sort: [TRENDING_DESC, POPULARITY_DESC]
          ) {
            id
            isAdult
            status
            title { romaji english native }
            seasonYear
            startDate { year month day }
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
      const data = await runGraphQLQuery(seasonalQuery, { page, season, seasonYear, genre: cleanGenre }).catch(() => null);
      const seasonalItems = dedupeAnime(
        (data?.Page?.media || [])
          .filter((item: any) => !isAdultContent(item) && isReleasedAniList(item))
          .map((m: any) => ({ ...formatAniList(m), curation: "Trending" as const }))
      );

      const cleanSeasonal = seasonalItems.filter((i) => !isEcchi(i));
      if (cleanSeasonal.length >= 12) {
        return cleanSeasonal.slice(0, 24);
      }

      // Supplement with currently airing trending anime from recent 12 months if current season just started
      const trending = await this.getTrendingAnime(page, cleanGenre);
      const minYear = seasonYear - 1;
      const recentTrending = trending.filter((a) => !isEcchi(a) && Number(a.year) >= minYear);
      const combined = dedupeAnime([...cleanSeasonal, ...recentTrending]);
      if (combined.length > 0) return combined.slice(0, 24);
    } catch (err) {
      console.warn("AniList seasonal query failed:", err);
    }

    const jikanSeasonal = await fetchJikanSeasonal(page);
    if (jikanSeasonal.length > 0) return jikanSeasonal.map((j) => ({ ...j, curation: "Trending" as const }));

    const kitsuFallback = await fetchKitsuTrending();
    if (kitsuFallback.length > 0) return kitsuFallback.map((k) => ({ ...k, curation: "Trending" as const }));

    return (await fetchTmdbAnimation(page)).map((t) => ({ ...t, curation: "Trending" as const }));
  },

  async getWeeklyAnime(weekStart: string, today: string): Promise<UnifiedMedia[]> {
    const startInt = Number(weekStart.replace(/-/g, ""));
    const endInt = Number(today.replace(/-/g, ""));
    const query = `
      query ($startInt: FuzzyDateInt, $endInt: FuzzyDateInt) {
        Page(page: 1, perPage: 16) {
          media(
            type: ANIME,
            isAdult: false,
            format_in: [TV, TV_SHORT, ONA, MOVIE],
            status_in: [RELEASING, FINISHED],
            startDate_greater: $startInt,
            startDate_lesser: $endInt,
            sort: [POPULARITY_DESC, TRENDING_DESC]
          ) {
            id
            isAdult
            status
            title { romaji english native }
            seasonYear
            startDate { year month day }
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
      // AniList startDate_greater / startDate_lesser are exclusive, so pad by 1 day on each side and filter strictly in JS
      const startDateObj = new Date(`${weekStart}T00:00:00Z`);
      startDateObj.setUTCDate(startDateObj.getUTCDate() - 1);
      const endDateObj = new Date(`${today}T00:00:00Z`);
      endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);
      const padStart = Number(startDateObj.toISOString().slice(0, 10).replace(/-/g, ""));
      const padEnd = Number(endDateObj.toISOString().slice(0, 10).replace(/-/g, ""));

      const data = await runGraphQLQuery(query, { startInt: padStart || startInt, endInt: padEnd || endInt }).catch(() => null);
      return dedupeAnime(
        (data?.Page?.media || [])
          .filter((item: any) => !isAdultContent(item) && isReleasedAniList(item))
          .map((m: any) => ({ ...formatAniList(m), curation: "Trending" as const }))
          .filter((item: UnifiedMedia) => {
            if (isEcchi(item)) return false;
            return Boolean(item.releaseDate && item.releaseDate >= weekStart && item.releaseDate <= today);
          })
      );
    } catch {
      return [];
    }
  },

  async getTrendingAnime(page: number = 1, genre?: string): Promise<UnifiedMedia[]> {
    const cleanGenre = genre && genre !== "All genres" ? genre : undefined;
    const query = `
      query ($page: Int, $genre: String) {
        Page(page: $page, perPage: 24) {
          media(
            type: ANIME,
            isAdult: false,
            genre: $genre,
            format_in: [TV, TV_SHORT, ONA, MOVIE],
            status_in: [RELEASING, FINISHED],
            popularity_greater: 1000,
            sort: [TRENDING_DESC, POPULARITY_DESC]
          ) {
            id
            isAdult
            status
            title { romaji english native }
            seasonYear
            startDate { year month day }
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
      const data = await runGraphQLQuery(query, { page, genre: cleanGenre }).catch(() => null);
      const anilistItems = dedupeAnime(
        (data?.Page?.media || [])
          .filter((item: any) => !isAdultContent(item) && isReleasedAniList(item))
          .map((m: any) => ({ ...formatAniList(m), curation: "Trending" as const }))
      );

      if (anilistItems.length > 0) {
        const nonEcchi = anilistItems.filter((i) => !isEcchi(i));
        const ecchi = anilistItems.filter((i) => isEcchi(i));
        return [...nonEcchi, ...ecchi].slice(0, 24);
      }
    } catch (err) {
      console.warn("AniList trending live query failed, trying fallbacks:", err);
    }

    const kitsuFallback = await fetchKitsuTrending();
    if (kitsuFallback.length > 0) return kitsuFallback.map((k) => ({ ...k, curation: "Trending" as const }));

    const jikanFallback = await fetchJikanSeasonal(page);
    if (jikanFallback.length > 0) return jikanFallback.map((j) => ({ ...j, curation: "Trending" as const }));

    const tmdbFallback = await fetchTmdbAnimation(page);
    return tmdbFallback.map((t) => ({ ...t, curation: "Trending" as const }));
  },

  async getPopularAnime(genre?: string, page: number = 1): Promise<UnifiedMedia[]> {
    const query = `
      query ($genre: String, $page: Int) {
        Page(page: $page, perPage: 24) {
          media(
            type: ANIME,
            isAdult: false,
            format_in: [TV, ONA, MOVIE],
            status_in: [FINISHED, RELEASING],
            sort: [SCORE_DESC, POPULARITY_DESC],
            genre: $genre
          ) {
            id
            isAdult
            status
            title { romaji english native }
            seasonYear
            startDate { year month day }
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
      const anilistItems = dedupeAnime(
        (data?.Page?.media || [])
          .filter((item: any) => !isAdultContent(item) && isReleasedAniList(item))
          .map((m: any) => ({ ...formatAniList(m), curation: "Popular" as const }))
      );

      if (anilistItems.length > 0) {
        const nonEcchi = anilistItems.filter((i) => !isEcchi(i));
        const ecchi = anilistItems.filter((i) => isEcchi(i));
        return [...nonEcchi, ...ecchi].slice(0, 24);
      }
    } catch (err) {
      console.warn("AniList popular live query failed, trying fallbacks:", err);
    }

    const jikan = await fetchJikanTop(page);
    if (jikan.length > 0) return jikan.map((j) => ({ ...j, curation: "Popular" as const }));

    const tmdbFallback = await fetchTmdbAnimation(page);
    return tmdbFallback.map((t) => ({ ...t, curation: "Popular" as const }));
  },

  async getNicheAnime(genre?: string, page: number = 1): Promise<UnifiedMedia[]> {
    const query = `
      query ($genre: String, $page: Int) {
        Page(page: $page, perPage: 24) {
          media(type: ANIME, isAdult: false, status_in: [FINISHED, RELEASING], sort: [SCORE_DESC], popularity_greater: 8000, popularity_lesser: 95000, genre: $genre) {
            id
            isAdult
            status
            title { romaji english native }
            seasonYear
            startDate { year month day }
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
        .filter((item: any) => !isAdultContent(item) && isReleasedAniList(item))
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
          media(type: ANIME, isAdult: false, status_in: [FINISHED, RELEASING], search: $search, sort: SEARCH_MATCH) {
            id
            isAdult
            status
            title { romaji english native }
            seasonYear
            startDate { year month day }
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
        .filter((item: any) => !isAdultContent(item) && isReleasedAniList(item))
        .map(formatAniList);
      if (items.length > 0) return items;
    } catch (err) {
      console.warn("AniList search live query failed, trying live Kitsu search:", err);
    }

    const fetchTmdbAnime = async (): Promise<UnifiedMedia[]> => {
      try {
        const tmdbAnimeUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(search)}&include_adult=false`;
        const res = await fetch(tmdbAnimeUrl);
        if (!res.ok) return [];
        const d: any = await res.json();
        const today = new Date().toISOString().slice(0, 10);
        return (d.results || [])
          .filter((item: any) => {
            const isJp = item.original_language === "ja" || (Array.isArray(item.origin_country) && item.origin_country.includes("JP"));
            const isAnim = Array.isArray(item.genre_ids) && item.genre_ids.includes(16);
            if (!((isJp || isAnim) && !isAdultContent(item))) return false;
            const release = item.first_air_date || item.release_date;
            if (release && release.slice(0, 10) > today) return false;
            return true;
          })
          .map((item: any) => {
            const release = item.first_air_date || item.release_date;
            return {
              id: `tmdb-anime-${item.id}`,
              slug: slugify(item.name || item.title || "Anime"),
              title: item.name || item.title || "Anime",
              originalTitle: item.original_name || item.original_title,
              type: "Anime" as const,
              year: (release || "2024").slice(0, 4),
              releaseDate: release || undefined,
              rating: toFiveStarRating(item.vote_average ? item.vote_average / 2 : 4.0),
              genre: "Anime",
              genres: ["Anime", "Animation"],
              poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "https://image.tmdb.org/t/p/w500/dqzenchTd7lp5zht7BdlqM7RBhD.jpg",
              backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : undefined,
              overview: item.overview || "No description provided.",
              source: "anilist" as const,
              sourceId: String(item.id),
            };
          });
      } catch {
        return [];
      }
    };

    const [kitsuSearch, tmdbAnime] = await Promise.all([
      fetchKitsuSearch(search).catch(() => []),
      fetchTmdbAnime().catch(() => []),
    ]);

    if (kitsuSearch.length > 0) return kitsuSearch;
    if (tmdbAnime.length > 0) return tmdbAnime;

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
          status
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
                status
                title { romaji english native }
                type
                format
                seasonYear
                startDate { year month day }
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
                status
                title { romaji english native }
                type
                seasonYear
                startDate { year month day }
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
          .filter((e: any) => e?.node && e.node.type === "ANIME" && !isAdultContent(e.node) && isReleasedAniList(e.node) && franchiseTypes.includes(e.relationType))
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
          .filter((r: any) => r && r.id && r.id !== item.id && !isAdultContent(r) && isReleasedAniList(r))
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
            isAdult
            status
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
