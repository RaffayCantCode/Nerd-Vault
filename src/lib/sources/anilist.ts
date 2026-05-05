import { rankCandidatesForQuery } from "@/lib/search-utils";
import { extractFranchiseRoot, getAnimeSeriesContext, isAnimeMovie, isSameFranchise, matchesFranchise, normalizeAnimeBaseTitle } from "@/lib/franchise-utils";
import { enrichAnimeImagesFromTmdb, TmdbAnimeImageEnrichment } from "@/lib/sources/tmdb";
import { MediaItem } from "@/lib/types";

const ANILIST_API_URL = "https://graphql.anilist.co";
const ANILIST_CACHE_TTL_MS = 1000 * 60 * 30;
const anilistResponseCache = new Map<string, { expiresAt: number; payload: unknown }>();

type AniListBrowseParams = {
  page?: number;
  query?: string;
  genre?: string;
  sort?: "discovery" | "newest" | "rating" | "title";
  seed?: number;
  pageSize?: number;
};

type AniListTitle = {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
};

type AniListCoverImage = {
  extraLarge?: string | null;
  large?: string | null;
  medium?: string | null;
};

type AniListDate = {
  year?: number | null;
  month?: number | null;
  day?: number | null;
};

type AniListTrailer = {
  id?: string | null;
  site?: string | null;
  thumbnail?: string | null;
};

type AniListCharacterEdge = {
  role?: string | null;
  node?: {
    name?: {
      full?: string | null;
      native?: string | null;
    } | null;
    image?: {
      large?: string | null;
    } | null;
  } | null;
  voiceActors?: Array<{
    name?: {
      full?: string | null;
    } | null;
  }>;
};

type AniListRelationEdge = {
  relationType?: string | null;
  node?: AniListMedia | null;
};

type AniListMedia = {
  id: number;
  idMal?: number | null;
  title?: AniListTitle | null;
  synonyms?: string[] | null;
  description?: string | null;
  averageScore?: number | null;
  meanScore?: number | null;
  seasonYear?: number | null;
  episodes?: number | null;
  duration?: number | null;
  format?: string | null;
  status?: string | null;
  bannerImage?: string | null;
  coverImage?: AniListCoverImage | null;
  genres?: string[] | null;
  tags?: Array<{ name?: string | null; rank?: number | null }> | null;
  trailer?: AniListTrailer | null;
  studios?: {
    edges?: Array<{
      isMain?: boolean | null;
      node?: {
        name?: string | null;
      } | null;
    }> | null;
  } | null;
  characters?: {
    edges?: AniListCharacterEdge[] | null;
  } | null;
  relations?: {
    edges?: AniListRelationEdge[] | null;
  } | null;
  startDate?: AniListDate | null;
  endDate?: AniListDate | null;
  siteUrl?: string | null;
  streamingEpisodes?: Array<{
    title?: string | null;
    thumbnail?: string | null;
    url?: string | null;
    site?: string | null;
  }> | null;
  externalLinks?: Array<{
    site?: string | null;
    url?: string | null;
    type?: string | null;
  }> | null;
  nextAiringEpisode?: {
    episode?: number | null;
    airingAt?: number | null;
  } | null;
};

type AniListPageInfo = {
  total?: number | null;
  currentPage?: number | null;
  lastPage?: number | null;
  hasNextPage?: boolean | null;
  perPage?: number | null;
};

type AniListPageResponse = {
  Page: {
    pageInfo: AniListPageInfo;
    media: AniListMedia[];
  };
};

type AniListMediaResponse = {
  Media: AniListMedia | null;
};

export type AnimeFranchiseEntry = {
  id: number;
  title: string;
  year: number;
  rating: number;
  status?: string;
  episodes?: number;
  type?: string;
  seasonKey?: string;
  releaseDate?: string;
};

const ANILIST_BROWSE_MEDIA_FRAGMENT = `
  id
  idMal
  title { romaji english native }
  synonyms
  description(asHtml: false)
  averageScore
  meanScore
  seasonYear
  episodes
  duration
  format
  status
  bannerImage
  coverImage { extraLarge large medium }
  genres
  tags { name rank }
  trailer { id site thumbnail }
  studios {
    edges {
      isMain
      node { name }
    }
  }
  startDate { year month day }
  siteUrl
  streamingEpisodes { title thumbnail url site }
  externalLinks { site url type }
`;

