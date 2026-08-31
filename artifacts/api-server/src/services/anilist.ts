import { fetchWithCache } from "./cache";
import { UnifiedMedia, slugify, toFiveStarRating } from "./types";

const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";

function formatAnime(item: any): UnifiedMedia {
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
    poster: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || "https://image.tmdb.org/t/p/w500/8c4g0XnYH1iO4s8qQ7qX8V4u7R8.jpg",
    backdrop: item.bannerImage || undefined,
    overview: (item.description || "No description provided.").replace(/<[^>]*>/g, ""),
    runtime: item.episodes ? `${item.episodes} Episodes` : undefined,
    studio: item.studios?.nodes?.[0]?.name,
    source: "anilist",
    sourceId: String(item.id),
  };
}

async function runGraphQLQuery(query: string, variables: any = {}) {
  const cacheKey = `anilist:${JSON.stringify({ query, variables })}`;
  return fetchWithCache(
    cacheKey,
    1000 * 60 * 30,
    async () => {
      const res = await fetch(ANILIST_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query, variables }),
      });
      if (!res.ok) throw new Error(`AniList returned ${res.status}`);
      const json: any = await res.json();
      return json.data;
    }
  );
}

export const anilistService = {
  async getTrendingAnime(page: number = 1): Promise<UnifiedMedia[]> {
    const query = `
      query ($page: Int) {
        Page(page: $page, perPage: 18) {
          media(type: ANIME, sort: TRENDING_DESC) {
            id
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
    const data = await runGraphQLQuery(query, { page });
    return (data?.Page?.media || []).map(formatAnime);
  },

  async getPopularAnime(genre?: string, page: number = 1): Promise<UnifiedMedia[]> {
    const query = `
      query ($genre: String, $page: Int) {
        Page(page: $page, perPage: 18) {
          media(type: ANIME, sort: POPULARITY_DESC, genre: $genre) {
            id
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
    const data = await runGraphQLQuery(query, { genre: genre || undefined, page });
    return (data?.Page?.media || []).map(formatAnime);
  },

  async search(search: string): Promise<UnifiedMedia[]> {
    if (!search.trim()) return [];
    const query = `
      query ($search: String) {
        Page(page: 1, perPage: 15) {
          media(type: ANIME, search: $search, sort: SEARCH_MATCH) {
            id
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
    const data = await runGraphQLQuery(query, { search });
    return (data?.Page?.media || []).map(formatAnime);
  },

  async getDetails(id: string): Promise<UnifiedMedia | null> {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
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
          relations {
            edges {
              relationType
              node {
                id
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
      const data = await runGraphQLQuery(query, { id: Number(id) });
      const item = data?.Media;
      if (!item) return null;

      const media = formatAnime(item);

      const relationEdges = item.relations?.edges || [];
      const franchiseTypes = ["PREQUEL", "SEQUEL", "PARENT", "SIDE_STORY", "SPIN_OFF", "ALTERNATIVE"];
      const franchiseNodes = relationEdges
        .filter((e: any) => e.node?.type === "ANIME" && franchiseTypes.includes(e.relationType))
        .map((e: any) => formatAnime(e.node));

      if (franchiseNodes.length > 0) {
        const allFranchise = [media, ...franchiseNodes].sort((a, b) => Number(a.year) - Number(b.year));
        media.franchise = {
          name: `${media.title} Universe`,
          items: allFranchise,
        };
      }

      const recNodes = (item.recommendations?.nodes || [])
        .map((n: any) => n.mediaRecommendation)
        .filter((r: any) => r && r.id !== item.id)
        .map(formatAnime);

      media.similar = recNodes;
      return media;
    } catch {
      return null;
    }
  },
};
