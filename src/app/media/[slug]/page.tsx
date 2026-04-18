import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { BrowseResetLink } from "@/components/browse-reset-link";
import { CatalogCard } from "@/components/catalog-card";
import { DetailBackButton } from "@/components/detail-back-button";
import { DetailGallery } from "@/components/detail-gallery";
import { DetailViewEffects } from "@/components/detail-view-effects";
import { FranchiseRelatedSection } from "@/components/franchise-related-section";
import { MediaActions } from "@/components/media-actions";
import { RelatedMediaSection } from "@/components/related-media-section";
import { ResilientMediaImage } from "@/components/resilient-media-image";
import { auth } from "@/lib/auth";
import { optimizeMediaImageUrl } from "@/lib/media-image";
import { getMediaBySlug, mockCatalog } from "@/lib/mock-catalog";
import { browseIgdbGames, getIgdbGameDetails } from "@/lib/sources/igdb";
import { browseJikanAnime, getJikanAnimeDetails, getJikanAnimeFranchise } from "@/lib/sources/jikan";
import { browseTmdbCatalog, getTmdbMediaDetails, getTmdbStarterCatalog } from "@/lib/sources/tmdb";
import { MediaItem } from "@/lib/types";

type AnimeFranchiseData =
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
      movieEntries?: Array<{
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

type FranchiseSectionData = {
  title: string;
  summary: string;
  entries: Array<{
    id: string;
    title: string;
    meta: string;
    href: {
      pathname: string;
      query: {
        source: string;
        sourceId: string;
        type: string;
      };
    };
    badge?: string;
    isActive?: boolean;
  }>;
  secondaryTitle?: string;
  secondaryEntries?: Array<{
    id: string;
    title: string;
    meta: string;
    href: {
      pathname: string;
      query: {
        source: string;
        sourceId: string;
        type: string;
      };
    };
    badge?: string;
    isActive?: boolean;
  }>;
};

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

    const shortPrefix = normalized.split(/\s+/).slice(0, 2).join(" ");
    if (shortPrefix.length >= 4) {
      roots.add(shortPrefix);
    }
  }

  return Array.from(roots).slice(0, 6);
}

const FRANCHISE_SIGNAL_RULES: Array<{ signal: string; matches: string[] }> = [
  { signal: "game of thrones", matches: ["game of thrones", "house of the dragon", "westeros", "targaryen", "iron throne", "seven kingdoms"] },
  { signal: "daredevil", matches: ["daredevil", "matt murdock", "born again", "hell s kitchen", "wilson fisk", "kingpin"] },
  { signal: "star wars", matches: ["star wars", "jedi", "sith", "lightsaber", "galaxy far far away", "lucasfilm", "mandalorian", "thrawn", "ahsoka"] },
  { signal: "red dead", matches: ["red dead", "rockstar games", "outlaw", "frontier"] },
  { signal: "grand theft auto", matches: ["grand theft auto", "gta", "vice city", "san andreas", "los santos"] },
  { signal: "lord of the rings", matches: ["middle earth", "lord of the rings", "tolkien", "gondor", "rohan"] },
  { signal: "harry potter", matches: ["hogwarts", "wizarding world", "harry potter", "fantastic beasts"] },
  { signal: "pokemon", matches: ["pokemon", "pok mon", "pikachu", "ash ketchum"] },
  { signal: "dragon ball", matches: ["dragon ball", "saiyan", "kamehameha"] },
  { signal: "naruto", matches: ["naruto", "shinobi", "hokage", "konoha"] },
  { signal: "resident evil", matches: ["resident evil", "biohazard", "umbrella", "raccoon city"] },
  { signal: "zelda", matches: ["hyrule", "zelda", "link", "master sword"] },
  { signal: "mario", matches: ["mario", "bowser", "mushroom kingdom", "princess peach"] },
  { signal: "batman arkham", matches: ["batman arkham", "arkham asylum", "arkham city", "arkham knight", "arkham origins", "rocksteady", "gotham"] },
  { signal: "spider man", matches: ["spider man", "spider-man", "peter parker", "miles morales", "insomniac games", "marvel s spider man"] },
];

const TOPIC_STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "amid",
  "among",
  "before",
  "between",
  "from",
  "have",
  "into",
  "like",
  "make",
  "over",
  "that",
  "their",
  "them",
  "then",
  "they",
  "this",
  "through",
  "under",
  "when",
  "with",
  "without",
  "your",
]);