const ANILIST_DETAIL_MEDIA_FRAGMENT = `
  ${ANILIST_BROWSE_MEDIA_FRAGMENT}
  nextAiringEpisode { episode airingAt }
  characters(page: 1, perPage: 10, sort: [ROLE, RELEVANCE, ID]) {
    edges {
      role
      node {
        name { full native }
        image { large }
      }
      voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
        name { full }
      }
    }
  }
  relations {
    edges {
      relationType(version: 2)
      node {
        ${ANILIST_BROWSE_MEDIA_FRAGMENT}
      }
    }
  }
`;

const BROWSE_ANIME_QUERY = `
  query BrowseAnime($page: Int, $perPage: Int, $search: String, $genreIn: [String], $sort: [MediaSort!]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(
        type: ANIME
        isAdult: false
        format_not_in: [MUSIC]
        search: $search
        genre_in: $genreIn
        sort: $sort
      ) {
        ${ANILIST_BROWSE_MEDIA_FRAGMENT}
      }
    }
  }
`;

const DETAIL_ANIME_QUERY = `
  query AnimeDetails($id: Int, $idMal: Int) {
    Media(id: $id, idMal: $idMal, type: ANIME) {
      ${ANILIST_DETAIL_MEDIA_FRAGMENT}
    }
  }
`;

function buildCacheKey(query: string, variables: Record<string, unknown>) {
  return JSON.stringify({ query, variables });
}

async function anilistFetch<T>(query: string, variables: Record<string, unknown>) {
  const cacheKey = buildCacheKey(query, variables);
  const cached = anilistResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload as T;
  }

  const response = await fetch(ANILIST_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 },
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        data?: T;
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (!response.ok || !payload?.data) {
    const baseMessage =
      payload?.errors?.map((entry) => entry.message).filter(Boolean).join("; ") ||
      `AniList request failed with ${response.status}`;
    throw new Error(baseMessage);
  }

  anilistResponseCache.set(cacheKey, {
    expiresAt: Date.now() + ANILIST_CACHE_TTL_MS,
    payload: payload.data,
  });

  return payload.data;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function cleanWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function stripDescription(input?: string | null) {
  return cleanWhitespace(
    (input ?? "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/~!|!~/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&"),
  );
}

function getDisplayTitle(item: AniListMedia) {
  return item.title?.english || item.title?.romaji || item.title?.native || "Untitled";
}

function getOriginalTitle(item: AniListMedia) {
  return item.title?.native || item.title?.romaji || item.title?.english || getDisplayTitle(item);
}

function animeTitleVariants(item: AniListMedia) {
  return Array.from(
    new Set(
      [
        getDisplayTitle(item),
        item.title?.romaji ?? "",
        item.title?.english ?? "",
        item.title?.native ?? "",
        ...(item.synonyms ?? []),
      ]
        .map((title) => cleanWhitespace(title))
        .filter(Boolean),
    ),
  );
}

function getAnimeYear(item: AniListMedia) {
  return item.seasonYear ?? item.startDate?.year ?? item.endDate?.year ?? 0;
}

function buildDateString(date?: AniListDate | null) {
  if (!date?.year) {
    return undefined;
  }

  const month = date.month ? String(date.month).padStart(2, "0") : "01";
  const day = date.day ? String(date.day).padStart(2, "0") : "01";
  return `${date.year}-${month}-${day}`;
}

