import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { BrowseResetLink } from "@/components/browse-reset-link";
import { CatalogCard } from "@/components/catalog-card";
import { DetailBackButton } from "@/components/detail-back-button";
import { DetailGallery } from "@/components/detail-gallery";
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

type DetailPalette = {
  accent: string;
  accentSoft: string;
  glow: string;
  edge: string;
  haze: string;
};

const DETAIL_PALETTES: DetailPalette[] = [
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

const DETAIL_EASTER_EGGS: Array<{
  key: string;
  matches: string[];
  palette: DetailPalette;
  className: string;
  kicker: string;
  title: string;
  copy: string;
}> = [
  {
    key: "naruto",
    matches: ["naruto"],
    palette: { accent: "#ff8d2b", accentSoft: "rgba(255, 141, 43, 0.18)", glow: "rgba(255, 141, 43, 0.24)", edge: "rgba(255, 141, 43, 0.34)", haze: "rgba(88, 144, 255, 0.16)" },
    className: "detail-theme-naruto",
    kicker: "Vault favorite",
    title: "Hidden leaf energy",
    copy: "This page gets a warmer, louder treatment with ember orange, electric blue, and stronger framing around the stills.",
  },
  {
    key: "naruto-shippuden",
    matches: ["naruto shippuden", "naruto: shippuden"],
    palette: { accent: "#ff6e36", accentSoft: "rgba(255, 110, 54, 0.18)", glow: "rgba(255, 110, 54, 0.24)", edge: "rgba(255, 110, 54, 0.34)", haze: "rgba(52, 116, 255, 0.18)" },
    className: "detail-theme-shippuden",
    kicker: "Vault favorite",
    title: "Battle-scarred glow",
    copy: "Shippuden gets a hotter palette, darker haze, and a little more drama in the hero and gallery surfaces.",
  },
  {
    key: "game-of-thrones",
    matches: ["game of thrones"],
    palette: { accent: "#d8b36a", accentSoft: "rgba(216, 179, 106, 0.18)", glow: "rgba(216, 179, 106, 0.22)", edge: "rgba(216, 179, 106, 0.34)", haze: "rgba(124, 55, 23, 0.18)" },
    className: "detail-theme-thrones",
    kicker: "Vault favorite",
    title: "Cold steel, warm fire",
    copy: "This one leans into iron, ash, and throne-room gold so the page feels heavier and more ceremonial.",
  },
  {
    key: "interstellar",
    matches: ["interstellar"],
    palette: { accent: "#9ed6ff", accentSoft: "rgba(158, 214, 255, 0.18)", glow: "rgba(158, 214, 255, 0.2)", edge: "rgba(158, 214, 255, 0.3)", haze: "rgba(255, 255, 255, 0.1)" },
    className: "detail-theme-interstellar",
    kicker: "Vault favorite",
    title: "Orbital quiet",
    copy: "Interstellar gets a cleaner, colder palette with softer bloom so the page feels vast instead of just dark.",
  },
  {
    key: "skyrim",
    matches: ["skyrim", "the elder scrolls v skyrim", "the elder scrolls 5 skyrim"],
    palette: { accent: "#d6dde8", accentSoft: "rgba(214, 221, 232, 0.16)", glow: "rgba(214, 221, 232, 0.18)", edge: "rgba(214, 221, 232, 0.28)", haze: "rgba(111, 146, 196, 0.16)" },
    className: "detail-theme-skyrim",
    kicker: "Vault favorite",
    title: "Frost and iron",
    copy: "Skyrim gets a colder Nordic treatment with pale steel highlights and a deeper mountain-night backdrop.",
  },
];

function cleanNarrativeText(input?: string) {
  const text = (input ?? "").replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();

  if (!text) return "No overview yet.";
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const limited = sentences.slice(0, 2).join(" ");
  const clipped = (limited || text).slice(0, 220).trimEnd();
  return clipped.length < text.length ? `${clipped}...` : clipped;
}

function normalizeCopyFingerprint(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function clampCardBody(input: string, fallback: string) {
  const source = cleanNarrativeText(input) || fallback;
  return source.length > 190 ? `${source.slice(0, 187).trimEnd()}...` : source;
}

function dedupeDeepDiveCards(cards: Array<{ eyebrow: string; title: string; body: string }>, media: MediaItem) {
  const seen = new Set<string>();

  return cards.map((card, index) => {
    const normalized = normalizeCopyFingerprint(card.body);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      return card;
    }

    const fallbackBodies = [
      `${media.year || "Unknown year"} release with ${media.rating.toFixed(1)} / 10 user score and a ${media.type} focus.`,
      `${media.genres.slice(0, 3).join(" • ") || "Genre details still loading"} shape the strongest first impression here.`,
      `${media.details.studio ?? media.credits[0]?.name ?? "The creative team"} is the clearest name tied to how this one lands.`,
    ];

    const replacementBody = fallbackBodies[index] ?? fallbackBodies[fallbackBodies.length - 1];
    seen.add(normalizeCopyFingerprint(replacementBody));
    return {
      ...card,
      body: replacementBody,
    };
  });
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

function normalizeTitleSignal(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s]+/g, " ")
    .replace(/\b(edition|remastered|definitive|complete|collection|season|part|chapter|episode)\b/g, " ")
    .replace(/\b(ii|iii|iv|v|vi|vii|viii|ix|x)\b/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTitleRoots(media: MediaItem) {
  const candidates = [
    media.title,
    media.originalTitle ?? "",
    media.details.collectionTitle ?? "",
  ]
    .map((value) => value.trim())
    .filter(Boolean);
  const roots = new Set<string>();

  for (const candidate of candidates) {
    const normalized = normalizeTitleSignal(candidate);
    if (normalized.length >= 4) {
      roots.add(normalized);
    }

    const beforeSubtitle = normalized.split(/\s+(?:and|the)\s+/).join(" ");
    if (beforeSubtitle.length >= 4) {
      roots.add(beforeSubtitle);
    }

    const prefix = normalized.split(/\s+/).slice(0, 3).join(" ");
    if (prefix.length >= 4) {
      roots.add(prefix);
    }
  }

  return Array.from(roots).slice(0, 4);
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
    { query: "resident evil", matches: ["resident evil", "biohazard", "umbrella", "raccoon city"] },
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

  for (const titleRoot of buildTitleRoots(media)) {
    signals.add(titleRoot);
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

function matchesIdentityCandidate(item: MediaItem, preferredSource?: string, preferredSourceId?: string, preferredType?: string) {
  if (preferredSource && item.source !== preferredSource) return false;
  if (preferredSourceId && item.sourceId !== preferredSourceId) return false;
  if (preferredType && item.type !== preferredType) return false;
  return true;
}

async function findRemoteMediaBySlug(slug: string, preferredSource?: string, preferredType?: string, preferredSourceId?: string) {
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

      const exactIdentityMatch =
        preferredSourceId
          ? matchPool.find((item) => matchesIdentityCandidate(item, preferredSource, preferredSourceId, preferredType))
          : undefined;
      const slugMatch = matchPool.find((item) => matchesSlugCandidate(item, slug));
      const match = exactIdentityMatch ?? slugMatch;

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
  const baseTitleRoots = buildTitleRoots(base);
  const candidateSignals = [
    candidate.title,
    candidate.originalTitle ?? "",
    candidate.details.collectionTitle ?? "",
  ]
    .map((value) => normalizeTitleSignal(value))
    .filter(Boolean);
  const sharesTitleRoot = baseTitleRoots.some((root) => candidateSignals.some((signal) => signal.includes(root) || root.includes(signal)));

  if (candidate.type === base.type) score += 18;
  else score -= 40;
  if (candidate.source === base.source) score += 4;
  score += sharedGenres * 10;
  if (primaryGenre && candidate.genres.includes(primaryGenre)) score += 8;
  if (secondaryGenre && candidate.genres.includes(secondaryGenre)) score += 4;
  if (tertiaryGenre && candidate.genres.includes(tertiaryGenre)) score += 2;
  if (baseStudio && candidateStudio && baseStudio === candidateStudio) score += 12;
  if (sharedCredits) score += sharedCredits * 11;
  if (baseCollection && candidateCollection && (candidateCollection.includes(baseCollection) || baseCollection.includes(candidateCollection))) {
    score += 20;
  }
  if (sharesTitleRoot) score += 42;

  const yearDistance = Math.abs((candidate.year || 0) - (base.year || 0));
  if (yearDistance <= 1) score += 5;
  else if (yearDistance <= 4) score += 2;
  else if (yearDistance >= 15) score -= 4;

  score += Math.max(0, 5 - Math.abs(candidate.rating - base.rating));

  if (sharedGenres === 0 && candidate.type === base.type) {
    score -= 16;
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
  const runtimeRead = media.details.runtime ?? media.details.releaseInfo ?? media.details.platform ?? "Runtime details are still sparse.";
  const scoreRead = `${media.rating.toFixed(1)} / 10`;

  if (media.type === "anime") {
    const animeAudienceLens = getAnimeAudienceLens(media.genres);
    return dedupeDeepDiveCards([
      {
        eyebrow: "Anime lane",
        title: animeAudienceLens.length ? animeAudienceLens.join(" • ") : topGenres,
        body: clampCardBody(balancedOverview, "This anime is still waiting on a cleaner synopsis."),
      },
      {
        eyebrow: "Character pull",
        title: castLead,
        body: clampCardBody(media.credits.length
          ? `${castLead} is the first name to watch here, and ${secondCredit} helps define the tone around them.`
          : "Character data is lighter here, so the genre mix and franchise shape carry more of the appeal.", ""),
      },
      {
        eyebrow: "Arc footprint",
        title: animeFranchise?.seasonCount ? `${animeFranchise.seasonCount} seasons released` : animeFranchise?.entries.length ? `${animeFranchise.entries.length} connected entries` : "Single entry focus",
        body: clampCardBody(animeFranchise?.seasonCount
          ? `This franchise currently reads as ${animeFranchise.seasonCount} main seasons, so the page can point you toward the actual long-form run instead of mixing every side entry together.`
          : animeFranchise?.entries.length
            ? `This franchise spans ${animeFranchise.entries.length} connected entries, which means there is more here than a single season drop.`
          : `This entry is carrying the core pitch right now, with ${runtimeRead.toLowerCase()} and ${scoreRead} helping fill in the quick read.`, ""),
      },
    ], media);
  }

  if (media.type === "game") {
    const genreRead = media.genres[0] ?? topGenres;
    const platformRead = media.details.platform ?? "Platform lineup still coming together";
    const releaseRead = media.details.releaseInfo ?? media.details.status ?? `${media.year || "Unknown"} release`;

    return dedupeDeepDiveCards([
      {
        eyebrow: "Play energy",
        title: topGenres,
        body: clampCardBody(`The hook is ${topGenres.toLowerCase()}, with ${balancedOverview.toLowerCase()}`, ""),
      },
      {
        eyebrow: "How it plays",
        title: genreRead,
        body: clampCardBody(`Built for ${genreRead.toLowerCase()} players, with ${platformRead.toLowerCase()} and ${releaseRead.toLowerCase()} setting the quick expectation.`, ""),
      },
      {
        eyebrow: "Studio signal",
        title: media.details.studio ?? "Unknown studio",
        body: clampCardBody(`${media.details.studio ?? "The studio"} is the clearest creative anchor here, with ${secondCredit} giving the page a second useful production signal.`, ""),
      },
    ], media);
  }

  return dedupeDeepDiveCards([
    {
      eyebrow: "Story hook",
      title: topGenres,
      body: clampCardBody(balancedOverview, "The story summary is still being cleaned up."),
    },
    {
      eyebrow: "Creative signal",
      title: castLead,
      body: clampCardBody(media.credits.length
        ? `${castLead} leads the pull here, with ${secondCredit} helping shape how this one lands.`
        : `${media.details.studio ?? "The production team"} is the clearest creative signal on this title.`, ""),
    },
    {
      eyebrow: "Release read",
      title: `${media.year || "Unknown year"} • ${scoreRead}`,
      body: clampCardBody(`Between ${topGenres.toLowerCase()}, ${runtimeRead.toLowerCase()}, and a ${media.year || "current"} release footprint, this reads like a stronger lean-in watch than background viewing.`, ""),
    },
  ], media);
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

  function createFallbackFrame(index: number) {
    const title = encodeURIComponent(media.title.toUpperCase());
    const genre = encodeURIComponent((media.genres[index % Math.max(1, media.genres.length)] ?? media.type).toUpperCase());
    const hue = (hashPaletteKey(`${media.id}-${index}`) * 13) % 360;
    const secondaryHue = (hue + 46) % 360;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="hsl(${hue} 55% 18%)" />
            <stop offset="100%" stop-color="hsl(${secondaryHue} 62% 9%)" />
          </linearGradient>
          <radialGradient id="glow" cx="0.78" cy="0.18" r="0.72">
            <stop offset="0%" stop-color="hsla(${secondaryHue} 90% 68% / 0.42)" />
            <stop offset="100%" stop-color="hsla(${secondaryHue} 90% 68% / 0)" />
          </radialGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#bg)" />
        <rect width="1600" height="900" fill="url(#glow)" />
        <g opacity="0.14">
          <circle cx="260" cy="180" r="180" fill="white" />
          <circle cx="1370" cy="720" r="230" fill="white" />
        </g>
        <g fill="none" stroke="rgba(255,255,255,0.18)">
          <path d="M0 730 C300 640 520 840 830 710 S1320 520 1600 640" stroke-width="2"/>
          <path d="M0 800 C280 700 560 900 900 780 S1320 580 1600 700" stroke-width="1.5"/>
        </g>
        <text x="92" y="122" fill="rgba(255,255,255,0.7)" font-size="28" font-family="Arial, sans-serif" letter-spacing="8">${genre}</text>
        <text x="92" y="764" fill="white" font-size="120" font-family="Arial Black, Arial, sans-serif">${title}</text>
        <text x="92" y="828" fill="rgba(255,255,255,0.74)" font-size="34" font-family="Arial, sans-serif">Vault still fallback ${index + 1}</text>
      </svg>`,
    )}`;
  }

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

  for (let index = 0; gallery.length < 6 && index < 6; index += 1) {
    push(createFallbackFrame(index));
  }

  return gallery;
}

function buildStoryGallery(gallery: string[], fallback: string) {
  if (!gallery.length) {
    return [fallback];
  }

  return Array.from(new Set([...gallery, fallback].filter(Boolean))).slice(0, 5);
}

function buildAtlasGallery(gallery: string[], usedImages: string[]) {
  const used = new Set(usedImages.map((image) => imageSignature(image)));
  const fresh = gallery.filter((image) => !used.has(imageSignature(image)));

  if (fresh.length >= 4) {
    return fresh;
  }

  return Array.from(new Set([...fresh, ...gallery])).slice(0, 8);
}

function buildImmersionScenes(media: MediaItem, storyGallery: string[], deepDiveCards: ReturnType<typeof buildDeepDiveCards>) {
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

function emptyBrowseResult() {
  return { page: 1, totalPages: 1, totalResults: 0, items: [] as MediaItem[] };
}

async function getFranchiseFallback(media: MediaItem, signals: string[]) {
  if (!signals.length) {
    return [] as MediaItem[];
  }

  const signal = signals[0];

  if (media.type === "anime") {
    const pages = await Promise.all([
      withTimeout(browseJikanAnime({ page: 1, query: signal, sort: "rating", seed: 31 }), emptyBrowseResult(), 1400),
      withTimeout(browseJikanAnime({ page: 2, query: signal, sort: "rating", seed: 32 }), emptyBrowseResult(), 1400),
    ]);
    return dedupeItems(pages.flatMap((page) => page.items));
  }

  if (media.type === "game") {
    const pages = await Promise.all([
      withTimeout(browseIgdbGames({ page: 1, query: signal, sort: "rating", seed: 31 }), emptyBrowseResult(), 1800),
      withTimeout(browseIgdbGames({ page: 2, query: signal, sort: "rating", seed: 32 }), emptyBrowseResult(), 1800),
    ]);
    return dedupeItems(pages.flatMap((page) => page.items));
  }

  const pages = await Promise.all([
    withTimeout(browseTmdbCatalog({ type: media.type, page: 1, query: signal, sort: "rating", seed: 31 }), emptyBrowseResult(), 1400),
    withTimeout(browseTmdbCatalog({ type: media.type, page: 2, query: signal, sort: "rating", seed: 32 }), emptyBrowseResult(), 1400),
  ]);
  return dedupeItems(pages.flatMap((page) => page.items));
}

async function getRelatedMediaRail(media: MediaItem) {
  const primaryGenre = media.genres[0];
  const secondaryGenre = media.genres[1];
  const tertiaryGenre = media.genres[2];
  const franchiseSignals = buildFranchiseSignals(media);
  const collected: MediaItem[] = [];

  if (media.type === "movie" || media.type === "show") {
    const mediaType = media.type;
    const results = await Promise.allSettled([
      withTimeout(
        browseTmdbCatalog({ type: mediaType, page: 1, genre: primaryGenre, sort: "rating" }),
        emptyBrowseResult(),
        700,
      ),
      ...(secondaryGenre
        ? [
            withTimeout(
              browseTmdbCatalog({ type: mediaType, page: 1, genre: secondaryGenre, sort: "discovery", seed: 9 }),
              emptyBrowseResult(),
              650,
            ),
          ]
        : []),
      ...franchiseSignals.slice(0, 1).map((query, index) =>
        withTimeout(
          browseTmdbCatalog({ type: mediaType, page: 1, query, sort: "rating", seed: 13 + index }),
          emptyBrowseResult(),
          650,
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
        emptyBrowseResult(),
        700,
      ),
      ...(secondaryGenre
        ? [
            withTimeout(
              browseJikanAnime({ page: 1, genre: secondaryGenre, sort: "discovery", seed: 9 }),
              emptyBrowseResult(),
              650,
            ),
          ]
        : []),
      ...franchiseSignals.slice(0, 1).map((query, index) =>
        withTimeout(
          browseJikanAnime({ page: 1, query, sort: "rating", seed: 13 + index }),
          emptyBrowseResult(),
          650,
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
        emptyBrowseResult(),
        700,
      ),
      ...(secondaryGenre
        ? [
            withTimeout(
              browseIgdbGames({ page: 1, genre: secondaryGenre, sort: "discovery", seed: 9 }),
              emptyBrowseResult(),
              650,
            ),
          ]
        : []),
      ...(tertiaryGenre
        ? [
            withTimeout(
              browseIgdbGames({ page: 1, genre: tertiaryGenre, sort: "discovery", seed: 11 }),
              emptyBrowseResult(),
              650,
            ),
          ]
        : []),
      ...franchiseSignals.slice(0, 1).map((query, index) =>
        withTimeout(
          browseIgdbGames({ page: 1, query, sort: "rating", seed: 13 + index }),
          emptyBrowseResult(),
          650,
        ),
      ),
    ]);

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        collected.push(...result.value.items);
      }
    });
  }

  const scored = dedupeItems(collected)
    .filter((candidate) => `${candidate.source}-${candidate.sourceId}` !== `${media.source}-${media.sourceId}`)
    .filter((candidate) => candidate.type === media.type)
    .map((candidate) => ({
      candidate,
      score: scoreRelatedCandidate(media, candidate) + (candidateMatchesSignal(candidate, franchiseSignals) ? 18 : 0),
    }));

  const strictMatches = scored
    .filter((entry) => {
      const sharedGenres = entry.candidate.genres.filter((genre) => media.genres.includes(genre)).length;
      return franchiseSignals.length
        ? candidateMatchesSignal(entry.candidate, franchiseSignals) || (entry.score >= 30 && sharedGenres > 0)
        : entry.score >= 18 && sharedGenres > 0;
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.candidate)
    .slice(0, 18);

  if (strictMatches.length) {
    return strictMatches;
  }

  const fallbackMatches = scored
    .filter((entry) => {
      const sharedGenres = entry.candidate.genres.filter((genre) => media.genres.includes(genre)).length;
      return candidateMatchesSignal(entry.candidate, franchiseSignals) || entry.score >= 12 || sharedGenres > 0;
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.candidate)
    .slice(0, 12);

  if (fallbackMatches.length) {
    return fallbackMatches;
  }

  const fallbackGenre = primaryGenre || secondaryGenre || tertiaryGenre || "";
  const franchiseFallback = await getFranchiseFallback(media, franchiseSignals);
  const sourceFallback =
    media.type === "anime"
      ? await withTimeout(
          browseJikanAnime({ page: 1, genre: fallbackGenre, sort: "discovery", seed: 21 }),
          emptyBrowseResult(),
          1200,
        )
      : media.type === "game"
        ? await withTimeout(
            browseIgdbGames({ page: 1, genre: fallbackGenre, sort: "discovery", seed: 21 }),
            emptyBrowseResult(),
            1200,
          )
        : await withTimeout(
            browseTmdbCatalog({ type: media.type, page: 1, genre: fallbackGenre, sort: "discovery", seed: 21 }),
            emptyBrowseResult(),
            1200,
          );

  return dedupeItems([...franchiseFallback, ...sourceFallback.items])
    .filter((candidate) => `${candidate.source}-${candidate.sourceId}` !== `${media.source}-${media.sourceId}`)
    .slice(0, 12);
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
      const resolved = await findRemoteMediaBySlug(slug, source, type, sourceId);
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
  const storyGallery = buildStoryGallery(gallery, media.backdropUrl || media.coverUrl);
  const moodLine = buildMoodLine(media);
  const immersionScenes = buildImmersionScenes(media, storyGallery, deepDiveCards);
  const atlasGallery = buildAtlasGallery(gallery, storyGallery);
  const showAtlas = atlasGallery.length >= 4;
  const detailIdentity = normalizeTitleSignal([media.title, media.originalTitle ?? "", media.details.collectionTitle ?? ""].join(" "));
  const easterEgg = DETAIL_EASTER_EGGS.find((entry) => entry.matches.some((match) => detailIdentity.includes(normalizeTitleSignal(match))));
  const palette = easterEgg?.palette ?? DETAIL_PALETTES[hashPaletteKey(`${media.id}-${media.title}`) % DETAIL_PALETTES.length];
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

        <main className={`workspace detail-layout ${easterEgg?.className ?? ""}`} style={detailPaletteStyle}>
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
                  {easterEgg ? (
                    <div className="detail-favorite-note glass">
                      <p className="eyebrow">{easterEgg.kicker}</p>
                      <h2 className="headline detail-favorite-title">{easterEgg.title}</h2>
                      <p className="copy">{easterEgg.copy}</p>
                    </div>
                  ) : null}
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
                <h2 className="headline">A quick visual read of the world and tone</h2>
                <p className="copy" style={{ maxWidth: 700, marginTop: 10 }}>
                  Key stills and scene beats make it easier to judge the look, mood, and scale before you commit.
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

            {showAtlas ? <DetailGallery title={media.title} images={atlasGallery} /> : null}
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