const SIMILARITY_THEME_RULES: Array<{ tag: string; matches: string[] }> = [
  { tag: "medieval", matches: ["medieval", "kingdom", "throne", "castle", "dragon", "sword", "feudal", "westeros"] },
  { tag: "political", matches: ["political", "dynasty", "court", "alliance", "succession", "betrayal"] },
  { tag: "space", matches: ["space", "galaxy", "planet", "starship", "orbital", "cosmic", "astronaut"] },
  { tag: "cyberpunk", matches: ["cyberpunk", "neon", "android", "ai", "megacity", "hacker"] },
  { tag: "post-apocalypse", matches: ["post apocalyptic", "wasteland", "ruins", "survival", "infected", "collapse"] },
  { tag: "supernatural", matches: ["supernatural", "ghost", "curse", "occult", "spirit", "demon"] },
  { tag: "school-life", matches: ["school", "academy", "classroom", "student council", "high school"] },
  { tag: "psychological", matches: ["psychological", "mind game", "trauma", "identity", "obsession"] },
  { tag: "indie", matches: ["indie", "independent", "solo developer", "small studio"] },
  { tag: "metroidvania", matches: ["metroidvania", "platformer", "side scrolling", "ability gated", "interconnected world"] },
  { tag: "soulslike", matches: ["soulslike", "punishing", "boss rush", "stamina", "dark fantasy"] },
  { tag: "cozy", matches: ["cozy", "slice of life", "gentle", "comfort", "wholesome"] },
  { tag: "tactical-shooter", matches: ["tactical shooter", "tactical", "5v5", "defuse", "precise gunplay", "round based"] },
  { tag: "hero-shooter", matches: ["hero shooter", "agents", "heroes", "abilities", "ability based", "operator abilities"] },
  { tag: "competitive-pvp", matches: ["competitive", "ranked", "esports", "pvp", "versus", "multiplayer"] },
  { tag: "team-shooter", matches: ["team based", "squad", "objective based", "attackers", "defenders"] },
  { tag: "superhero", matches: ["superhero", "comic book", "vigilante", "cape", "masked hero", "dc comics", "marvel"] },
  { tag: "detective", matches: ["detective", "investigation", "forensics", "crime solving", "world s greatest detective"] },
  { tag: "stealth-action", matches: ["stealth", "predator encounters", "silent takedowns", "gadget driven", "counter combat"] },
  { tag: "open-world-action", matches: ["open world", "free roam", "city traversal", "sandbox action", "open city"] },
];

