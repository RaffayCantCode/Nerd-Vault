import { NextRequest, NextResponse } from "next/server";
import { getTmdbMediaDetails } from "@/lib/sources/tmdb";
import { getAllJikanAnimeEpisodes } from "@/lib/sources/jikan";

const EPISODE_CACHE_TTL_MS = 1000 * 60 * 30;

type EpisodeData = {
  episodeNumber: number;
  title: string;
  overview: string | null;
  thumbnail: string | null;
  rating: number | null;
  airDate: string | null;
  runtime: number | null;
  isFiller: boolean;
};

type TmdbSeasonResponse = {
  id: number;
  name: string;
  overview: string;
  episodes: Array<{
    id: number;
    episode_number: number;
    name: string;
    overview: string;
    still_path: string | null;
    vote_average: number;
    air_date: string | null;
    runtime: number | null;
  }>;
};

const episodeCache = new Map<string, { expiresAt: number; data: EpisodeData[] }>();

function getCached(key: string): EpisodeData[] | null {
  const entry = episodeCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data;
  }
  return null;
}

function setCached(key: string, data: EpisodeData[]) {
  episodeCache.set(key, { expiresAt: Date.now() + EPISODE_CACHE_TTL_MS, data });
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w300";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function fetchEpisodesFromTmdbBySearch(title: string, season: number): Promise<EpisodeData[] | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || !title) return null;

  try {
    const searchUrl = `${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(title)}&language=en-US`;
    const searchRes = await fetch(searchUrl, { next: { revalidate: 86400 } });
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const results = searchData.results || [];
    if (results.length === 0) return null;

    const tvId = results[0].id;
    if (!tvId) return null;

    const episodes = await fetchTmdbSeasonEpisodes(String(tvId), season).catch(() => null);
    if (episodes && episodes.length > 0 && episodes.some(ep => ep.thumbnail)) {
      return episodes;
    }
    return null;
  } catch (err) {
    console.error(`[tv-seasons] TMDB title search fallback failed for "${title}":`, err);
    return null;
  }
}

async function fetchTmdbSeasonEpisodes(sourceId: string, season: number): Promise<EpisodeData[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is not configured.");
  }

  const response = await fetch(
    `${TMDB_BASE_URL}/tv/${sourceId}/season/${season}?language=en-US&api_key=${apiKey}`,
    { next: { revalidate: 1800 } },
  );

  if (!response.ok) {
    throw new Error(`TMDB season fetch failed: ${response.status}`);
  }

  const data = (await response.json()) as TmdbSeasonResponse;

  return (data.episodes ?? []).map((ep) => ({
    episodeNumber: ep.episode_number,
    title: ep.name || `Episode ${ep.episode_number}`,
    overview: ep.overview || null,
    thumbnail: ep.still_path ? `${TMDB_IMAGE_BASE}${ep.still_path}` : null,
    rating: ep.vote_average > 0 ? Number(ep.vote_average.toFixed(1)) : null,
    airDate: ep.air_date ?? null,
    runtime: ep.runtime ?? null,
    isFiller: false,
  }));
}