function formatStatus(status?: string | null) {
  return cleanWhitespace((status ?? "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())) || "Unknown";
}

function pickStudio(item: AniListMedia) {
  const studios = (item.studios?.edges ?? [])
    .filter((edge) => Boolean(edge?.node?.name))
    .sort((left, right) => Number(Boolean(right?.isMain)) - Number(Boolean(left?.isMain)))
    .map((edge) => edge?.node?.name ?? "")
    .filter(Boolean);

  return Array.from(new Set(studios)).slice(0, 2).join(", ") || undefined;
}

function dedupeImages(images: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return images.filter((image): image is string => {
    if (!image) {
      return false;
    }

    const key = image.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function mapCredits(characters?: AniListCharacterEdge[] | null) {
  return (
    characters?.slice(0, 6).flatMap((entry) => {
      const characterName = entry.node?.name?.full || entry.node?.name?.native;
      if (!characterName) {
        return [];
      }

      const voiceActor = entry.voiceActors?.find((actor) => actor.name?.full)?.name?.full;
      if (voiceActor) {
        return [
          {
            name: voiceActor,
            role: "Voice Actor",
            character: characterName,
          },
        ];
      }

      return [
        {
          name: characterName,
          role: entry.role === "MAIN" ? "Character" : "Supporting Character",
        },
      ];
    }) ?? []
  );
}

function buildTrailerUrl(trailer?: AniListTrailer | null) {
  if (!trailer?.id || !trailer.site) {
    return undefined;
  }

  const site = trailer.site.toLowerCase();
  if (site === "youtube") {
    return `https://www.youtube.com/embed/${trailer.id}`;
  }
  if (site === "dailymotion") {
    return `https://www.dailymotion.com/embed/video/${trailer.id}`;
  }

  return undefined;
}

function isStreamingLink(site?: string | null, type?: string | null) {
  const normalizedSite = cleanWhitespace(site ?? "").toLowerCase();
  const normalizedType = cleanWhitespace(type ?? "").toLowerCase();

  if (normalizedType.includes("stream")) {
    return true;
  }

  return [
    "crunchyroll",
    "netflix",
    "hulu",
    "disney+",
    "amazon prime video",
    "amazon video",
    "hidive",
    "funimation",
  ].some((entry) => normalizedSite.includes(entry));
}

function buildExternalLinks(item: AniListMedia) {
  const links = new Map<string, { name: string; url: string }>();

  for (const episode of item.streamingEpisodes ?? []) {
    if (episode.url && episode.site) {
      links.set(episode.site.toLowerCase(), {
        name: episode.site,
        url: episode.url,
      });
    }
  }

  for (const link of item.externalLinks ?? []) {
    if (!link.url || !link.site || !isStreamingLink(link.site, link.type)) {
      continue;
    }

    links.set(link.site.toLowerCase(), {
      name: link.site,
      url: link.url,
    });
  }

  if (item.siteUrl) {
    links.set("anilist", {
      name: "AniList",
      url: item.siteUrl,
    });
  }

  const preferredOrder = ["crunchyroll", "netflix", "hulu", "disney+", "amazon prime video", "hidive", "funimation", "anilist"];
  return Array.from(links.entries())
    .sort((left, right) => {
      const leftIndex = preferredOrder.indexOf(left[0]);
      const rightIndex = preferredOrder.indexOf(right[0]);
      return (leftIndex === -1 ? preferredOrder.length : leftIndex) - (rightIndex === -1 ? preferredOrder.length : rightIndex);
    })
    .map(([, value]) => value);
}

function buildFallbackImage(item: AniListMedia) {
  return (
    item.bannerImage ||
    item.coverImage?.extraLarge ||
    item.coverImage?.large ||
    item.coverImage?.medium ||
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=900&q=80"
  );
}

function buildEntryLabel(item: AniListMedia, seasonCount?: number) {
  if (item.format === "MOVIE") {
    return "Movie";
  }
  if (seasonCount && seasonCount > 1) {
    return `${seasonCount} seasons`;
  }
  if (item.episodes) {
    return `${item.episodes} episodes`;
  }
  if (item.duration && item.format !== "TV" && item.format !== "ONA" && item.format !== "OVA") {
    return `${item.duration} min`;
  }
  return undefined;
}

function mapAnime(
  item: AniListMedia,
  overrides?: {
    title?: string;
    collectionTitle?: string;
    entryCount?: number;
    entryLabel?: string;
    seasonCount?: number;
  },
) {
  const title = overrides?.title || getDisplayTitle(item);
  const animeKind = item.format ?? undefined;
  const seriesContext = getAnimeSeriesContext(getDisplayTitle(item), animeKind);
  const canonicalTitle = overrides?.collectionTitle || seriesContext.parentSeriesTitle || normalizeAnimeBaseTitle(getDisplayTitle(item));
  const isMovie = isAnimeMovie(title, item.episodes ?? undefined, animeKind);
  const animeType = isMovie ? "anime_movie" : "anime";
  const cleanedDescription = stripDescription(item.description) || "No synopsis yet.";
  const ratingBase = item.averageScore ?? item.meanScore ?? 0;
  const computedRating = Number((ratingBase > 10 ? ratingBase / 10 : ratingBase).toFixed(1)) || 0;
  const fallbackImage = buildFallbackImage(item);
  const externalLinks = buildExternalLinks(item);

  const media: MediaItem = {
    id: `anilist-anime-${item.id}`,
    slug: slugify(canonicalTitle || title),
    source: "anilist",
    sourceId: String(item.id),
    title,
    originalTitle: getOriginalTitle(item),
    type: animeType,
    year: getAnimeYear(item),
    rating: computedRating,
    language: "ja",
    genres: Array.from(
      new Set([
        ...(item.genres ?? []),
        ...((item.tags ?? []).filter((tag) => (tag.rank ?? 0) >= 70).slice(0, 6).map((tag) => tag.name ?? "")),
      ].filter(Boolean)),
    ),
    coverUrl: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || fallbackImage,
    backdropUrl: item.bannerImage || item.coverImage?.extraLarge || item.coverImage?.large || fallbackImage,
    screenshots: dedupeImages([
      item.bannerImage,
      item.trailer?.thumbnail,
      ...(item.streamingEpisodes ?? []).map((ep) => ep.thumbnail),
      item.coverImage?.extraLarge,
      item.coverImage?.large,
    ]),
    overview: cleanedDescription,
    credits: mapCredits(item.characters?.edges),
    details: {
      runtime: item.episodes
        ? `${item.episodes} episodes`
        : item.duration
          ? `${item.duration} min`
          : undefined,
      studio: pickStudio(item),
      status: formatStatus(item.status),
      releaseDate: buildDateString(item.startDate),
      trailerUrl: buildTrailerUrl(item.trailer),
      releaseInfo: item.nextAiringEpisode?.episode && item.nextAiringEpisode?.airingAt
        ? `Episode ${item.nextAiringEpisode.episode} airs ${new Date(item.nextAiringEpisode.airingAt * 1000).toISOString().slice(0, 10)}`
        : undefined,
      episodeCount: item.episodes ?? undefined,
      collectionTitle: canonicalTitle,
      entryCount: overrides?.entryCount,
      entryLabel: overrides?.entryLabel ?? buildEntryLabel(item, overrides?.seasonCount),
      seasonCount: overrides?.seasonCount,
      parentSeriesTitle: canonicalTitle,
      parentSeriesLabel: seriesContext.isContinuation ? seriesContext.parentSeriesLabel : undefined,
      sourceLabel: "AniList",
      sourceUrl: item.siteUrl || `https://anilist.co/anime/${item.id}`,
      collectionId: item.idMal ?? undefined,
      externalLinks: externalLinks.length ? externalLinks : undefined,
    },
  };

  return media;
}

function rankLocalSearchResults(items: MediaItem[], query: string) {
  return rankCandidatesForQuery(items, query, { limit: 96, minRank: 8 });
}

function dedupeBySource(items: MediaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.source}-${item.sourceId}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildAniListSort(sort: AniListBrowseParams["sort"], seed = 1, isSearch = false) {
  if (isSearch) {
    return ["SEARCH_MATCH", "POPULARITY_DESC"];
  }

  if (sort === "newest") {
    return ["START_DATE_DESC", "POPULARITY_DESC"];
  }

  if (sort === "rating") {
    return ["SCORE_DESC", "POPULARITY_DESC"];
  }

  if (sort === "title") {
    return ["TITLE_ROMAJI"];
  }

  const discoverySorts = [
    ["TRENDING_DESC", "POPULARITY_DESC"],
    ["POPULARITY_DESC", "SCORE_DESC"],
    ["FAVOURITES_DESC", "POPULARITY_DESC"],
    ["SCORE_DESC", "TRENDING_DESC"],
  ] as const;

  return discoverySorts[Math.abs(seed) % discoverySorts.length];
}

async function fetchBrowsePage(params: {
  page: number;
  perPage: number;
  query?: string;
  genre?: string;
  sort?: AniListBrowseParams["sort"];
  seed?: number;
}) {
  const result = await anilistFetch<AniListPageResponse>(BROWSE_ANIME_QUERY, {
    page: params.page,
    perPage: Math.min(50, Math.max(10, params.perPage)),
    search: params.query?.trim() || undefined,
    genreIn: params.genre && params.genre !== "all" ? [params.genre] : undefined,
    sort: buildAniListSort(params.sort, params.seed, Boolean(params.query?.trim())),
  });

  return result.Page;
}

export async function browseAniListAnime(params: AniListBrowseParams) {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(50, Math.max(16, params.pageSize ?? 48));
  const query = params.query?.trim() || "";
  const genre = params.genre?.trim() || "";
  const sort = params.sort ?? "discovery";
  const seed = params.seed ?? 1;

  if (query) {
    const [pageOne, pageTwo] = await Promise.all([
      fetchBrowsePage({ page: 1, perPage: Math.ceil(perPage / 2), query, genre, sort, seed }).catch(() => ({
        pageInfo: { currentPage: 1, lastPage: 1, total: 0, hasNextPage: false, perPage },
        media: [] as AniListMedia[],
      })),
      fetchBrowsePage({ page: 2, perPage: Math.ceil(perPage / 2), query, genre, sort, seed }).catch(() => ({
        pageInfo: { currentPage: 2, lastPage: 1, total: 0, hasNextPage: false, perPage },
        media: [] as AniListMedia[],
      })),
    ]);

    const items = rankLocalSearchResults(
      dedupeBySource([...pageOne.media, ...pageTwo.media].map((entry) => mapAnime(entry))),
      query,
    ).slice(0, perPage);

    return {
      page: 1,
      totalPages: 1,
      totalResults: items.length,
      items,
    };
  }

  const discoveryOffset = sort === "discovery" ? Math.abs(seed % 24) : 0;
  const requestPage = page + discoveryOffset;
  const payload = await fetchBrowsePage({
    page: requestPage,
    perPage: Math.max(perPage, 48), // Fetch more items initially to account for filtering
    genre,
    sort,
    seed,
  });
  const items = dedupeBySource(payload.media.map((entry) => mapAnime(entry))).slice(0, perPage);
  const lastPage = payload.pageInfo.lastPage ?? requestPage;

  return {
    page,
    totalPages: Math.max(1, lastPage - discoveryOffset),
    totalResults: payload.pageInfo.total ?? items.length,
    items,
  };
}

async function getAniListAnimeMedia(variables: { id?: number; idMal?: number }) {
  const payload = await anilistFetch<AniListMediaResponse>(DETAIL_ANIME_QUERY, variables);
  if (!payload.Media) {
    throw new Error("AniList anime not found");
  }
  return payload.Media;
}

function mergeDetailImages(media: MediaItem, tmdbImages: TmdbAnimeImageEnrichment) {
  const tmdbGallery = dedupeImages([tmdbImages.backdropUrl, ...tmdbImages.screenshots]);
  const fallbackGallery = dedupeImages([...(media.screenshots ?? []), media.coverUrl, media.backdropUrl]);
  const screenshots = (tmdbGallery.length >= 3 ? tmdbGallery : dedupeImages([...tmdbGallery, ...fallbackGallery])).slice(0, 10);

  return {
    ...media,
    coverUrl: tmdbImages.coverUrl ?? media.coverUrl,
    backdropUrl: tmdbImages.backdropUrl ?? tmdbImages.coverUrl ?? media.backdropUrl,
    screenshots,
  };
}

async function buildDetailedAnime(item: AniListMedia) {
  const media = mapAnime(item);
  const tmdbImages = await enrichAnimeImagesFromTmdb({
    titles: animeTitleVariants(item),
    year: getAnimeYear(item) || undefined,
  }).catch(
    () =>
      ({
        screenshots: [],
      }) satisfies TmdbAnimeImageEnrichment,
  );

  return mergeDetailImages(
    {
      ...media,
      credits: mapCredits(item.characters?.edges),
      screenshots: dedupeImages([
        ...(item.characters?.edges ?? []).map((entry) => entry.node?.image?.large),
        item.bannerImage,
        item.trailer?.thumbnail,
        media.coverUrl,
      ]),
    },
    tmdbImages,
  );
}

export async function getAniListAnimeDetails(id: number) {
  const item = await getAniListAnimeMedia({ id });
  return buildDetailedAnime(item);
}

export async function getAniListAnimeDetailsByMalId(idMal: number) {
  const item = await getAniListAnimeMedia({ idMal });
  return buildDetailedAnime(item);
}

function toFranchiseEntry(item: AniListMedia): AnimeFranchiseEntry {
  const ratingBase = item.averageScore ?? item.meanScore ?? 0;
  return {
    id: item.id,
    title: getDisplayTitle(item),
    year: getAnimeYear(item),
    rating: Number((ratingBase > 10 ? ratingBase / 10 : ratingBase).toFixed(1)) || 0,
    status: formatStatus(item.status),
    episodes: item.episodes ?? undefined,
    type: item.format ?? undefined,
    releaseDate: buildDateString(item.startDate),
  };
}

function sortFranchiseEntries(entries: AnimeFranchiseEntry[]) {
  return [...entries].sort((left, right) => {
    const leftDate = left.releaseDate ?? `${left.year || 0}-12-31`;
    const rightDate = right.releaseDate ?? `${right.year || 0}-12-31`;
    return leftDate.localeCompare(rightDate) || left.title.localeCompare(right.title);
  });
}

function isSupplementalAnimeEntry(entry: AnimeFranchiseEntry) {
  const title = cleanWhitespace(entry.title).toLowerCase();
  const type = cleanWhitespace(entry.type ?? "").toLowerCase();

  return (
    ["special", "ova", "ona", "music"].includes(type) ||
    /\b(special|recap|compilation|summary|digest|music video|live action)\b/i.test(title)
  );
}

function inferSeasonKey(entry: AnimeFranchiseEntry) {
  const title = cleanWhitespace(entry.title);
  const normalized = title.toLowerCase();

  if (/final season/i.test(title)) {
    return "season-final";
  }

  const explicitSeason =
    normalized.match(/\bseason\s+(\d+)\b/i)?.[1] ??
    normalized.match(/\b(\d+)(?:st|nd|rd|th)\s+season\b/i)?.[1];

  if (explicitSeason) {
    return `season-${explicitSeason}`;
  }

  if (!isSupplementalAnimeEntry(entry)) {
    return "season-1";
  }

  return undefined;
}

function countDistinctSeasons(entries: AnimeFranchiseEntry[]) {
  const seasonKeys = new Set(
    entries
      .map((entry) => entry.seasonKey)
      .filter((seasonKey): seasonKey is string => Boolean(seasonKey)),
  );

  return seasonKeys.size || entries.length;
}

async function buildAnimeFranchiseFromItem(item: AniListMedia) {
  const titleVariants = animeTitleVariants(item);
  const franchiseRoot = extractFranchiseRoot(getDisplayTitle(item), item.format ?? undefined);
  const allowedRelations = new Set([
    "PREQUEL",
    "SEQUEL",
    "SIDE_STORY",
    "PARENT",
    "ALTERNATIVE",
    "ALTERNATIVE_VERSION",
    "SPIN_OFF",
    "SUMMARY",
  ]);

  const relationMatches = (item.relations?.edges ?? [])
    .filter((edge) => edge.node && allowedRelations.has(edge.relationType ?? ""))
    .map((edge) => edge.node as AniListMedia);

  const searchSupplements = await Promise.all(
    Array.from(new Set([franchiseRoot, normalizeAnimeBaseTitle(getDisplayTitle(item), item.format ?? undefined)])).map((query) =>
      query.length >= 2
        ? fetchBrowsePage({
            page: 1,
            perPage: 25,
            query,
            sort: "newest",
          })
            .then((result) => result.media)
            .catch(() => [] as AniListMedia[])
        : Promise.resolve([] as AniListMedia[]),
    ),
  );

  const seen = new Set<number>();
  const candidates = [item, ...relationMatches, ...searchSupplements.flat()]
    .filter((entry) => {
      if (!entry || seen.has(entry.id)) {
        return false;
      }
      seen.add(entry.id);
      return true;
    })
    .filter((entry) => {
      const displayTitle = getDisplayTitle(entry);
      return titleVariants.some((title) => isSameFranchise(displayTitle, title, entry.format ?? undefined, item.format ?? undefined)) ||
        matchesFranchise(
          displayTitle,
          entry.title?.english ?? undefined,
          entry.title?.native ?? undefined,
          titleVariants,
          "anime",
          entry.episodes ?? undefined,
        );
    });

  const entries = sortFranchiseEntries(
    candidates.map((candidate) => {
      const entry = toFranchiseEntry(candidate);
      return {
        ...entry,
        seasonKey: inferSeasonKey(entry),
      };
    }),
  );

  const seasonEntries = entries.filter((entry) => {
    const type = cleanWhitespace(entry.type ?? "").toLowerCase();
    return ["tv", "tv_short"].includes(type) && !isSupplementalAnimeEntry(entry);
  });
  const movieEntries = entries.filter((entry) => cleanWhitespace(entry.type ?? "").toLowerCase() === "movie");
  const seasonCount = countDistinctSeasons(seasonEntries);

  return {
    title: normalizeAnimeBaseTitle(getDisplayTitle(item), item.format ?? undefined),
    entries,
    seasonEntries,
    movieEntries,
    seasonCount,
  };
}

export async function getAniListAnimeFranchise(id: number) {
  const item = await getAniListAnimeMedia({ id });
  return buildAnimeFranchiseFromItem(item);
}

export async function getAniListAnimeFranchiseByMalId(idMal: number) {
  const item = await getAniListAnimeMedia({ idMal });
  return buildAnimeFranchiseFromItem(item);
}