function dedupeSpotlightCredits(credits: MediaItem["credits"]) {
  const seen = new Set<string>();

  return credits.filter((credit) => {
    const key = credit.name.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildFranchiseSignals(media: MediaItem) {
  const haystack = normalizeTitleSignal(
    [
      media.title,
      media.originalTitle ?? "",
      media.details.collectionTitle ?? "",
      media.details.studio ?? "",
      media.overview,
    ].join(" "),
  );

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

  signals.delete("marvel");
  signals.delete("dc");

  for (const entry of FRANCHISE_SIGNAL_RULES) {
    if (entry.matches.some((match) => haystack.includes(normalizeTitleSignal(match)))) {
      signals.add(entry.signal);
    }
  }

  const cleanedTitle = normalizeTitleSignal(media.title);
  if (cleanedTitle.includes(":")) {
    signals.add(cleanedTitle.split(":")[0].trim());
  }

  for (const titleRoot of buildTitleRoots(media)) {
    signals.add(titleRoot);
  }

  return Array.from(signals).filter((signal) => signal.length >= 3).slice(0, 3);
}

function buildTopicTokens(media: MediaItem) {
  const text = normalizeTitleSignal(
    [
      media.title,
      media.originalTitle ?? "",
      media.overview,
      media.details.collectionTitle ?? "",
      media.details.studio ?? "",
      media.genres.join(" "),
    ].join(" "),
  );

  return new Set(
    text
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 4 && !TOPIC_STOP_WORDS.has(token)),
  );
}

function sharedTopicTokenCount(base: MediaItem, candidate: MediaItem) {
  const baseTokens = buildTopicTokens(base);
  const candidateTokens = buildTopicTokens(candidate);
  let total = 0;

  for (const token of baseTokens) {
    if (candidateTokens.has(token)) {
      total += 1;
    }
  }

  return total;
}

function isCompatibleSimilarityType(base: MediaItem, candidate: MediaItem) {
  return candidate.type === base.type;
}

function buildSimilarityTags(media: MediaItem) {
  const haystack = normalizeTitleSignal(
    [
      media.title,
      media.originalTitle ?? "",
      media.overview,
      media.details.collectionTitle ?? "",
      media.details.studio ?? "",
      media.genres.join(" "),
    ].join(" "),
  );

  return new Set(
    SIMILARITY_THEME_RULES
      .filter((rule) => rule.matches.some((match) => haystack.includes(normalizeTitleSignal(match))))
      .map((rule) => rule.tag),
  );
}

function sharedSimilarityTagCount(base: MediaItem, candidate: MediaItem) {
  const baseTags = buildSimilarityTags(base);
  const candidateTags = buildSimilarityTags(candidate);
  let total = 0;

  for (const tag of baseTags) {
    if (candidateTags.has(tag)) {
      total += 1;
    }
  }

  return total;
}

function platformTokens(media: MediaItem) {
  return new Set(
    (media.details.platform ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  );
}

function sharedPlatformCount(base: MediaItem, candidate: MediaItem) {
  const basePlatforms = platformTokens(base);
  const candidatePlatforms = platformTokens(candidate);
  let total = 0;

  for (const token of basePlatforms) {
    if (candidatePlatforms.has(token)) {
      total += 1;
    }
  }

  return total;
}

function candidateMatchesSignal(candidate: MediaItem, signals: string[]) {
  if (!signals.length) {
    return false;
  }

  const haystack = normalizeTitleSignal(
    [
      candidate.title,
      candidate.originalTitle ?? "",
      candidate.details.collectionTitle ?? "",
      candidate.details.studio ?? "",
      candidate.overview,
    ].join(" "),
  );

  return signals.some((signal) => {
    const normalizedSignal = normalizeTitleSignal(signal);
    if (!normalizedSignal) return false;
    return haystack.includes(normalizedSignal);
  });
}

function normalizeComparableFranchiseTitle(title: string, type: MediaItem["type"]) {
  return normalizeTitleSignal(title)
    .replace(/\b(documentary|behind the scenes|making of|fan film|discussion|interview|recap|special|short)\b/g, " ")
    .replace(type === "game" ? /\b(remaster(?:ed)?|definitive|deluxe|complete|game of the year|goty|hd|ultimate|collector s|anniversary|director s cut)\b/g : /$^/, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSupplementalFranchiseCandidate(base: MediaItem, candidate: MediaItem) {
  if (candidate.type !== base.type) {
    return true;
  }

  const title = `${candidate.title} ${candidate.originalTitle ?? ""}`.toLowerCase();
  const overview = candidate.overview.toLowerCase();
  const bannedGenres = new Set(["Documentary", "News", "Talk", "Reality", "Soap"]);

  if (candidate.genres.some((genre) => bannedGenres.has(genre))) {
    return true;
  }

  if (base.type === "anime") {
    return /\b(ova|ona|special|recap|compilation|picture drama|music video|live action)\b/i.test(title);
  }

  if (base.type === "movie" || base.type === "show") {
    return /\b(documentary|behind the scenes|making of|fan film|discussion|interview|recap|short|special)\b/i.test(
      `${title} ${overview}`,
    );
  }

  if (base.type === "game") {
    return /\b(demo|soundtrack|art book|expansion pass)\b/i.test(title);
  }

  return false;
}

function hasStrongFranchiseConnection(base: MediaItem, candidate: MediaItem, signals: string[]) {
  const baseRoots = buildTitleRoots(base);
  const candidateRoots = buildTitleRoots(candidate);
  const comparableBase = normalizeComparableFranchiseTitle(base.details.collectionTitle ?? base.title, base.type);
  const comparableCandidate = normalizeComparableFranchiseTitle(
    candidate.details.collectionTitle ?? candidate.title,
    candidate.type,
  );
  const sharesTitleRoot = baseRoots.some((root) =>
    candidateRoots.some((candidateRoot) => candidateRoot.includes(root) || root.includes(candidateRoot)),
  );

  if (sharesTitleRoot) {
    return true;
  }

  if (
    comparableBase &&
    comparableCandidate &&
    (comparableCandidate.includes(comparableBase) || comparableBase.includes(comparableCandidate))
  ) {
    return true;
  }

  return candidateMatchesSignal(candidate, signals);
}

function isExplicitSequelTitle(base: MediaItem, candidate: MediaItem) {
  const baseRoot = normalizeComparableFranchiseTitle(base.details.collectionTitle ?? base.title, base.type);
  const candidateRoot = normalizeComparableFranchiseTitle(candidate.title, candidate.type);

  if (!baseRoot || !candidateRoot || !candidateRoot.includes(baseRoot)) {
    return false;
  }

  return (
    /\b(2|ii|iii|iv|v|vi|vii|viii|ix|x)\b/i.test(candidate.title) ||
    /\b(born again|returns|resurrection|reborn|next generations|rise|chapter|season|part)\b/i.test(candidate.title)
  );
}

function dedupeComparableEntries(items: MediaItem[]) {
  const bestByKey = new Map<string, MediaItem>();

  for (const item of items) {
    const key = normalizeComparableFranchiseTitle(item.details.collectionTitle ?? item.title, item.type) || item.id;
    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, item);
      continue;
    }

    const shouldReplace =
      item.year < existing.year ||
      (item.year === existing.year && item.rating > existing.rating) ||
      (!existing.year && Boolean(item.year));

    if (shouldReplace) {
      bestByKey.set(key, item);
    }
  }

  return Array.from(bestByKey.values());
}

function slugifyRouteValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseRomanNumeral(value: string) {
  const numerals: Record<string, number> = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
    vii: 7,
    viii: 8,
    ix: 9,
    x: 10,
  };

  return numerals[value.toLowerCase()] ?? null;
}

function parseInstallmentOrder(title: string) {
  const lowered = title.toLowerCase();
  const directMatch = lowered.match(/\b(season|part|chapter|episode|book|volume|act)\s+(\d+|i{1,3}|iv|v|vi{0,3}|ix|x)\b/i);
  if (directMatch) {
    const rawValue = directMatch[2];
    const parsed = Number(rawValue) || parseRomanNumeral(rawValue);
    if (parsed) return parsed;
  }

  const trailingMatch = lowered.match(/\b(\d+|ii|iii|iv|v|vi|vii|viii|ix|x)\b\s*$/i);
  if (trailingMatch) {
    const rawValue = trailingMatch[1];
    const parsed = Number(rawValue) || parseRomanNumeral(rawValue);
    if (parsed && parsed <= 12) return parsed;
  }

  const compactMatch = lowered.match(/([a-z]{2,})(\d{1,2})$/i);
  if (compactMatch) {
    const parsed = Number(compactMatch[2]);
    if (parsed && parsed <= 12) return parsed;
  }

  return null;
}

function buildFranchiseBadge(title: string, order: number | null) {
  if (!order) return undefined;
  const lowered = title.toLowerCase();
  if (lowered.includes("season")) return `Season ${order}`;
  if (lowered.includes("part")) return `Part ${order}`;
  if (lowered.includes("chapter")) return `Chapter ${order}`;
  if (lowered.includes("episode")) return `Episode ${order}`;
  return `Entry ${order}`;
}

function buildMediaHref(item: Pick<MediaItem, "slug" | "source" | "sourceId" | "type">) {
  return {
    pathname: `/media/${item.slug}`,
    query: {
      source: item.source,
      sourceId: item.sourceId,
      type: item.type,
    },
  } as const;
}

function buildFranchiseSummary(collectionName: string, activeIndex: number, totalEntries: number) {
  const position = activeIndex + 1;
  if (position <= 1) {
    return `${collectionName} starts here in this vault run. Everything below is lined up in watch or play order so you can move through the franchise cleanly.`;
  }

  return `This entry sits at #${position} in ${collectionName}. The full run is lined up below so you can jump back to what came before or continue forward without guessing the order.`;
}

function rankFranchiseCandidate(base: MediaItem, candidate: MediaItem, signals: string[]) {
  const titleRoots = buildTitleRoots(base);
  const candidateRoots = [
    candidate.title,
    candidate.originalTitle ?? "",
    candidate.details.collectionTitle ?? "",
  ]
    .map((value) => normalizeTitleSignal(value))
    .filter(Boolean);
  const sharesTitleRoot = titleRoots.some((root) => candidateRoots.some((candidateRoot) => candidateRoot.includes(root) || root.includes(candidateRoot)));

  return scoreRelatedCandidate(base, candidate)
    + (candidateMatchesSignal(candidate, signals) ? 28 : 0)
    + (sharesTitleRoot ? 34 : 0)
    + (parseInstallmentOrder(candidate.title) ? 8 : 0);
}

async function buildFranchiseSection(media: MediaItem, animeFranchise?: AnimeFranchiseData): Promise<FranchiseSectionData | null> {
  if (media.type === "anime" && animeFranchise && (animeFranchise.seasonEntries?.length || animeFranchise.entries.length > 1)) {
    const sourceEntries = animeFranchise.seasonEntries?.length ? animeFranchise.seasonEntries : animeFranchise.entries;
    const mappedEntries = sourceEntries.map((entry) => ({
      id: `jikan-${entry.id}`,
      title: entry.title,
      meta: [entry.year || "Year TBD", entry.rating ? `${entry.rating.toFixed(1)} / 10` : "Unrated", entry.episodes ? `${entry.episodes} episodes` : entry.status ?? "Unknown"].filter(Boolean).join(" / "),
      href: {
        pathname: `/media/${slugifyRouteValue(entry.title)}`,
        query: {
          source: "jikan",
          sourceId: String(entry.id),
          type: "anime",
        },
      },
      badge: buildFranchiseBadge(entry.title, parseInstallmentOrder(entry.title)),
      isActive: String(entry.id) === media.sourceId,
    }));
    const mappedMovies = (animeFranchise.movieEntries ?? []).map((entry) => ({
      id: `jikan-${entry.id}`,
      title: entry.title,
      meta: [entry.year || "Year TBD", entry.rating ? `${entry.rating.toFixed(1)} / 10` : "Unrated", entry.status ?? "Movie"].filter(Boolean).join(" / "),
      href: {
        pathname: `/media/${slugifyRouteValue(entry.title)}`,
        query: {
          source: "jikan",
          sourceId: String(entry.id),
          type: "anime",
        },
      },
      badge: "Movie",
      isActive: String(entry.id) === media.sourceId,
    }));
    const activeIndex = Math.max(0, mappedEntries.findIndex((entry) => entry.isActive));

    return {
      title: animeFranchise.title,
      summary: buildFranchiseSummary(animeFranchise.title, activeIndex, mappedEntries.length),
      entries: mappedEntries,
      secondaryTitle: mappedMovies.length ? `${animeFranchise.title} movies` : undefined,
      secondaryEntries: mappedMovies,
    };
  }

  const signals = buildFranchiseSignals(media);
  const pooled = await getFranchiseFallback(media, signals);
  const candidates = dedupeComparableEntries(dedupeItems([media, ...pooled]))
    .filter((candidate) => candidate.type === media.type)
    .filter((candidate) => !isSupplementalFranchiseCandidate(media, candidate))
    .map((candidate) => ({
      candidate,
      score: rankFranchiseCandidate(media, candidate, signals),
    }))
    .filter((entry) => {
      if (entry.candidate.id === media.id) {
        return true;
      }

      if (media.type === "game") {
        return (
          (entry.score >= 44 || isExplicitSequelTitle(media, entry.candidate) || candidateMatchesSignal(entry.candidate, signals)) &&
          hasStrongFranchiseConnection(media, entry.candidate, signals)
        );
      }

      return (
        (entry.score >= 58 || isExplicitSequelTitle(media, entry.candidate)) &&
        hasStrongFranchiseConnection(media, entry.candidate, signals)
      );
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.candidate);

  if (candidates.length < 2) {
    return null;
  }

  const ordered = [...candidates].sort((left, right) => {
    const leftOrder = parseInstallmentOrder(left.title);
    const rightOrder = parseInstallmentOrder(right.title);
    const yearGap = (left.year || Number.MAX_SAFE_INTEGER) - (right.year || Number.MAX_SAFE_INTEGER);
    if (yearGap !== 0) {
      return yearGap;
    }
    if (leftOrder !== null || rightOrder !== null) {
      return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER);
    }
    return left.title.localeCompare(right.title);
  });

  const activeIndex = Math.max(0, ordered.findIndex((candidate) => candidate.id === media.id));
  const collectionTitle = media.details.collectionTitle ?? signals[0] ?? media.title;

  return {
    title: collectionTitle.replace(/\b\w/g, (char) => char.toUpperCase()),
    summary: buildFranchiseSummary(collectionTitle, activeIndex, ordered.length),
    entries: ordered.map((entry) => ({
      id: entry.id,
      title: entry.title,
      meta: [entry.year || "Year TBD", `${entry.rating.toFixed(1)} / 10`, entry.details.entryLabel ?? entry.details.releaseInfo ?? entry.details.runtime ?? entry.details.platform ?? entry.details.status ?? "Entry"].filter(Boolean).join(" / "),
      href: buildMediaHref(entry),
      badge: buildFranchiseBadge(entry.title, parseInstallmentOrder(entry.title)),
      isActive: entry.id === media.id,
    })),
  };
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

function scoreMoreLikeThisCandidate(base: MediaItem, candidate: MediaItem) {
  if (candidate.type !== base.type) {
    return -100;
  }

  let score = 0;
  const sharedGenres = candidate.genres.filter((genre) => base.genres.includes(genre)).length;
  const sharedTopics = sharedTopicTokenCount(base, candidate);
  const sharedTags = sharedSimilarityTagCount(base, candidate);
  const sharedPlatforms = sharedPlatformCount(base, candidate);
  const sharedCredits = candidate.credits.filter((credit) =>
    base.credits.some((baseCredit) => baseCredit.name.trim().toLowerCase() === credit.name.trim().toLowerCase()),
  ).length;
  const yearDistance = Math.abs((candidate.year || 0) - (base.year || 0));

  score += 22;
  score += sharedGenres * 14;
  score += sharedTags * 16;
  score += Math.min(sharedTopics, 4) * 5;
  score += Math.min(sharedPlatforms, 3) * (base.type === "game" ? 6 : 2);
  score += sharedCredits * 6;

  if (base.details.studio && candidate.details.studio && base.details.studio === candidate.details.studio) {
    score += 8;
  }

  if (yearDistance <= 3) score += 6;
  else if (yearDistance <= 8) score += 3;

  score += Math.max(0, 4 - Math.abs(candidate.rating - base.rating));

  if (sharedGenres === 0) {
    score -= 28;
  }

  if (sharedTags === 0) {
    score -= base.type === "game" ? 12 : 20;
  }

  if (sharedGenres === 1 && sharedTags === 0 && sharedTopics < 2) {
    score -= 18;
  }

  if (base.type === "game" && sharedPlatforms === 0) {
    score -= 6;
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
  const topGenres = media.genres.slice(0, 3).join(" / ") || "Genre blend still loading";
  const balancedOverview = cleanNarrativeText(media.overview);
  const runtimeRead = media.details.runtime ?? media.details.releaseInfo ?? media.details.platform ?? "Unknown";
  const studioRead = media.details.studio ?? media.credits[0]?.name ?? "Unknown";
  const footprintRead =
    media.type === "anime"
      ? animeFranchise?.seasonCount
        ? `${animeFranchise.seasonCount} seasons`
        : animeFranchise?.entries.length
          ? `${animeFranchise.entries.length} connected entries`
          : "Single entry"
      : media.details.collectionTitle ?? "Standalone title";

  return dedupeDeepDiveCards([
    {
      eyebrow: "Genre mix",
      title: topGenres,
      body: clampCardBody(balancedOverview, "The summary is still being cleaned up."),
    },
    {
      eyebrow: media.type === "game" ? "Studio / publisher" : "Studio / network",
      title: studioRead,
      body: clampCardBody(`${studioRead} is the clearest production credit attached to this title right now.`, ""),
    },
    {
      eyebrow: media.type === "anime" ? "Series footprint" : "Release read",
      title: media.type === "anime" ? footprintRead : `${media.year || "Unknown year"} / ${media.rating.toFixed(1)} / 10`,
      body: clampCardBody(
        media.type === "anime"
          ? `${footprintRead} currently surfaced for this title, with ${runtimeRead.toLowerCase()} as the quickest format read.`
          : `${runtimeRead} and ${footprintRead.toLowerCase()} are the quickest reliable signals on this page.`,
        "",
      ),
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
    const targetUrl = nested ? new URL(nested, "https://dummy.local") : parsed;
    const targetPath = targetUrl.pathname;
    const parts = targetPath.split("/").filter(Boolean);
    const fileName = parts[parts.length - 1] || targetPath;

    return fileName
      .toLowerCase()
      .replace(/\.(jpg|jpeg|png|webp)$/i, "")
      .replace(/\?.*$/, "")
      .replace(/image\/upload\/[^/]+\//i, "")
      .replace(/[-_](original|large|medium|small|thumb|t\d+x\d+|v\d+)$/i, "")
      .replace(/[_-]\d{2,4}x\d{2,4}$/i, "")
      .replace(/[_-](w|h)\d{2,4}$/i, "")
      .replace(/[_-](crop|fit|fill)$/i, "");
  } catch {
    return image.toLowerCase();
  }
}

function dedupeByImageSignature(images: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const image of images) {
    const signature = imageSignature(image);
    if (!signature || seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push(image);
  }

  return deduped;
}

function uniqueGalleryImages(media: MediaItem) {
  const seen = new Set<string>();
  const gallery: string[] = [];

  function push(image?: string) {
    if (!image || image.startsWith("data:image")) return;
    const signature = imageSignature(image);
    if (!signature || seen.has(signature)) return;
    seen.add(signature);
    gallery.push(image);
  }

  for (const image of media.screenshots ?? []) {
    push(image);
  }

  return gallery;
}

function buildStoryGallery(gallery: string[], fallback: string) {
  if (!gallery.length) {
    return [fallback];
  }

  return dedupeByImageSignature([...gallery, fallback].filter(Boolean)).slice(0, 5);
}

function buildAtlasGallery(gallery: string[], usedImages: string[]) {
  const used = new Set(usedImages.map((image) => imageSignature(image)));
  const fresh = gallery.filter((image) => !used.has(imageSignature(image)));

  if (fresh.length >= 3) {
    return dedupeByImageSignature(fresh);
  }

  return dedupeByImageSignature([...fresh, ...gallery]).slice(0, 6);
}

function buildImmersionScenes(media: MediaItem, storyGallery: string[], deepDiveCards: ReturnType<typeof buildDeepDiveCards>) {
  const genreBlend = media.genres.slice(0, 3).join(" / ") || "Atmosphere-first";
  const factualCards = [
    {
      eyebrow: "Overview",
      title: `${media.year || "Unknown year"} / ${genreBlend}`,
      body: cleanNarrativeText(media.overview),
    },
    ...deepDiveCards,
  ].slice(0, Math.min(3, storyGallery.length));

  return factualCards
    .map((card, index) => ({
      eyebrow: card.eyebrow,
      title: card.title,
      body: card.body,
      image: storyGallery[index],
    }))
    .filter((scene) => Boolean(scene.image));
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
    const backupSignal = signals[1];

    if (media.type === "anime") {
      const pages = await Promise.all([
        withTimeout(browseJikanAnime({ page: 1, query: signal, sort: "rating", seed: 31 }).catch(() => emptyBrowseResult()), emptyBrowseResult(), 1400),
        withTimeout(browseJikanAnime({ page: 2, query: signal, sort: "rating", seed: 32 }).catch(() => emptyBrowseResult()), emptyBrowseResult(), 1400),
        ...(backupSignal
          ? [withTimeout(browseJikanAnime({ page: 1, query: backupSignal, sort: "newest", seed: 33 }).catch(() => emptyBrowseResult()), emptyBrowseResult(), 1400)]
          : []),
      ]);
      return dedupeItems(pages.flatMap((page) => page.items));
    }

  if (media.type === "game") {
      const gameQueries = Array.from(
        new Set([
          signal,
          backupSignal,
          ...buildQueryVariants(media.title),
          ...buildTitleRoots(media),
        ].filter(Boolean)),
      ).slice(0, 5);

      const pages = await Promise.all(
        gameQueries.flatMap((query, index) => [
          withTimeout(
            browseIgdbGames({ page: 1, query, sort: "rating", seed: 31 + index }).catch(() => emptyBrowseResult()),
            emptyBrowseResult(),
            1800,
          ),
          ...(index < 2
            ? [
                withTimeout(
                  browseIgdbGames({ page: 2, query, sort: "rating", seed: 41 + index }).catch(() => emptyBrowseResult()),
                  emptyBrowseResult(),
                  1800,
                ),
              ]
            : []),
        ]),
      );
      return dedupeItems(pages.flatMap((page) => page.items));
    }

    const pages = await Promise.all([
      withTimeout(browseTmdbCatalog({ type: media.type, page: 1, query: signal, sort: "rating", seed: 31 }).catch(() => emptyBrowseResult()), emptyBrowseResult(), 1400),
      withTimeout(browseTmdbCatalog({ type: media.type, page: 2, query: signal, sort: "rating", seed: 32 }).catch(() => emptyBrowseResult()), emptyBrowseResult(), 1400),
      withTimeout(browseTmdbCatalog({ type: media.type, page: 1, query: signal, sort: "newest", seed: 34 }).catch(() => emptyBrowseResult()), emptyBrowseResult(), 1400),
      ...(backupSignal
        ? [withTimeout(browseTmdbCatalog({ type: media.type, page: 1, query: backupSignal, sort: "newest", seed: 35 }).catch(() => emptyBrowseResult()), emptyBrowseResult(), 1400)]
        : []),
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
    const results = await Promise.allSettled(
      [media.type].flatMap((mediaType, mediaTypeIndex) => [
        withTimeout(
          browseTmdbCatalog({ type: mediaType, page: 1, genre: primaryGenre, sort: "rating", seed: 5 + mediaTypeIndex }),
          emptyBrowseResult(),
          700,
        ),
        ...(secondaryGenre
          ? [
              withTimeout(
                browseTmdbCatalog({ type: mediaType, page: 1, genre: secondaryGenre, sort: "discovery", seed: 9 + mediaTypeIndex }),
                emptyBrowseResult(),
                650,
              ),
            ]
          : []),
        ...franchiseSignals.slice(0, 1).map((query, index) =>
          withTimeout(
            browseTmdbCatalog({ type: mediaType, page: 1, query, sort: "rating", seed: 13 + mediaTypeIndex + index }),
            emptyBrowseResult(),
            650,
          ),
        ),
      ]),
    );

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
      withTimeout(
        browseIgdbGames({ page: 2, genre: primaryGenre, sort: "discovery", seed: 7 }),
        emptyBrowseResult(),
        700,
      ),
      withTimeout(
        browseIgdbGames({ page: 3, genre: primaryGenre, sort: "discovery", seed: 8 }),
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
            withTimeout(
              browseIgdbGames({ page: 2, genre: secondaryGenre, sort: "discovery", seed: 10 }),
              emptyBrowseResult(),
              650,
            ),
            withTimeout(
              browseIgdbGames({ page: 3, genre: secondaryGenre, sort: "discovery", seed: 12 }),
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
      withTimeout(
        browseIgdbGames({ page: 1, sort: "discovery", seed: 15 }),
        emptyBrowseResult(),
        700,
      ),
      withTimeout(
        browseIgdbGames({ page: 2, sort: "discovery", seed: 16 }),
        emptyBrowseResult(),
        700,
      ),
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
    .filter((candidate) => isCompatibleSimilarityType(media, candidate))
    .filter((candidate) => !isSupplementalFranchiseCandidate(media, candidate))
    .filter((candidate) => !hasStrongFranchiseConnection(media, candidate, franchiseSignals))
    .map((candidate) => ({
      candidate,
      score: scoreMoreLikeThisCandidate(media, candidate),
    }));

  const strictMatches = scored
    .filter((entry) => {
      const sharedGenres = entry.candidate.genres.filter((genre) => media.genres.includes(genre)).length;
      const sharedTopics = sharedTopicTokenCount(media, entry.candidate);
      const sharedTags = sharedSimilarityTagCount(media, entry.candidate);
      const sharedPlatforms = sharedPlatformCount(media, entry.candidate);
      if (media.type === "game") {
        return entry.score >= 22 && (sharedGenres >= 1 || sharedTags >= 1 || sharedPlatforms >= 1 || sharedTopics >= 2);
      }
      return entry.score >= 34 && (sharedGenres >= 2 || (sharedGenres >= 1 && sharedTags >= 1) || sharedTags >= 2 || sharedTopics >= 3);
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.candidate)
    .slice(0, media.type === "game" ? 10 : 8);

  if (strictMatches.length) {
    return dedupeComparableEntries(strictMatches);
  }

  const fallbackMatches = scored
    .filter((entry) => {
      const sharedGenres = entry.candidate.genres.filter((genre) => media.genres.includes(genre)).length;
      const sharedTags = sharedSimilarityTagCount(media, entry.candidate);
      const sharedPlatforms = sharedPlatformCount(media, entry.candidate);
      if (media.type === "game") {
        return entry.score >= 16 && (sharedGenres >= 1 || sharedTags >= 1 || sharedPlatforms >= 1);
      }
      return entry.score >= 28 && (sharedGenres >= 1 || sharedTags >= 1);
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.candidate)
    .slice(0, media.type === "game" ? 8 : 6);

  return dedupeComparableEntries(fallbackMatches);
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
  let animeFranchise: AnimeFranchiseData;

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

  const related = await getRelatedMediaRail(media).catch(() => []);
  const franchiseSection = await buildFranchiseSection(media, animeFranchise).catch(() => null);
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
  const spotlightCredits = dedupeSpotlightCredits(media.credits).slice(0, 6);
  const gallery = uniqueGalleryImages(media).slice(0, 6);
  const storyGallery = buildStoryGallery(gallery, media.backdropUrl || media.coverUrl);
  const moodLine = buildMoodLine(media);
  const immersionScenes = buildImmersionScenes(media, storyGallery, deepDiveCards);
  const atlasGallery = buildAtlasGallery(gallery, storyGallery);
  const showAtlas = atlasGallery.length >= 3;
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
              <img
                src={optimizeMediaImageUrl(media.backdropUrl || media.coverUrl, "backdrop") ?? (media.backdropUrl || media.coverUrl)}
                alt={`${media.title} backdrop`}
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
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
                <p className="eyebrow">Visuals</p>
                <h2 className="headline">Real stills and quick facts</h2>
                <p className="copy" style={{ maxWidth: 700, marginTop: 10 }}>
                  This section now sticks to actual images we have for the title instead of dressing weak data up as something it is not.
                </p>
              </div>
            </div>

            <div className="detail-story-rail">
              {immersionScenes.map((scene, index) => (
                <article key={`${scene.title}-${index}`} className={`detail-story-panel ${index % 2 === 1 ? "is-reversed" : ""}`}>
                  <div className="detail-story-image-shell glass">
                    <img
                      src={optimizeMediaImageUrl(scene.image, index === 0 ? "backdrop" : "gallery") ?? scene.image}
                      alt={`${media.title} scene ${index + 1}`}
                      loading={index === 0 ? "eager" : "lazy"}
                      decoding="async"
                    />
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
              <DetailGallery title={media.title} images={atlasGallery} />
            ) : (
              <div className="folder-empty glass">
                <p className="headline">Not enough distinct stills yet.</p>
                <p className="copy">This title only has one or two usable images right now, so the extra stills panel stays hidden until we have a proper set.</p>
              </div>
            )}
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

          {franchiseSection ? (
            <FranchiseRelatedSection
              title={franchiseSection.title}
              summary={franchiseSection.summary}
              entries={franchiseSection.entries}
              secondaryTitle={franchiseSection.secondaryTitle}
              secondaryEntries={franchiseSection.secondaryEntries}
            />
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