async function fetchKitsuEpisodeThumbnails(malId: number): Promise<Map<number, string>> {
  const thumbnails = new Map<number, string>();
  try {
    const mappingUrl = `https://kitsu.io/api/edge/mappings?filter%5BexternalSite%5D=myanimelist/anime&filter%5BexternalId%5D=${malId}&include=item`;
    const mappingRes = await fetch(mappingUrl, {
      headers: {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      next: { revalidate: 86400 }
    });

    if (!mappingRes.ok) return thumbnails;
    const mappingData = await mappingRes.json();
    const animeId = mappingData.data?.[0]?.relationships?.item?.data?.id;
    if (!animeId) return thumbnails;

    // Kitsu has a strict maximum page limit of 20.
    // Fetch 5 pages concurrently to cover up to 100 episodes.
    const pageOffsets = [0, 20, 40, 60, 80];
    const pagesData = await Promise.all(
      pageOffsets.map((offset) =>
        fetch(`https://kitsu.io/api/edge/anime/${animeId}/episodes?page%5Blimit%5D=20&page%5Boffset%5D=${offset}`, {
          headers: {
            "Accept": "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
          },
          next: { revalidate: 1800 }
        })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
      )
    );

    for (const data of pagesData) {
      if (!data) continue;
      const episodes = data.data || [];
      for (const ep of episodes) {
        const epNum = ep.attributes?.number;
        const thumbUrl = ep.attributes?.thumbnail?.original || ep.attributes?.thumbnail?.medium;
        if (epNum && thumbUrl) {
          thumbnails.set(Number(epNum), thumbUrl);
        }
      }
    }
  } catch (err) {
    console.error("[tv-seasons] Failed to fetch Kitsu episode thumbnails:", err);
  }
  return thumbnails;
}

async function fetchAnilistEpisodes(
  malId: number,
  streamingEpisodes: Array<{ title: string | null; thumbnail: string | null }>,
): Promise<EpisodeData[]> {
  // Fetch Jikan (MAL) episode list for titles and air dates
  const jikanEpisodes = await getAllJikanAnimeEpisodes(malId).catch(() => []);

  // Fetch Kitsu thumbnails
  const kitsuThumbnails = await fetchKitsuEpisodeThumbnails(malId);

  // Build a thumbnail lookup from AniList streaming episodes by episode index
  // AniList streamingEpisodes are ordered but don't always have episode numbers,
  // so we match by index position.
  const thumbnailByIndex = new Map<number, string | null>();
  streamingEpisodes.forEach((ep, index) => {
    thumbnailByIndex.set(index, ep.thumbnail ?? null);
  });

  if (!jikanEpisodes.length) {
    // Fallback: if Jikan has no data, use AniList streaming episodes directly
    return streamingEpisodes.map((ep, index) => ({
      episodeNumber: index + 1,
      title: ep.title || `Episode ${index + 1}`,
      overview: null,
      thumbnail: kitsuThumbnails.get(index + 1) || ep.thumbnail || null,
      rating: null,
      airDate: null,
      runtime: null,
      isFiller: false,
    }));
  }

  return jikanEpisodes.map((ep, index) => ({
    episodeNumber: ep.mal_id || index + 1,
    title: ep.title || `Episode ${ep.mal_id || index + 1}`,
    overview: null,
    thumbnail: kitsuThumbnails.get(ep.mal_id) || thumbnailByIndex.get(index) || null,
    rating: ep.score && ep.score > 0 ? Number((ep.score * 2).toFixed(1)) : null,
    airDate: ep.aired ? ep.aired.slice(0, 10) : null,
    runtime: null,
    isFiller: ep.filler ?? false,
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") ?? "tmdb";
  const sourceId = searchParams.get("sourceId") ?? "";
  const season = Math.max(1, Number(searchParams.get("season") ?? "1"));
  const malId = Number(searchParams.get("malId") ?? "0");

  // Parse streaming episodes passed as JSON from AniList data
  let streamingEpisodes: Array<{ title: string | null; thumbnail: string | null }> = [];
  try {
    const raw = searchParams.get("streamingEpisodes");
    if (raw) {
      streamingEpisodes = JSON.parse(decodeURIComponent(raw));
    }
  } catch {
    streamingEpisodes = [];
  }

  if (!sourceId) {
    return NextResponse.json({ error: "Missing sourceId" }, { status: 400 });
  }

  const cacheKey = `${source}:${sourceId}:${season}:${malId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ episodes: cached });
  }

  try {
    let episodes: EpisodeData[];

    if (source === "tmdb") {
      episodes = await fetchTmdbSeasonEpisodes(sourceId, season);
    } else if (source === "anilist") {
      const title = searchParams.get("title") ?? "";
      let tmdbSearchEpisodes: EpisodeData[] | null = null;
      if (title) {
        tmdbSearchEpisodes = await fetchEpisodesFromTmdbBySearch(title, season);
      }

      if (tmdbSearchEpisodes) {
        episodes = tmdbSearchEpisodes;
      } else if (malId > 0) {
        episodes = await fetchAnilistEpisodes(malId, streamingEpisodes);
      } else if (streamingEpisodes.length > 0) {
        // AniList source with no MAL ID — fall back to streaming episodes
        episodes = streamingEpisodes.map((ep, index) => ({
          episodeNumber: index + 1,
          title: ep.title || `Episode ${index + 1}`,
          overview: null,
          thumbnail: ep.thumbnail ?? null,
          rating: null,
          airDate: null,
          runtime: null,
          isFiller: false,
        }));
      } else {
        episodes = [];
      }
    } else {
      episodes = [];
    }

    setCached(cacheKey, episodes);
    return NextResponse.json({ episodes });
  } catch (error) {
    console.error("[tv-seasons] Failed to fetch episode data:", error);
    return NextResponse.json(
      { error: "Could not load episode data right now.", episodes: [] },
      { status: 500 },
    );
  }
}
