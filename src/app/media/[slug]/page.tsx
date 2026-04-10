import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { BrowseResetLink } from "@/components/browse-reset-link";
import { CatalogCard } from "@/components/catalog-card";
import { DetailBackButton } from "@/components/detail-back-button";
import { DetailViewEffects } from "@/components/detail-view-effects";
import { MediaActions } from "@/components/media-actions";
import { RelatedMediaSection } from "@/components/related-media-section";
import { ResilientMediaImage } from "@/components/resilient-media-image";
import { auth } from "@/lib/auth";
import { getMediaBySlug, mockCatalog } from "@/lib/mock-catalog";
import { browseIgdbGames, getIgdbGameDetails } from "@/lib/sources/igdb";
import { browseJikanAnime, getJikanAnimeDetails, getJikanAnimeFranchise } from "@/lib/sources/jikan";
import { browseTmdbCatalog, getTmdbMediaDetails, getTmdbStarterCatalog } from "@/lib/sources/tmdb";
import { MediaItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DETAIL_PALETTES = [
  { accent: "#03fcbe", accentSoft: "rgba(3, 252, 190, 0.18)", glow: "rgba(3, 252, 190, 0.24)", edge: "rgba(3, 252, 190, 0.34)", haze: "rgba(158, 135, 255, 0.16)" },
  { accent: "#ff8a7a", accentSoft: "rgba(255, 138, 122, 0.18)", glow: "rgba(255, 138, 122, 0.24)", edge: "rgba(255, 138, 122, 0.34)", haze: "rgba(255, 205, 126, 0.16)" },
  { accent: "#75caff", accentSoft: "rgba(117, 202, 255, 0.18)", glow: "rgba(117, 202, 255, 0.22)", edge: "rgba(117, 202, 255, 0.34)", haze: "rgba(125, 142, 255, 0.16)" },
  { accent: "#f0c56b", accentSoft: "rgba(240, 197, 107, 0.18)", glow: "rgba(240, 197, 107, 0.24)", edge: "rgba(240, 197, 107, 0.34)", haze: "rgba(255, 138, 122, 0.14)" },
  { accent: "#8df07d", accentSoft: "rgba(141, 240, 125, 0.16)", glow: "rgba(141, 240, 125, 0.22)", edge: "rgba(141, 240, 125, 0.3)", haze: "rgba(117, 202, 255, 0.14)" },
  { accent: "#ff78c6", accentSoft: "rgba(255, 120, 198, 0.16)", glow: "rgba(255, 120, 198, 0.2)", edge: "rgba(255, 120, 198, 0.32)", haze: "rgba(255, 185, 110, 0.15)" },
  { accent: "#c6a4ff", accentSoft: "rgba(198, 164, 255, 0.18)", glow: "rgba(198, 164, 255, 0.22)", edge: "rgba(198, 164, 255, 0.34)", haze: "rgba(3, 252, 190, 0.14)" },
  { accent: "#ff9f58", accentSoft: "rgba(255, 159, 88, 0.18)", glow: "rgba(255, 159, 88, 0.22)", edge: "rgba(255, 159, 88, 0.34)", haze: "rgba(255, 120, 198, 0.14)" },
  { accent: "#71f0d4", accentSoft: "rgba(113, 240, 212, 0.18)", glow: "rgba(113, 240, 212, 0.22)", edge: "rgba(113, 240, 212, 0.34)", haze: "rgba(117, 202, 255, 0.14)" },
  { accent: "#ffdc78", accentSoft: "rgba(255, 220, 120, 0.18)", glow: "rgba(255, 220, 120, 0.2)", edge: "rgba(255, 220, 120, 0.32)", haze: "rgba(198, 164, 255, 0.16)" },
] as const;

function cleanNarrativeText(input?: string) {
  const text = (input ?? "").replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();

  if (!text) return "No overview yet.";
  if (text.length < 110) {
    return `${text} This entry still needs a fuller synopsis, so the page leans more on genre, tone, and franchise context.`;
  }
  if (text.length > 320) {
    return `${text.slice(0, 317).trimEnd()}...`;
  }
  return text;
}

function getAnimeAudienceLens(genres: string[]) {
  const lowerGenres = genres.map((genre) => genre.toLowerCase());
  const labels: string[] = [];

  if (lowerGenres.some((genre) => ["action", "adventure", "martial arts", "super power"].includes(genre))) {
    labels.push("action-heavy Shonen");
  }
  if (lowerGenres.some((genre) => ["romance", "drama", "slice of life"].includes(genre))) {
    labels.push("romantic Shojo");
  }
  if (lowerGenres.some((genre) => ["psychological", "thriller", "horror", "mystery"].includes(genre))) {
    labels.push("mature Seinen");
  }
  if (lowerGenres.some((genre) => ["fantasy", "isekai"].includes(genre))) {
    labels.push("Isekai");
  }
  if (lowerGenres.some((genre) => ["girls love"].includes(genre))) {
    labels.push("Yuri (Girls' Love)");
  }
  if (lowerGenres.some((genre) => ["boys love"].includes(genre))) {
    labels.push("Yaoi (Boys' Love)");
  }

  return labels.slice(0, 3);
}

function dedupeItems(items: MediaItem[]) {
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

function buildQueryVariants(title: string) {
  const cleaned = title
    .replace(/[:\-|].*$/g, "")
    .replace(/\b(season|part|chapter|volume)\b.*$/i, "")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const short = words.slice(0, 4).join(" ");

  return Array.from(new Set([cleaned, short, words.slice(0, 2).join(" ")].filter((value) => value.length >= 2)));
}

function buildFranchiseSignals(media: MediaItem) {
  const haystack = [
    media.title,
    media.originalTitle ?? "",
    media.details.collectionTitle ?? "",
    media.details.studio ?? "",
    media.overview,
  ]
    .join(" ")
    .toLowerCase();

  const signals = new Set<string>();

  const keywordMap: Array<{ query: string; matches: string[] }> = [
    { query: "star wars", matches: ["star wars", "jedi", "sith", "lightsaber", "galaxy far far away", "lucasfilm", "mandalorian", "thrawn", "ahsoka"] },
    { query: "marvel", matches: ["marvel", "avengers", "x-men", "mcu", "shield"] },
    { query: "dc", matches: ["dc", "gotham", "metropolis", "justice league", "wayne enterprises"] },
    { query: "red dead", matches: ["red dead", "rockstar games", "outlaw", "frontier"] },
    { query: "grand theft auto", matches: ["grand theft auto", "gta", "rockstar games"] },
    { query: "lord of the rings", matches: ["middle-earth", "lord of the rings", "tolkien", "gondor"] },
    { query: "harry potter", matches: ["hogwarts", "wizarding world", "harry potter"] },
    { query: "pokemon", matches: ["pokemon", "pokémon"] },
    { query: "dragon ball", matches: ["dragon ball", "saiyan"] },
    { query: "naruto", matches: ["naruto", "shinobi", "hokage"] },
    { query: "zelda", matches: ["hyrule", "zelda", "link"] },
    { query: "mario", matches: ["mario", "bowser", "mushroom kingdom"] },
  ];

  for (const entry of keywordMap) {
    if (entry.matches.some((match) => haystack.includes(match))) {
      signals.add(entry.query);
    }
  }

  const cleanedTitle = media.title.toLowerCase();
  if (cleanedTitle.includes(":")) {
    signals.add(cleanedTitle.split(":")[0].trim());
  }

  return Array.from(signals).filter((signal) => signal.length >= 3).slice(0, 3);
}

function candidateMatchesSignal(candidate: MediaItem, signals: string[]) {
  if (!signals.length) {
    return false;
  }

  const haystack = [
    candidate.title,
    candidate.originalTitle ?? "",
    candidate.details.collectionTitle ?? "",
    candidate.details.studio ?? "",
    candidate.overview,
  ]
    .join(" ")
    .toLowerCase();

  return signals.some((signal) => haystack.includes(signal.toLowerCase()));
}

function normalizeSlugValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hashPaletteKey(value: string) {
  return value.split("").reduce((total, char, index) => total + char.charCodeAt(0) * (index + 1), 0);
}

function matchesSlugCandidate(item: MediaItem, slug: string) {
  const targetSlug = normalizeSlugValue(slug);
  const candidates = [
    item.slug,
    item.title,
    item.originalTitle ?? "",
    item.details.collectionTitle ?? "",
  ];

  return candidates.some((candidate) => {
    if (!candidate) return false;
    const normalizedCandidate = normalizeSlugValue(candidate);
    return (
      normalizedCandidate === targetSlug ||
      normalizedCandidate.includes(targetSlug) ||
      targetSlug.includes(normalizedCandidate)
    );
  });
}

async function findRemoteMediaBySlug(slug: string, preferredSource?: string, preferredType?: string) {
  const queryVariants = buildQueryVariants(slug.replace(/-/g, " "));
  const searchPages = [1, 2, 3, 4, 5];

  for (const query of queryVariants) {
    for (const searchPage of searchPages) {
      const [movieCatalog, showCatalog, animeCatalog, gameCatalog] = await Promise.all([
        preferredSource && preferredSource !== "tmdb"
          ? Promise.resolve(null)
          : browseTmdbCatalog({ type: "movie", page: searchPage, query, sort: "rating", seed: 1 }).catch(() => null),
        preferredSource && preferredSource !== "tmdb"
          ? Promise.resolve(null)
          : browseTmdbCatalog({ type: "show", page: searchPage, query, sort: "rating", seed: 1 }).catch(() => null),
        preferredSource && preferredSource !== "jikan"
          ? Promise.resolve(null)
          : browseJikanAnime({ page: searchPage, query, sort: "rating", seed: 1 }).catch(() => null),
        preferredSource && preferredSource !== "igdb"
          ? Promise.resolve(null)
          : browseIgdbGames({ page: searchPage, query, sort: "rating", seed: 1 }).catch(() => null),
      ]);

      const matchPool = [
        ...(preferredType === "movie" ? movieCatalog?.items ?? [] : []),
        ...(preferredType === "show" ? showCatalog?.items ?? [] : []),
        ...(preferredType === "anime" ? animeCatalog?.items ?? [] : []),
        ...(preferredType === "game" ? gameCatalog?.items ?? [] : []),
        ...(preferredType ? [] : movieCatalog?.items ?? []),
        ...(preferredType ? [] : showCatalog?.items ?? []),
        ...(preferredType ? [] : animeCatalog?.items ?? []),
        ...(preferredType ? [] : gameCatalog?.items ?? []),
      ];

      const match = matchPool.find((item) => matchesSlugCandidate(item, slug));

      if (!match) {
        continue;
      }

      if (match.source === "tmdb" && (match.type === "movie" || match.type === "show")) {
        const media = await getTmdbMediaDetails(Number(match.sourceId), match.type === "movie" ? "movie" : "tv");
        return { media };
      }

    if (match.source === "jikan") {
      const media = await getJikanAnimeDetails(Number(match.sourceId));
      const animeFranchise = await getJikanAnimeFranchise(Number(match.sourceId)).catch(() => undefined);
      return { media, animeFranchise };
    }

      if (match.source === "igdb") {
        const media = await getIgdbGameDetails(Number(match.sourceId));
        return { media };
      }
    }
  }

  return { media: undefined, animeFranchise: undefined };
}

function scoreRelatedCandidate(base: MediaItem, candidate: MediaItem) {
  let score = 0;
  const sharedGenres = candidate.genres.filter((genre) => base.genres.includes(genre)).length;
  const primaryGenre = base.genres[0];
  const secondaryGenre = base.genres[1];
  const tertiaryGenre = base.genres[2];
  const baseStudio = (base.details.studio ?? "").trim().toLowerCase();
  const candidateStudio = (candidate.details.studio ?? "").trim().toLowerCase();
  const baseCollection = normalizeSlugValue(base.details.collectionTitle ?? base.title);
  const candidateCollection = normalizeSlugValue(candidate.details.collectionTitle ?? candidate.title);
  const baseCreditNames = new Set(base.credits.map((credit) => credit.name.trim().toLowerCase()).filter(Boolean));
  const sharedCredits = candidate.credits.filter((credit) => baseCreditNames.has(credit.name.trim().toLowerCase())).length;

  if (candidate.type === base.type) score += 14;
  if (candidate.source === base.source) score += 2;
  score += sharedGenres * 10;
  if (primaryGenre && candidate.genres.includes(primaryGenre)) score += 8;
  if (secondaryGenre && candidate.genres.includes(secondaryGenre)) score += 4;
  if (tertiaryGenre && candidate.genres.includes(tertiaryGenre)) score += 2;
  if (baseStudio && candidateStudio && baseStudio === candidateStudio) score += 12;
  if (sharedCredits) score += sharedCredits * 11;
  if (baseCollection && candidateCollection && (candidateCollection.includes(baseCollection) || baseCollection.includes(candidateCollection))) {
    score += 20;
  }

  const yearDistance = Math.abs((candidate.year || 0) - (base.year || 0));
  if (yearDistance <= 1) score += 5;
  else if (yearDistance <= 4) score += 2;
  else if (yearDistance >= 15) score -= 4;

  score += Math.max(0, 5 - Math.abs(candidate.rating - base.rating));

  if (sharedGenres === 0 && candidate.type === base.type) {
    score -= 8;
  }

  return score;
}

function buildDeepDiveCards(
  media: MediaItem,
  animeFranchise?:
    | {
        title: string;
        entries: Array<{
          id: number;
          title: string;
          year: number;
          rating: number;
          status?: string;
          episodes?: number;
        }>;
        seasonEntries?: Array<{
          id: number;
          title: string;
          year: number;
          rating: number;
          status?: string;
          episodes?: number;
          type?: string;
          seasonKey?: string;
        }>;
        seasonCount?: number;
      }
    | undefined,
) {
  const topGenres = media.genres.slice(0, 3).join(" • ") || "Genre blend still loading";
  const castLead = media.credits[0]?.name ?? "Unknown lead";
  const secondCredit = media.credits[1]?.name ?? media.details.studio ?? "No second anchor yet";
  const balancedOverview = cleanNarrativeText(media.overview);

  if (media.type === "anime") {
    const animeAudienceLens = getAnimeAudienceLens(media.genres);
    return [
      {
        eyebrow: "Anime lane",
        title: animeAudienceLens.length ? animeAudienceLens.join(" â€¢ ") : topGenres,
        body: balancedOverview,
      },
      {
        eyebrow: "Character pull",
        title: castLead,
        body: media.credits.length
          ? `${castLead} is the first name to watch here, and ${secondCredit} helps define the tone around them.`
          : "Character data is thinner here, so the genre mix and franchise shape are carrying more of the pull.",
      },
      {
        eyebrow: "Arc footprint",
        title: animeFranchise?.seasonCount ? `${animeFranchise.seasonCount} seasons released` : animeFranchise?.entries.length ? `${animeFranchise.entries.length} connected entries` : "Single entry focus",
        body: animeFranchise?.seasonCount
          ? `This franchise currently reads as ${animeFranchise.seasonCount} main seasons, so the page can point you toward the actual long-form run instead of mixing every side entry together.`
          : animeFranchise?.entries.length
            ? `This franchise spans ${animeFranchise.entries.length} connected entries, which means there is more here than a single season drop.`
          : "This page is focused on the core entry right now, but it still carries enough atmosphere and category context to judge whether the ride is for you.",
      },
    ];
  }

  if (media.type === "game") {
    const genreRead = media.genres[0] ?? topGenres;
    const platformRead = media.details.platform ?? "Platform lineup still coming together";
    const releaseRead = media.details.releaseInfo ?? media.details.status ?? `${media.year || "Unknown"} release`;

    return [
      {
        eyebrow: "Play energy",
        title: topGenres,
        body: `The fantasy here is built around ${topGenres.toLowerCase()}, with ${media.overview.toLowerCase()}`,
      },
      {
        eyebrow: "Studio signal",
        title: media.details.studio ?? "Unknown studio",
        body: `${media.details.studio ?? "The studio"} is the main creative anchor here, and ${secondCredit} gives you another point of reference for how it was built.`,
      },
      {
        eyebrow: "What to expect",
        title: genreRead,
        body: `If you are checking this out for the feel first, the key read is ${releaseRead.toLowerCase()}, tuned for ${genreRead.toLowerCase()}, and playable across ${platformRead.toLowerCase()}.`,
      },
    ];
  }

  return [
    {
      eyebrow: "Story hook",
      title: topGenres,
      body: balancedOverview,
    },
    {
      eyebrow: "People to watch",
      title: castLead,
      body: media.credits.length
        ? `${castLead} leads the pull here, with ${secondCredit} helping shape how this one lands.`
        : `${media.details.studio ?? "The production team"} is the clearest creative signal on this title.`,
    },
    {
      eyebrow: "Why it lands",
      title: `${media.rating.toFixed(1)} / 10`,
      body: `Between ${topGenres.toLowerCase()} and a ${media.year || "current"} release footprint, this feels built for someone chasing strong atmosphere more than background watching.`,
    },
  ];
}

function buildMoodLine(media: MediaItem) {
  const genreBlend = media.genres.slice(0, 3).join(", ").toLowerCase();

  if (media.type === "anime") {
    const audienceLens = getAnimeAudienceLens(media.genres);
    return `An anime built around ${genreBlend || "emotion and atmosphere"}, with a sharper pull toward character energy and world mood than passive background watching.${audienceLens.length ? ` It leans toward ${audienceLens.join(", ")}.` : ""}`;
  }

  if (media.type === "game") {
    return `A game driven by ${genreBlend || "strong atmosphere"}, where the fantasy matters as much as the mechanics and studio identity behind it.`;
  }

  if (media.type === "show") {
    return `A series tuned for ${genreBlend || "strong momentum"}, built to keep you inside its tone over a longer stretch.`;
  }

  return `A film with a ${genreBlend || "strong cinematic"} identity, the kind of pick you open because the whole vibe already has you sold.`;
}

function imageSignature(image: string) {
  try {
    const parsed = new URL(image, "https://dummy.local");
    const nested = parsed.searchParams.get("url");
    const targetPath = nested ? new URL(nested).pathname : parsed.pathname;
    const parts = targetPath.split("/").filter(Boolean);
    const fileName = parts[parts.length - 1] || targetPath;

    return fileName
      .toLowerCase()
      .replace(/\.(jpg|jpeg|png|webp)$/i, "")
      .replace(/\?.*$/, "")
      .replace(/[-_](original|large|medium|small|thumb|t\d+x\d+|v\d+)$/i, "")
      .replace(/[_-]\d{2,4}x\d{2,4}$/i, "");
  } catch {
    return image.toLowerCase();
  }
}

function uniqueGalleryImages(media: MediaItem) {
  const seen = new Set<string>();
  const lead = media.backdropUrl || media.coverUrl;
  const gallery: string[] = [];
  const prefersSourceArt = media.type === "anime" || media.type === "game";

  function push(image?: string) {
    if (!image) return;
    const signature = imageSignature(image);
    if (!signature || seen.has(signature)) return;
    seen.add(signature);
    gallery.push(image);
  }

  if (!prefersSourceArt) {
    push(lead);
  }

  for (const image of media.screenshots ?? []) {
    push(image);
  }

  if (gallery.length < 3) {
    push(lead);
  }

  if (gallery.length < 4 && media.type !== "anime") {
    push(media.coverUrl);
  }

  return gallery;
}

function buildStoryGallery(gallery: string[], fallback: string) {
  if (!gallery.length) {
    return [fallback];
  }

  return Array.from(new Set([...gallery, fallback].filter(Boolean))).slice(0, 5);
}

function buildImmersionScenes(media: MediaItem, gallery: string[], deepDiveCards: ReturnType<typeof buildDeepDiveCards>) {
  const storyGallery = buildStoryGallery(gallery, media.backdropUrl || media.coverUrl);
  const genreBlend = media.genres.slice(0, 3).join(" / ") || "Atmosphere-first";
  const creditLead = media.credits[0]?.name ?? media.details.studio ?? "The creative team";

  return [
    {
      eyebrow: "Opening frame",
      title: "Step into the mood first",
      body: buildMoodLine(media),
      image: storyGallery[0],
    },
    {
      eyebrow: deepDiveCards[0]?.eyebrow ?? "World",
      title: deepDiveCards[0]?.title ?? genreBlend,
      body: deepDiveCards[0]?.body ?? media.overview,
      image: storyGallery[1],
    },
    {
      eyebrow: "Texture",
      title: `${media.year || "Unknown year"} · ${genreBlend}`,
      body: `Every frame here points back to ${genreBlend.toLowerCase()}, with the overall pull coming from ${creditLead} and a world built to be looked at, not just skimmed.`,
      image: storyGallery[2],
    },
    {
      eyebrow: deepDiveCards[1]?.eyebrow ?? "Creative signal",
      title: deepDiveCards[1]?.title ?? creditLead,
      body: deepDiveCards[1]?.body ?? `${creditLead} is one of the clearest signals for how this media lands.`,
      image: storyGallery[3],
    },
    {
      eyebrow: deepDiveCards[2]?.eyebrow ?? "Why it lands",
      title: deepDiveCards[2]?.title ?? `${media.rating.toFixed(1)} / 10`,
      body:
        deepDiveCards[2]?.body ??
        `The final read is simple: ${media.rating.toFixed(1)} rated, ${media.year || "year unknown"}, and carrying enough visual identity to feel like a place you can stay in for a while.`,
      image: storyGallery[4],
    },
  ].filter((scene) => Boolean(scene.image));
}

async function withTimeout<T>(work: Promise<T>, fallback: T, timeoutMs = 1200) {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function getRelatedMediaRail(media: MediaItem) {
  const primaryGenre = media.genres[0];
  const secondaryGenre = media.genres[1];
  const tertiaryGenre = media.genres[2];
  const queries = buildQueryVariants(media.title);
  const franchiseSignals = buildFranchiseSignals(media);
  const collected: MediaItem[] = [];

  if (media.type === "movie" || media.type === "show") {
    const mediaType = media.type;
    const results = await Promise.allSettled([
      withTimeout(
        browseTmdbCatalog({ type: mediaType, page: 1, genre: primaryGenre, sort: "rating" }),
        { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
      ),
      withTimeout(
        browseTmdbCatalog({ type: mediaType, page: 2, genre: primaryGenre, sort: "discovery", seed: 7 }),
        { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
      ),
      ...(secondaryGenre
        ? [
            withTimeout(
              browseTmdbCatalog({ type: mediaType, page: 1, genre: secondaryGenre, sort: "discovery", seed: 9 }),
              { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
            ),
          ]
        : []),
      ...franchiseSignals.map((query, index) =>
        withTimeout(
          browseTmdbCatalog({ type: mediaType, page: 1, query, sort: "rating", seed: 13 + index }),
          { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
        ),
      ),
      ...queries.slice(0, 2).map((query, index) =>
        withTimeout(
          browseTmdbCatalog({ type: mediaType, page: 1, query, sort: "discovery", seed: 5 + index }),
          { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
        ),
      ),
    ]);

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        collected.push(...result.value.items);
      }
    });
  }

  if (media.type === "anime") {
    const results = await Promise.allSettled([
      withTimeout(
        browseJikanAnime({ page: 1, genre: primaryGenre, sort: "rating" }),
        { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
      ),
      withTimeout(
        browseJikanAnime({ page: 2, genre: primaryGenre, sort: "discovery", seed: 7 }),
        { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
      ),
      ...(secondaryGenre
        ? [
            withTimeout(
              browseJikanAnime({ page: 1, genre: secondaryGenre, sort: "discovery", seed: 9 }),
              { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
            ),
          ]
        : []),
      ...franchiseSignals.map((query, index) =>
        withTimeout(
          browseJikanAnime({ page: 1, query, sort: "rating", seed: 13 + index }),
          { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
        ),
      ),
      ...queries.slice(0, 2).map((query, index) =>
        withTimeout(
          browseJikanAnime({ page: 1, query, sort: "discovery", seed: 5 + index }),
          { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
        ),
      ),
    ]);

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        collected.push(...result.value.items);
      }
    });
  }

  if (media.type === "game") {
    const results = await Promise.allSettled([
      withTimeout(
        browseIgdbGames({ page: 1, genre: primaryGenre, sort: "rating" }),
        { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
      ),
      withTimeout(
        browseIgdbGames({ page: 2, genre: primaryGenre, sort: "discovery", seed: 7 }),
        { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
      ),
      ...(secondaryGenre
        ? [
            withTimeout(
              browseIgdbGames({ page: 1, genre: secondaryGenre, sort: "discovery", seed: 9 }),
              { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
            ),
          ]
        : []),
      ...(tertiaryGenre
        ? [
            withTimeout(
              browseIgdbGames({ page: 1, genre: tertiaryGenre, sort: "discovery", seed: 11 }),
              { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
            ),
          ]
        : []),
      ...franchiseSignals.map((query, index) =>
        withTimeout(
          browseIgdbGames({ page: 1, query, sort: "rating", seed: 13 + index }),
          { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
        ),
      ),
      ...queries.slice(0, 2).map((query, index) =>
        withTimeout(
          browseIgdbGames({ page: 1, query, sort: "discovery", seed: 5 + index }),
          { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] },
        ),
      ),
    ]);

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        collected.push(...result.value.items);
      }
    });
  }

  return dedupeItems(collected)
    .filter((candidate) => `${candidate.source}-${candidate.sourceId}` !== `${media.source}-${media.sourceId}`)
    .map((candidate) => ({
      candidate,
      score: scoreRelatedCandidate(media, candidate) + (candidateMatchesSignal(candidate, franchiseSignals) ? 18 : 0),
    }))
    .filter((entry) => (franchiseSignals.length ? candidateMatchesSignal(entry.candidate, franchiseSignals) || entry.score >= 28 : entry.score >= 16))
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.candidate)
    .slice(0, 18);
}

export default async function MediaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string; sourceId?: string; type?: string }>;
}) {
  noStore();
  const session = await auth();
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;
  const { slug } = await params;
  const { source, sourceId, type } = await searchParams;
  let media: MediaItem | undefined = getMediaBySlug(slug);
  let animeFranchise:
    | {
        title: string;
        entries: Array<{
          id: number;
          title: string;
          year: number;
          rating: number;
          status?: string;
          episodes?: number;
        }>;
        seasonEntries?: Array<{
          id: number;
          title: string;
          year: number;
          rating: number;
          status?: string;
          episodes?: number;
          type?: string;
          seasonKey?: string;
        }>;
        seasonCount?: number;
      }
    | undefined;

  if (source === "tmdb" && sourceId && (type === "movie" || type === "show")) {
    try {
      media = await getTmdbMediaDetails(Number(sourceId), type === "movie" ? "movie" : "tv");
    } catch {
      media = undefined;
    }
  }

  if (!media && source === "jikan" && sourceId) {
    try {
      media = await getJikanAnimeDetails(Number(sourceId));
      animeFranchise = await getJikanAnimeFranchise(Number(sourceId)).catch(() => undefined);
    } catch {
      media = undefined;
    }
  }

  if (!media && source === "igdb" && sourceId) {
    try {
      media = await getIgdbGameDetails(Number(sourceId));
    } catch {
      media = undefined;
    }
  }

  if (!media && source === "local" && sourceId) {
    media = mockCatalog.find((item) => item.sourceId === sourceId);
  }

  if (!media) {
    try {
      const starterCatalog = await getTmdbStarterCatalog();
      const starterMatch = starterCatalog.find((item) => matchesSlugCandidate(item, slug));
      if (starterMatch && (starterMatch.type === "movie" || starterMatch.type === "show")) {
        media = await getTmdbMediaDetails(
          Number(starterMatch.sourceId),
          starterMatch.type === "movie" ? "movie" : "tv",
        );
      }
    } catch {
      media = undefined;
    }
  }

  if (!media) {
    try {
      const resolved = await findRemoteMediaBySlug(slug, source, type);
      media = resolved.media;
      animeFranchise = resolved.animeFranchise;
    } catch {
      media = undefined;
    }
  }

  if (!media) {
    return (
      <div className="page-shell">
        <div className="app-shell-layout">
          <AppSidebar active="browse" />
          <main className="workspace">
            <section className="feature-block">
              <p className="eyebrow">Missing</p>
              <h1 className="headline">That media page does not exist yet.</h1>
              <BrowseResetLink className="button button-primary" title="Back to browse">
                Back to browse
              </BrowseResetLink>
            </section>
          </main>
        </div>
      </div>
    );
  }

  const related = await getRelatedMediaRail(media);
  const runtimeLabel =
    media.type === "game"
      ? "Platforms"
      : media.type === "show"
        ? "Seasons released"
        : media.type === "anime"
          ? "Episodes / entries"
          : "Runtime / length";
  const studioLabel =
    media.type === "game"
      ? "Studio / publisher"
      : media.type === "show"
        ? "Network / studio"
        : "Studio / publisher";
  const runtimeValue =
    media.type === "game"
      ? media.details.platform ?? "Unknown"
      : media.type === "show"
        ? media.details.releaseInfo ?? media.details.runtime ?? "Unknown"
        : media.type === "anime"
          ? animeFranchise?.seasonCount
            ? `${animeFranchise.seasonCount} seasons released`
            : media.details.runtime ?? media.details.entryLabel ?? media.details.releaseInfo ?? "Unknown"
          : media.details.runtime ?? media.details.entryLabel ?? media.details.releaseInfo ?? "Unknown";
  const studioValue = media.details.studio ?? media.details.platform ?? "Unknown";
  const statusValue = media.details.status ?? media.details.releaseInfo ?? "Unknown";
  const deepDiveCards = buildDeepDiveCards(media, animeFranchise);
  const spotlightCredits = media.credits.slice(0, 6);
  const gallery = uniqueGalleryImages(media).slice(0, 8);
  const moodLine = buildMoodLine(media);
  const immersionScenes = buildImmersionScenes(media, gallery, deepDiveCards);
  const showAtlas = gallery.length >= 4;
  const palette = DETAIL_PALETTES[hashPaletteKey(`${media.id}-${Date.now()}`) % DETAIL_PALETTES.length];
  const detailPaletteStyle = {
    "--detail-accent": palette.accent,
    "--detail-accent-soft": palette.accentSoft,
    "--detail-glow": palette.glow,
    "--detail-edge": palette.edge,
    "--detail-haze": palette.haze,
  } as Record<string, string>;

  return (
    <div className="page-shell">
      <div className="app-shell-layout">
        <AppSidebar active="browse" />

        <main className="workspace detail-layout" style={detailPaletteStyle}>
          <DetailViewEffects />
          <AppTopBar viewerId={viewerId} viewerName={viewerName} viewerAvatar={viewerAvatar} />
          <section className="detail-hero glass">
            <div className="hero-media">
              <img src={media.backdropUrl || media.coverUrl} alt={`${media.title} backdrop`} loading="eager" decoding="async" fetchPriority="high" />
            </div>
            <div className="detail-content">
              <DetailBackButton />
              <div className="detail-hero-grid">
                <div className="detail-hero-copy">
                  <p className="eyebrow">{media.type}</p>
                  <h1 className="display detail-display">{media.title}</h1>
                  <p className="detail-lead">{moodLine}</p>
                  <p className="copy detail-overview-copy">{media.overview}</p>
                  <div style={{ marginTop: 22 }}>
                    <MediaActions item={media} viewerId={viewerId} />
                  </div>
                  <div className="detail-meta-row">
                    <span className="detail-pill">{media.year}</span>
                    <span className="detail-pill">{media.rating.toFixed(1)}</span>
                    {media.details.entryLabel ? <span className="detail-pill">{media.details.entryLabel}</span> : null}
                    {media.genres.map((genre) => (
                      <span key={genre} className="detail-pill">
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>

                <aside className="detail-side-poster glass">
                  <div className="detail-side-poster-media">
                    <ResilientMediaImage item={media} loading="eager" decoding="async" fetchPriority="high" />
                  </div>
                  <div className="detail-side-poster-copy">
                    <p className="eyebrow">Field guide</p>
                    <div className="detail-side-stat">
                      <span>{runtimeLabel}</span>
                      <strong>{runtimeValue}</strong>
                    </div>
                    <div className="detail-side-stat">
                      <span>{studioLabel}</span>
                      <strong>{studioValue}</strong>
                    </div>
                    <div className="detail-side-stat">
                      <span>Status</span>
                      <strong>{statusValue}</strong>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </section>

          <section className="info-grid">
            <div className="info-panel glass">
              <p className="eyebrow">Essentials</p>
              <h2 className="headline">The quick read before you commit</h2>
              <div className="credit-list" style={{ marginTop: 18 }}>
                <div className="credit-row">
                  <span className="muted">{runtimeLabel}</span>
                  <strong>{runtimeValue}</strong>
                </div>
                <div className="credit-row">
                  <span className="muted">{studioLabel}</span>
                  <strong>{studioValue}</strong>
                </div>
                <div className="credit-row">
                  <span className="muted">Status</span>
                  <strong>{statusValue}</strong>
                </div>
              </div>
            </div>

            <div className="info-panel glass">
              <p className="eyebrow">
                {media.type === "anime" && (animeFranchise?.seasonEntries?.length || animeFranchise?.entries.length) ? "Seasons / Parts" : "Cast / Credits"}
              </p>
              {media.type === "anime" && (animeFranchise?.seasonEntries?.length || animeFranchise?.entries.length) ? (
                <div className="credit-list">
                  {(animeFranchise.seasonEntries?.length ? animeFranchise.seasonEntries : animeFranchise.entries).map((entry) => (
                    <div key={entry.id} className="credit-row">
                      <div>
                        <strong>{entry.title}</strong>
                        <div className="muted">
                          {entry.year || "Year TBD"} · {entry.rating ? entry.rating.toFixed(1) : "Unrated"}
                          {entry.episodes ? ` · ${entry.episodes} episodes` : ""}
                        </div>
                      </div>
                      <span className="muted">{entry.status ?? "Unknown"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="credit-list">
                  {media.credits.map((credit) => (
                    <div key={`${credit.name}-${credit.role}`} className="credit-row">
                      <div>
                        <strong>{credit.name}</strong>
                        <div className="muted">
                          {credit.role}
                          {credit.character ? ` · ${credit.character}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="section-stack detail-world-stage" style={{ paddingTop: 0 }}>
            <div className="section-header">
              <div>
                <p className="eyebrow">Immersion</p>
                <h2 className="headline">Scroll through the world, not just the facts</h2>
                <p className="copy" style={{ maxWidth: 700, marginTop: 10 }}>
                  Five visual beats, tuned smaller so the page feels cinematic without becoming a chore to get through.
                </p>
              </div>
            </div>

            <div className="detail-story-rail">
              {immersionScenes.map((scene, index) => (
                <article key={`${scene.title}-${index}`} className={`detail-story-panel ${index % 2 === 1 ? "is-reversed" : ""}`}>
                  <div className="detail-story-image-shell glass">
                    <img src={scene.image} alt={`${media.title} scene ${index + 1}`} loading={index === 0 ? "eager" : "lazy"} decoding="async" />
                  </div>
                  <div className="detail-story-copy">
                    <p className="eyebrow">{scene.eyebrow}</p>
                    <h3 className="headline detail-story-title">{scene.title}</h3>
                    <p className="copy detail-story-body">{scene.body}</p>
                  </div>
                </article>
              ))}
            </div>

            {showAtlas ? (
              <div className="detail-atlas-strip glass">
                <div className="detail-atlas-copy">
                  <p className="eyebrow">Atlas</p>
                  <h3 className="headline">A cleaner visual anchor for this page</h3>
                  <p className="copy">
                    The detail page only shows this strip when the source actually has enough distinct images, so it feels curated instead of repeated.
                  </p>
                </div>
                <div className="detail-atlas-track">
                  {gallery.slice(0, 5).map((image, index) => (
                    <div key={`${image}-${index}`} className="detail-atlas-tile">
                      <img src={image} alt={`${media.title} atlas ${index + 1}`} loading="lazy" decoding="async" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="section-stack detail-deep-dive" style={{ paddingTop: 0 }}>
            <div className="section-header">
              <div>
                <p className="eyebrow">Read the room</p>
                <h2 className="headline">The parts that make this one stick</h2>
              </div>
            </div>
            <div className="detail-dive-grid">
              {deepDiveCards.map((card) => (
                <article key={card.title} className="info-panel glass detail-dive-card">
                  <p className="eyebrow">{card.eyebrow}</p>
                  <h3 className="headline detail-dive-title">{card.title}</h3>
                  <p className="copy">{card.body}</p>
                </article>
              ))}
            </div>
          </section>

          {spotlightCredits.length ? (
            <section className="section-stack" style={{ paddingTop: 0 }}>
              <div className="section-header">
                <div>
                  <p className="eyebrow">Spotlight</p>
                  <h2 className="headline">
                    {media.type === "game" ? "Studios and key people" : "Cast, voices, and creators"}
                  </h2>
                </div>
              </div>
              <div className="detail-spotlight-grid">
                {spotlightCredits.map((credit) => (
                  <article key={`${credit.name}-${credit.role}`} className="glass detail-spotlight-card">
                    <p className="eyebrow">{credit.role}</p>
                    <h3 className="headline detail-spotlight-title">{credit.name}</h3>
                    <p className="copy">
                      {credit.character
                        ? `Known here for ${credit.character}.`
                        : media.type === "game"
                          ? "A key name connected to how this game was made."
                          : "One of the names shaping the feel of this title."}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="section-stack" style={{ paddingTop: 0 }}>
            <div className="section-header">
              <div>
                <p className="eyebrow">Related</p>
                <h2 className="headline">More like this</h2>
              </div>
            </div>
            <RelatedMediaSection items={related} />
          </section>
        </main>
      </div>
    </div>
  );
}
