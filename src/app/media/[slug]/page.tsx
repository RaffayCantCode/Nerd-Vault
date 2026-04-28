import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { BrowseResetLink } from "@/components/browse-reset-link";
import { DetailBackButton } from "@/components/detail-back-button";
import { DetailGallery } from "@/components/detail-gallery";
import { DetailViewEffects } from "@/components/detail-view-effects";
import { ExpandableRelatedSection } from "@/components/expandable-related-section";
import { FranchiseRelatedSection } from "@/components/franchise-related-section";
import { MediaActions } from "@/components/media-actions";
import { ResilientMediaImage } from "@/components/resilient-media-image";
import { PremiumMediaDetails } from "@/components/premium-media-details";
import { VaultClientPrimer } from "@/components/vault-client-primer";
import { auth } from "@/lib/auth";
import { getLibraryStateForUser, getViewerShellData } from "@/lib/vault-server";
import { canonicalGenreLabels, sharedCanonicalGenreCount } from "@/lib/catalog-utils";
import { dedupeGalleryImageUrls, canonicalGalleryImageKey } from "@/lib/gallery-image-key";
import { optimizeMediaImageUrl } from "@/lib/media-image";
import { getMediaBySlug, mockCatalog } from "@/lib/mock-catalog";
import {
  browseIgdbGames,
  getIgdbFranchiseEntries,
  getIgdbGameDetails,
  getIgdbRelatedGamesByFranchise,
  getIgdbSimilarGamesForGame,
} from "@/lib/sources/igdb";
import { browseJikanAnime, getJikanAnimeDetails, getJikanAnimeFranchise } from "@/lib/sources/jikan";
import {
  browseTmdbCatalog,
  getTmdbCollectionItems,
  getTmdbFranchiseEntries,
  getTmdbMediaDetails,
  getTmdbRelatedByFranchise,
  getTmdbShowRelations,
  getTmdbStarterCatalog,
} from "@/lib/sources/tmdb";
import { matchesFranchise, normalizeAnimeBaseTitle, isLikelyAnime, extractFranchiseRoot, isSameFranchise } from "@/lib/franchise-utils";
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
  const text = (input ?? "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\b(written by|source:|courtesy of)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "No overview yet.";
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const limited = sentences.slice(0, 2).join(" ");
  const clipped = (limited || text).slice(0, 210).trimEnd();
  return clipped.length < text.length ? `${clipped}...` : clipped;
}

function buildPremiseLine(media: MediaItem) {
  const cleaned = cleanNarrativeText(media.overview);
  const firstSentence = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .find(Boolean);

  if (firstSentence && firstSentence !== "No overview yet.") {
    const compact = firstSentence.replace(/\s+/g, " ").trim();
    return compact.length > 132 ? `${compact.slice(0, 129).trimEnd()}...` : compact;
  }

  const genreBlend = media.genres.slice(0, 2).join(" / ") || "Story-driven";
  if (media.type === "game") {
    return `${genreBlend} game with a clear hook and a world worth stepping into.`;
  }

  if (media.type === "movie") {
    return `${genreBlend} film with a clear setup and a strong first impression.`;
  }

  return `${genreBlend} ${media.type === "show" ? "series" : "anime"} with a clear setup and an easy entry point.`;
}

function buildSynopsisPreview(media: MediaItem) {
  const cleaned = cleanNarrativeText(media.overview);
  if (cleaned === "No overview yet.") {
    return cleaned;
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const preview = sentences.slice(0, 2).join(" ");
  return preview.length > 185 ? `${preview.slice(0, 182).trimEnd()}...` : preview;
}

function getTrailerEmbedUrl(url?: string) {
  if (!url) return null;

  if (url.includes("youtube.com/embed/")) {
    return `${url}${url.includes("?") ? "&" : "?"}autoplay=0&mute=0&controls=1&rel=0&playsinline=1&modestbranding=1&vq=hd1080`;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}?autoplay=0&mute=0&controls=1&rel=0&playsinline=1&modestbranding=1&vq=hd1080` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}?autoplay=0&mute=0&controls=1&rel=0&playsinline=1&modestbranding=1&vq=hd1080` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function formatDetailDate(date?: string, fallbackYear?: number) {
  if (date) {
    const parsed = new Date(`${date}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  return fallbackYear ? String(fallbackYear) : "Unknown";
}

function buildSourceReference(media: MediaItem) {
  const sourceLabel =
    media.details.sourceLabel ??
    (media.source === "tmdb"
      ? "TMDB"
      : media.source === "jikan"
        ? "MyAnimeList"
        : media.source === "igdb"
          ? "IGDB"
          : "Source");

  return {
    label: sourceLabel,
    url: media.details.sourceUrl,
  };
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

const TITLE_ROOT_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

const TITLE_ROOT_GENERIC_WORDS = new Set([
  "adventure",
  "adventures",
  "battle",
  "boy",
  "boys",
  "chronicles",
  "club",
  "dream",
  "dreams",
  "edition",
  "experience",
  "family",
  "final",
  "game",
  "games",
  "generation",
  "girls",
  "group",
  "hero",
  "heroes",
  "history",
  "journey",
  "king",
  "life",
  "love",
  "movie",
  "movies",
  "origins",
  "party",
  "project",
  "return",
  "returns",
  "school",
  "show",
  "special",
  "story",
  "stories",
  "tale",
  "tales",
  "universe",
  "war",
  "world",
]);

function isUsefulTitleRoot(root: string) {
  const words = root.split(/\s+/).filter(Boolean);
  const meaningfulWords = words.filter((word) => !TITLE_ROOT_STOP_WORDS.has(word));
  const specificWords = meaningfulWords.filter((word) => !TITLE_ROOT_GENERIC_WORDS.has(word));

  if (specificWords.length >= 2) {
    return true;
  }

  if (specificWords.length === 1 && meaningfulWords.length >= 2 && root.length >= 10) {
    return true;
  }

  return false;
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
    if (normalized.length >= 4 && isUsefulTitleRoot(normalized)) {
      roots.add(normalized);
    }

    const beforeSubtitle = normalized.split(/\s+(?:and|the)\s+/).join(" ");
    if (beforeSubtitle.length >= 4 && isUsefulTitleRoot(beforeSubtitle)) {
      roots.add(beforeSubtitle);
    }

    const prefix = normalized.split(/\s+/).slice(0, 3).join(" ");
    if (prefix.length >= 4 && isUsefulTitleRoot(prefix)) {
      roots.add(prefix);
    }

    const shortPrefix = normalized.split(/\s+/).slice(0, 2).join(" ");
    if (shortPrefix.length >= 4 && isUsefulTitleRoot(shortPrefix)) {
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

type CuratedUniverseRule = {
  key: string;
  title: string;
  aliases: string[];
  entries: Partial<Record<MediaItem["type"], string[]>>;
};

const CURATED_UNIVERSE_RULES: CuratedUniverseRule[] = [
  {
    key: "game-of-thrones",
    title: "Westeros universe",
    aliases: ["game of thrones", "house of the dragon", "seven kingdoms", "westeros", "targaryen"],
    entries: {
      show: ["Game of Thrones", "House of the Dragon", "A Knight of the Seven Kingdoms"],
    },
  },
  {
    key: "the-boys",
    title: "The Boys universe",
    aliases: ["the boys", "gen v", "compound v", "vought", "the seven"],
    entries: {
      show: ["The Boys", "Gen V"],
    },
  },
  {
    key: "naruto",
    title: "Naruto universe",
    aliases: ["naruto", "naruto shippuden", "boruto", "konoha", "hokage", "shinobi"],
    entries: {
      anime: ["Naruto", "Naruto: Shippuden", "Boruto: Naruto Next Generations"],
      anime_movie: ["Naruto the Movie: Ninja Clash in the Land of Snow", "The Last: Naruto the Movie"],
    },
  },
  {
    key: "red-dead",
    title: "Red Dead universe",
    aliases: ["red dead", "red dead redemption", "red dead revolver", "rockstar games", "outlaw frontier"],
    entries: {
      game: ["Red Dead Revolver", "Red Dead Redemption 2", "Red Dead Redemption"],
    },
  },
  {
    key: "zelda",
    title: "The Legend of Zelda universe",
    aliases: ["legend of zelda", "zelda", "hyrule", "link", "master sword"],
    entries: {
      game: [
        "The Legend of Zelda: Skyward Sword",
        "The Legend of Zelda: Ocarina of Time",
        "The Legend of Zelda: Twilight Princess",
        "The Legend of Zelda: Breath of the Wild",
        "The Legend of Zelda: Tears of the Kingdom",
      ],
    },
  },
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

function getCuratedUniverseRule(media: MediaItem) {
  const haystack = normalizeTitleSignal(
    [
      media.title,
      media.originalTitle ?? "",
      media.details.collectionTitle ?? "",
      media.overview,
      media.details.studio ?? "",
    ].join(" "),
  );

  return CURATED_UNIVERSE_RULES.find((rule) =>
    rule.aliases.some((alias) => {
      const normalizedAlias = normalizeTitleSignal(alias);
      return normalizedAlias && haystack.includes(normalizedAlias);
    }),
  );
}

function isStrongExactUniverseTitleMatch(queryTitle: string, candidate: MediaItem) {
  const target = normalizeComparableFranchiseTitle(queryTitle, candidate.type);
  if (!target) {
    return false;
  }

  const candidateKeys = [
    candidate.title,
    candidate.originalTitle ?? "",
    candidate.details.collectionTitle ?? "",
  ]
    .map((value) => normalizeComparableFranchiseTitle(value, candidate.type))
    .filter(Boolean);

  return candidateKeys.some(
    (value) => value === target || value.includes(target) || target.includes(value),
  );
}

async function findTmdbUniverseEntries(titles: string[], type: "movie" | "show") {
  const results = await Promise.all(
    titles.map((title) =>
      browseTmdbCatalog({ type, page: 1, query: title, sort: "rating", seed: 21 }).catch(() => emptyBrowseResult()),
    ),
  );

  return dedupeItems(
    results.flatMap((result, index) =>
      result.items.filter((item) => isStrongExactUniverseTitleMatch(titles[index], item)),
    ),
  );
}

async function findIgdbUniverseEntries(titles: string[]) {
  const results = await Promise.all(
    titles.map((title) =>
      browseIgdbGames({ page: 1, query: title, sort: "rating", seed: 21 }).catch(() => emptyBrowseResult()),
    ),
  );

  return dedupeItems(
    results.flatMap((result, index) =>
      result.items.filter((item) => isStrongExactUniverseTitleMatch(titles[index], item)),
    ),
  );
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
  const isAnimeFamily =
    (base.type === "anime" || base.type === "anime_movie") &&
    (candidate.type === "anime" || candidate.type === "anime_movie");

  if (isAnimeFamily) {
    return true;
  }

  return candidate.type === base.type;
}

function buildSimilarityTags(media: MediaItem) {
  const canonicalGenres = canonicalGenreLabels(media);
  const haystack = normalizeTitleSignal(
    [
      media.title,
      media.originalTitle ?? "",
      media.overview,
      media.details.collectionTitle ?? "",
      media.details.studio ?? "",
      media.genres.join(" "),
      canonicalGenres.join(" "),
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
  const isAnimeFamily =
    (base.type === "anime" || base.type === "anime_movie") &&
    (candidate.type === "anime" || candidate.type === "anime_movie");

  if (!isAnimeFamily && candidate.type !== base.type) {
    return true;
  }

  const title = `${candidate.title} ${candidate.originalTitle ?? ""}`.toLowerCase();
  const overview = candidate.overview.toLowerCase();
  const bannedGenres = new Set(["Documentary", "News", "Talk", "Reality", "Soap"]);

  if (candidate.genres.some((genre) => bannedGenres.has(genre))) {
    return true;
  }

  if (base.type === "anime" || base.type === "anime_movie") {
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

function buildAnimeFamilyKeys(item: Pick<MediaItem, "title" | "originalTitle" | "details" | "type">) {
  const itemType = item.type === "anime_movie" ? "movie" : item.type;
  return Array.from(
    new Set(
      [item.title, item.originalTitle ?? "", item.details.collectionTitle ?? ""]
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => normalizeAnimeBaseTitle(value, itemType))
        .filter(Boolean),
    ),
  );
}

function hasStrictAnimeFranchiseConnection(base: MediaItem, candidate: MediaItem) {
  const baseKeys = buildAnimeFamilyKeys(base);
  const candidateKeys = buildAnimeFamilyKeys(candidate);

  return candidateKeys.some((candidateKey) =>
    baseKeys.some((baseKey) => {
      if (!candidateKey || !baseKey) {
        return false;
      }

      if (candidateKey === baseKey) {
        return true;
      }

      const candidateWords = candidateKey.split(/\s+/).filter((word) => word.length > 2);
      const baseWords = baseKey.split(/\s+/).filter((word) => word.length > 2);
      const commonWords = candidateWords.filter((word) => baseWords.includes(word));
      const firstWordMatches = candidateWords[0] && baseWords[0] && candidateWords[0] === baseWords[0];
      const shorterLength = Math.min(candidateKey.length, baseKey.length);

      if (!firstWordMatches || commonWords.length < 2 || shorterLength < 8) {
        return false;
      }

      return candidateKey.includes(baseKey) || baseKey.includes(candidateKey);
    }),
  );
}

/**
 * Same franchise "line" for more-like-this dedupe: TMDB collection, IGDB comparable title,
 * or comparable anime/game title roots (sequels in one sub-series).
 */
function isSameFranchiseProductLine(base: MediaItem, candidate: MediaItem) {
  const isAnimeFamily =
    (base.type === "anime" || base.type === "anime_movie") &&
    (candidate.type === "anime" || candidate.type === "anime_movie");

  if (!isAnimeFamily && base.type !== candidate.type) {
    return false;
  }

  if ((base.type === "movie" || base.type === "show") && base.details.collectionId && candidate.details.collectionId) {
    return base.details.collectionId === candidate.details.collectionId;
  }

  if (base.type !== "game" && base.type !== "anime" && base.type !== "anime_movie") {
    return false;
  }

  const baseKey = normalizeComparableFranchiseTitle(base.details.collectionTitle ?? base.title, base.type);
  const candKey = normalizeComparableFranchiseTitle(candidate.details.collectionTitle ?? candidate.title, candidate.type);
  if (!baseKey || !candKey || baseKey.length < 6 || candKey.length < 6) {
    return false;
  }

  return baseKey === candKey;
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

function normalizeDisplayTitle(title: string) {
  const trimmed = title.trim();
  if (!trimmed) {
    return title;
  }

  if (/[A-Z]/.test(trimmed.slice(1))) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  return trimmed.replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function compareFranchiseItems(left: MediaItem, right: MediaItem) {
  const leftYear = left.year || Number.MAX_SAFE_INTEGER;
  const rightYear = right.year || Number.MAX_SAFE_INTEGER;
  if (leftYear !== rightYear) {
    return leftYear - rightYear;
  }

  const leftOrder = parseInstallmentOrder(left.title);
  const rightOrder = parseInstallmentOrder(right.title);
  if (leftOrder !== null || rightOrder !== null) {
    return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER);
  }

  return normalizeDisplayTitle(left.title).localeCompare(normalizeDisplayTitle(right.title));
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
  // Handle both anime series and anime movies
  const curatedUniverse = getCuratedUniverseRule(media);
  const isAnimeContent =
    media.type === "anime" ||
    media.type === "anime_movie" ||
    (media.type === "movie" && media.source === "tmdb" && isLikelyAnime(media.title, media.genres, media.overview));
  
  if (isAnimeContent && animeFranchise && (animeFranchise.seasonEntries?.length || animeFranchise.entries.length > 1)) {
    const sourceEntries = animeFranchise.seasonEntries?.length ? animeFranchise.seasonEntries : animeFranchise.entries;
    const mappedEntries = sourceEntries.map((entry) => ({
      id: `jikan-${entry.id}`,
      title: normalizeDisplayTitle(entry.title),
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
      title: normalizeDisplayTitle(entry.title),
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
      title: normalizeDisplayTitle(animeFranchise.title),
      summary: buildFranchiseSummary(animeFranchise.title, activeIndex, mappedEntries.length),
      entries: mappedEntries,
      secondaryTitle: mappedMovies.length ? `${normalizeDisplayTitle(animeFranchise.title)} movies` : undefined,
      secondaryEntries: mappedMovies,
    };
  }

  if (isAnimeContent) {
    const fallbackSignals = buildFranchiseSignals(media);
    const fallbackEntries = (await getFranchiseFallback(media.type === "anime_movie" ? { ...media, type: "anime" } : media, fallbackSignals).catch(
      () => [] as MediaItem[],
    ))
      .filter((candidate) => candidate.type === "anime" || candidate.type === "anime_movie")
      .filter((candidate) => hasStrictAnimeFranchiseConnection(media, candidate));

    const combinedAnimeFallback = dedupeItems([media, ...fallbackEntries]);

    if (combinedAnimeFallback.length >= 2) {
      const ordered = [...combinedAnimeFallback].sort(compareFranchiseItems);
      const activeIndex = Math.max(0, ordered.findIndex((candidate) => candidate.id === media.id));

      return {
        title: normalizeDisplayTitle(media.details.collectionTitle ?? media.title),
        summary: buildFranchiseSummary(media.details.collectionTitle ?? media.title, activeIndex, ordered.length),
        entries: ordered
          .filter((entry) => entry.type === "anime")
          .map((entry) => ({
            id: entry.id,
            title: normalizeDisplayTitle(entry.title),
            meta: [entry.year || "Year TBD", `${entry.rating.toFixed(1)} / 10`, entry.details.runtime ?? entry.details.entryLabel ?? "Series"].filter(Boolean).join(" / "),
            href: buildMediaHref(entry),
            badge: buildFranchiseBadge(entry.title, parseInstallmentOrder(entry.title)),
            isActive: entry.id === media.id,
          })),
        secondaryTitle: ordered.some((entry) => entry.type === "anime_movie") ? `${normalizeDisplayTitle(media.details.collectionTitle ?? media.title)} movies` : undefined,
        secondaryEntries: ordered
          .filter((entry) => entry.type === "anime_movie")
          .map((entry) => ({
            id: entry.id,
            title: normalizeDisplayTitle(entry.title),
            meta: [entry.year || "Year TBD", `${entry.rating.toFixed(1)} / 10`, "Movie"].filter(Boolean).join(" / "),
            href: buildMediaHref(entry),
            badge: "Movie",
            isActive: entry.id === media.id,
          })),
      };
    }

    return null;
  }

  if (media.type === "movie" && media.source === "tmdb" && media.details.collectionId) {
    const parts = await getTmdbCollectionItems(media.details.collectionId).catch(() => [] as MediaItem[]);
    const combined = dedupeItems([media, ...parts]).filter((candidate) => candidate.type === "movie");
    if (combined.length >= 2) {
      const ordered = [...combined].sort(compareFranchiseItems);
      const collectionName = media.details.collectionTitle ?? "Series collection";
      const activeIndex = Math.max(0, ordered.findIndex((candidate) => candidate.id === media.id));

      return {
        title: normalizeDisplayTitle(collectionName),
        summary: buildFranchiseSummary(collectionName, activeIndex, ordered.length),
        entries: ordered.map((entry) => ({
          id: entry.id,
          title: normalizeDisplayTitle(entry.title),
          meta: [entry.year || "Year TBD", `${entry.rating.toFixed(1)} / 10`, entry.details.releaseInfo ?? entry.details.runtime ?? "Feature"].filter(Boolean).join(" / "),
          href: buildMediaHref(entry),
          badge: buildFranchiseBadge(entry.title, parseInstallmentOrder(entry.title)),
          isActive: entry.id === media.id,
        })),
      };
    }
  }

  if (media.type === "movie" && media.source === "tmdb" && curatedUniverse?.entries.movie?.length) {
    const combined = dedupeItems([
      media,
      ...(await findTmdbUniverseEntries(curatedUniverse.entries.movie, "movie").catch(() => [] as MediaItem[])),
    ]).filter((candidate) => candidate.type === "movie");

    if (combined.length >= 2) {
      const ordered = [...combined].sort(compareFranchiseItems);
      const activeIndex = Math.max(0, ordered.findIndex((candidate) => candidate.id === media.id));

      return {
        title: normalizeDisplayTitle(curatedUniverse.title),
        summary: buildFranchiseSummary(curatedUniverse.title, activeIndex, ordered.length),
        entries: ordered.map((entry) => ({
          id: entry.id,
          title: normalizeDisplayTitle(entry.title),
          meta: [entry.year || "Year TBD", `${entry.rating.toFixed(1)} / 10`, entry.details.releaseInfo ?? entry.details.runtime ?? "Feature"].filter(Boolean).join(" / "),
          href: buildMediaHref(entry),
          badge: buildFranchiseBadge(entry.title, parseInstallmentOrder(entry.title)),
          isActive: entry.id === media.id,
        })),
      };
    }
  }

  if (media.type === "show" && media.source === "tmdb") {
    const franchiseSignals = buildFranchiseSignals(media);
    const hasCuratedMovies = Boolean(curatedUniverse?.entries.movie?.length);
    const [relations, directRelations, curatedEntries, crossTypeMovies] = await Promise.all([
      getTmdbFranchiseEntries(Number(media.sourceId), "tv").catch(() => [] as MediaItem[]),
      getTmdbShowRelations(Number(media.sourceId)).catch(() => [] as MediaItem[]),
      curatedUniverse?.entries.show?.length
        ? findTmdbUniverseEntries(curatedUniverse.entries.show, "show").catch(() => [] as MediaItem[])
        : Promise.resolve([] as MediaItem[]),
      hasCuratedMovies ? getTmdbRelatedByFranchise(media.title, "movie", 8).catch(() => [] as MediaItem[]) : Promise.resolve([] as MediaItem[]),
    ]);

    // Treat direct TMDB relations (sequels/spinoffs) as explicit franchise links.
    const combined = dedupeItems([media, ...directRelations, ...relations, ...curatedEntries, ...crossTypeMovies])
      .filter((candidate) => candidate.type === "show" || candidate.type === "movie")
      .filter((candidate) =>
        candidate.id === media.id ||
        directRelations.some((entry) => entry.id === candidate.id) ||
        hasStrongFranchiseConnection(media, candidate, franchiseSignals),
      );
    
    if (combined.length >= 2) {
      const ordered = [...combined].sort(compareFranchiseItems);
      const seriesEntries = ordered.filter((candidate) => candidate.type === "show");
      const movieEntries = ordered.filter((candidate) => candidate.type === "movie");
      const activeIndex = Math.max(0, seriesEntries.findIndex((candidate) => candidate.id === media.id));
      const title =
        curatedUniverse?.title ??
        media.details.collectionTitle ??
        normalizeDisplayTitle(extractFranchiseRoot(seriesEntries[0]?.title ?? media.title, media.type));

      return {
        title: normalizeDisplayTitle(title),
        summary: buildFranchiseSummary(title, activeIndex, seriesEntries.length || ordered.length),
        entries: seriesEntries.map((entry) => ({
          id: entry.id,
          title: normalizeDisplayTitle(entry.title),
          meta: [entry.year || "Year TBD", `${entry.rating.toFixed(1)} / 10`, entry.details.status ?? "Series"].filter(Boolean).join(" / "),
          href: buildMediaHref(entry),
          badge: buildFranchiseBadge(entry.title, parseInstallmentOrder(entry.title)),
          isActive: entry.id === media.id,
        })),
        secondaryTitle: movieEntries.length ? `${normalizeDisplayTitle(title)} movies` : undefined,
        secondaryEntries: movieEntries.map((entry) => ({
          id: entry.id,
          title: normalizeDisplayTitle(entry.title),
          meta: [entry.year || "Year TBD", `${entry.rating.toFixed(1)} / 10`, entry.details.releaseInfo ?? entry.details.runtime ?? "Movie"].filter(Boolean).join(" / "),
          href: buildMediaHref(entry),
          badge: "Movie",
          isActive: entry.id === media.id,
        })),
      };
    }
  }

  if (media.type === "game" && media.source === "igdb") {
    const franchiseSignals = buildFranchiseSignals(media);
    const [neighbors, searchRelated, curatedEntries] = await Promise.all([
      getIgdbFranchiseEntries(Number(media.sourceId)).catch(() => [] as MediaItem[]),
      getIgdbRelatedGamesByFranchise(media.title, 10).catch(() => [] as MediaItem[]),
      curatedUniverse?.entries.game?.length
        ? findIgdbUniverseEntries(curatedUniverse.entries.game).catch(() => [] as MediaItem[])
        : Promise.resolve([] as MediaItem[]),
    ]);

    // IGDB neighbors are explicit franchise/collection links; keep them even if fuzzy heuristics miss.
    const combined = dedupeItems([media, ...neighbors, ...searchRelated, ...curatedEntries])
      .filter((candidate) => candidate.type === "game")
      .filter((candidate) =>
        candidate.id === media.id ||
        neighbors.some((entry) => entry.id === candidate.id) ||
        hasStrongFranchiseConnection(media, candidate, franchiseSignals),
      );

    if (combined.length >= 2) {
      const ordered = [...combined].sort(compareFranchiseItems);
      const title =
        curatedUniverse?.title ??
        media.details.collectionTitle ??
        normalizeDisplayTitle(extractFranchiseRoot(ordered[0]?.title ?? media.title, media.type));
      const activeIndex = Math.max(0, ordered.findIndex((candidate) => candidate.id === media.id));

      return {
        title: normalizeDisplayTitle(title),
        summary: buildFranchiseSummary(title, activeIndex, ordered.length),
        entries: ordered.map((entry) => ({
          id: entry.id,
          title: normalizeDisplayTitle(entry.title),
          meta: [entry.year || "Year TBD", `${entry.rating.toFixed(1)} / 10`, entry.details.platform ?? entry.details.releaseInfo ?? "Game"].filter(Boolean).join(" / "),
          href: buildMediaHref(entry),
          badge: buildFranchiseBadge(entry.title, parseInstallmentOrder(entry.title)),
          isActive: entry.id === media.id,
        })),
      };
    }
  }

  return null;
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
  const slugWords = slug.replace(/-/g, " ").trim();

  if (preferredSource === "igdb" && preferredSourceId && preferredType === "game") {
    try {
      const media = await getIgdbGameDetails(Number(preferredSourceId));
      return { media, animeFranchise: undefined };
    } catch {
      /* continue with search */
    }
  }

  if (preferredType === "game" && (!preferredSource || preferredSource === "igdb")) {
    const quickGames = await withTimeout(
      browseIgdbGames({ page: 1, query: slugWords || slug, sort: "rating", seed: 3 }).catch(() => emptyBrowseResult()),
      emptyBrowseResult(),
      2800,
    );
    const gameHit =
      (preferredSourceId
        ? quickGames.items.find((item) => matchesIdentityCandidate(item, preferredSource, preferredSourceId, preferredType))
        : undefined) ?? quickGames.items.find((item) => matchesSlugCandidate(item, slug));
    if (gameHit?.source === "igdb") {
      try {
        const media = await getIgdbGameDetails(Number(gameHit.sourceId));
        return { media, animeFranchise: undefined };
      } catch {
        /* fall through */
      }
    }
  }

  if (preferredType === "anime" && (!preferredSource || preferredSource === "jikan")) {
    const quickAnime = await withTimeout(
      browseJikanAnime({ page: 1, query: slugWords || slug, sort: "rating", seed: 3 }).catch(() => emptyBrowseResult()),
      emptyBrowseResult(),
      2800,
    );
    const animeHit =
      (preferredSourceId
        ? quickAnime.items.find((item) => matchesIdentityCandidate(item, preferredSource, preferredSourceId, preferredType))
        : undefined) ?? quickAnime.items.find((item) => matchesSlugCandidate(item, slug));
    if (animeHit?.source === "jikan") {
      try {
        const media = await getJikanAnimeDetails(Number(animeHit.sourceId));
        const animeFranchise = await getJikanAnimeFranchise(Number(animeHit.sourceId)).catch(() => undefined);
        return { media, animeFranchise };
      } catch {
        /* fall through */
      }
    }
  }

  if ((preferredType === "movie" || preferredType === "show") && (!preferredSource || preferredSource === "tmdb")) {
    const tmdbType = preferredType === "movie" ? "movie" : "show";
    const quickTmdb = await withTimeout(
      browseTmdbCatalog({ type: tmdbType, page: 1, query: slugWords || slug, sort: "rating", seed: 3 }).catch(() => emptyBrowseResult()),
      emptyBrowseResult(),
      2800,
    );
    const tmdbHit =
      (preferredSourceId
        ? quickTmdb.items.find((item) => matchesIdentityCandidate(item, preferredSource, preferredSourceId, preferredType))
        : undefined) ?? quickTmdb.items.find((item) => matchesSlugCandidate(item, slug));
    if (tmdbHit && (tmdbHit.type === "movie" || tmdbHit.type === "show")) {
      try {
        const media = await getTmdbMediaDetails(Number(tmdbHit.sourceId), tmdbHit.type === "movie" ? "movie" : "tv");
        return { media, animeFranchise: undefined };
      } catch {
        /* fall through */
      }
    }
  }

  const queryVariants = buildQueryVariants(slugWords || slug);
  const searchPages = [1, 2, 3];

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
        ...(preferredType ? [] : [
          ...(movieCatalog?.items ?? []),
          ...(showCatalog?.items ?? []),
          ...(animeCatalog?.items ?? []),
          ...(gameCatalog?.items ?? [])
        ].sort((a, b) => {
          // Prioritize anime for slugs that contain anime-like keywords
          const slugLower = (slugWords || slug).toLowerCase();
          const animeKeywords = ['anime', 'manga', 'season', 'episode', 'dub', 'sub'];
          const hasAnimeKeywords = animeKeywords.some(keyword => slugLower.includes(keyword));
          
          if (hasAnimeKeywords) {
            if (a.type === 'anime' && b.type !== 'anime') return -1;
            if (b.type === 'anime' && a.type !== 'anime') return 1;
          }
          
          // Otherwise prioritize by rating/popularity
          return (b.rating || 0) - (a.rating || 0);
        })),
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
  const sharedGenres = sharedCanonicalGenreCount(base, candidate);
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
  let score = 0;
  const sharedGenres = sharedCanonicalGenreCount(base, candidate);
  const sharedTopics = sharedTopicTokenCount(base, candidate);
  const sharedTags = sharedSimilarityTagCount(base, candidate);
  const sharedPlatforms = sharedPlatformCount(base, candidate);
  const baseTitleRoots = buildTitleRoots(base);
  const candidateTitleSignals = [
    candidate.title,
    candidate.originalTitle ?? "",
    candidate.details.collectionTitle ?? "",
  ]
    .map((value) => normalizeTitleSignal(value))
    .filter(Boolean);
  const sharesTitleRoot = baseTitleRoots.some((root) =>
    candidateTitleSignals.some((signal) => signal.includes(root) || root.includes(signal)),
  );
  const sharedCredits = candidate.credits.filter((credit) =>
    base.credits.some((baseCredit) => baseCredit.name.trim().toLowerCase() === credit.name.trim().toLowerCase()),
  ).length;

  const yearDistance = Math.abs((candidate.year || 0) - (base.year || 0));

  score += 22;
  score += sharedGenres * 18;
  score += sharedTags * 20;
  score += Math.min(sharedTopics, 5) * 6;
  score += Math.min(sharedPlatforms, 3) * (base.type === "game" ? 6 : 2);
  score += sharedCredits * 6;
  if (sharesTitleRoot) {
    score += 10;
  }

  if (base.details.studio && candidate.details.studio && base.details.studio === candidate.details.studio) {
    score += 8;
  }

  if (yearDistance <= 3) score += 6;
  else if (yearDistance <= 8) score += 3;

  score += Math.max(0, 4 - Math.abs(candidate.rating - base.rating));

  if (sharedGenres === 0) {
    score -= 36;
  }

  if (sharedTags === 0) {
    score -= base.type === "game" ? 14 : 24;
  }

  if (sharedGenres === 1 && sharedTags === 0 && sharedTopics < 2) {
    score -= 24;
  }

  if (sharedGenres === 0 && sharedTopics < 2 && !sharesTitleRoot) {
    score -= 32;
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

function uniqueGalleryImages(media: MediaItem) {
  const seen = new Set<string>();
  const gallery: string[] = [];

  function push(image?: string) {
    if (!image || image.startsWith("data:image")) return;
    const key = canonicalGalleryImageKey(image);
    if (!key || seen.has(key)) return;
    seen.add(key);
    gallery.push(image);
  }

  const screenshots = dedupeGalleryImageUrls((media.screenshots ?? []).filter(Boolean));
  for (const image of screenshots) {
    push(image);
  }

  if (!gallery.length) {
    push(media.backdropUrl);
  }

  if (gallery.length < 2) {
    push(media.coverUrl);
  }

  return gallery;
}

function buildStoryGallery(gallery: string[], fallback: string) {
  if (!gallery.length) {
    return [fallback];
  }

  return dedupeGalleryImageUrls([...gallery, fallback].filter(Boolean)).slice(0, 3);
}

function buildAtlasGallery(gallery: string[], usedImages: string[]) {
  const used = new Set(usedImages.map((image) => canonicalGalleryImageKey(image)));
  const fresh = gallery.filter((image) => !used.has(canonicalGalleryImageKey(image)));

  if (fresh.length >= 3) {
    return dedupeGalleryImageUrls(fresh).slice(0, 10);
  }

  return dedupeGalleryImageUrls(fresh).slice(0, 10);
}

function buildFeelingTags(media: MediaItem) {
  const tags = new Set<string>();
  const genres = media.genres.map((genre) => genre.toLowerCase());
  const overview = `${media.title} ${media.originalTitle ?? ""} ${media.overview}`.toLowerCase();

  if (genres.some((genre) => ["action", "martial arts", "fighting", "shounen"].includes(genre)) || /\b(chase|battle|fight|war|survival)\b/.test(overview)) {
    tags.add("Fast-paced");
  }
  if (genres.some((genre) => ["drama", "romance", "tragedy"].includes(genre)) || /\b(loss|grief|heart|relationship|friendship)\b/.test(overview)) {
    tags.add("Emotional");
  }
  if (genres.some((genre) => ["thriller", "horror", "mystery", "psychological"].includes(genre)) || /\b(secret|murder|fear|nightmare|danger)\b/.test(overview)) {
    tags.add("Dark");
    tags.add("Tense");
  }
  if (genres.some((genre) => ["fantasy", "adventure", "rpg", "sci-fi", "science fiction", "isekai"].includes(genre)) || /\b(world|kingdom|galaxy|future|realm|quest)\b/.test(overview)) {
    tags.add("World-heavy");
  }
  if (genres.some((genre) => ["comedy", "slice of life", "family"].includes(genre)) || /\b(fun|chaos|awkward|everyday)\b/.test(overview)) {
    tags.add("Easy to sink into");
  }
  if (media.type === "game") {
    tags.add("Hands-on");
  }
  if (media.rating >= 8.5) {
    tags.add("Critic-loved");
  } else if (media.rating >= 7.4) {
    tags.add("Easy recommendation");
  }

  return Array.from(tags).slice(0, 6);
}

function buildWhyYouMightLikeIt(media: MediaItem, feelingTags: string[]) {
  const genres = media.genres.map((genre) => genre.toLowerCase());

  if (media.type === "game" && genres.some((genre) => ["rpg", "adventure", "open world"].includes(genre))) {
    return "You like worlds that are fun to inhabit, not just finish.";
  }
  if (genres.some((genre) => ["thriller", "mystery", "horror", "psychological"].includes(genre))) {
    return "You want tension, atmosphere, and that one-more-episode or one-more-hour pull.";
  }
  if (genres.some((genre) => ["drama", "romance", "slice of life"].includes(genre)) || feelingTags.includes("Emotional")) {
    return "You stay for chemistry, payoff, and characters that actually leave a mark.";
  }
  if (genres.some((genre) => ["fantasy", "sci-fi", "adventure", "isekai"].includes(genre)) || feelingTags.includes("World-heavy")) {
    return "You like learning a world’s rules fast and getting rewarded for leaning in.";
  }
  if (genres.some((genre) => ["action", "martial arts", "fighting"].includes(genre)) || feelingTags.includes("Fast-paced")) {
    return "You want clean momentum, pressure, and a strong payoff without a slow ramp.";
  }

  return media.type === "game"
    ? "You want a clear hook, a strong atmosphere, and something that feels good to spend time inside."
    : "You want something with identity right away instead of waiting forever for it to click.";
}

function buildWorldLine(media: MediaItem, animeFranchise?: AnimeFranchiseData) {
  const genres = media.genres.slice(0, 2).join(" / ") || "story-led";

  if (media.details.parentSeriesTitle && media.details.parentSeriesTitle !== media.title) {
    return `Part of ${media.details.parentSeriesTitle}, with this entry taking a ${genres.toLowerCase()} angle on the larger story.`;
  }
  if (media.details.collectionTitle) {
    return `Set inside the ${media.details.collectionTitle} universe, with a ${genres.toLowerCase()} lens.`;
  }
  if ((media.type === "anime" || media.type === "anime_movie") && animeFranchise?.seasonCount) {
    return `A stylized world with ${animeFranchise.seasonCount} connected season${animeFranchise.seasonCount === 1 ? "" : "s"} already shaping the bigger picture.`;
  }
  if (media.type === "game") {
    return `${genres} spaces, systems, and encounters shape the experience more than one single set-piece does.`;
  }
  if (media.type === "movie") {
    return `A ${genres.toLowerCase()} setting built to land fast and leave a strong first impression.`;
  }

  return `A ${genres.toLowerCase()} world with enough identity to click quickly, even before the story fully opens up.`;
}

function buildMainCharacterLine(media: MediaItem, credits: MediaItem["credits"]) {
  const characterNames = credits
    .filter((credit) => credit.character)
    .slice(0, 3)
    .map((credit) => credit.character as string);

  if (characterNames.length) {
    return characterNames.join(" • ");
  }

  const leadNames = credits.slice(0, 3).map((credit) => credit.name);
  if (leadNames.length) {
    return leadNames.join(" • ");
  }

  return media.type === "game"
    ? "The world and the playstyle do most of the talking here."
    : "The cast is part of the draw, even if this source is thin on names.";
}

function buildVibeSummary(media: MediaItem, animeFranchise: AnimeFranchiseData | undefined, feelingTags: string[]) {
  return [
    {
      label: "Main Character(s)",
      value: buildMainCharacterLine(media, media.credits),
    },
    {
      label: "Setting / World",
      value: buildWorldLine(media, animeFranchise),
    },
    {
      label: "Tone / Mood",
      value: feelingTags.join(" • ") || "Clear, readable, and easy to get a feel for fast.",
    },
    {
      label: "Core Idea / Hook",
      value: buildPremiseLine(media),
    },
    {
      label: "Why You Might Like It",
      value: buildWhyYouMightLikeIt(media, feelingTags),
    },
  ];
}

function buildCharacterHighlights(media: MediaItem, credits: MediaItem["credits"]) {
  return credits.slice(0, 6).map((credit) => ({
    name: credit.character ?? credit.name,
    role:
      media.type === "game"
        ? credit.role
        : credit.character
          ? `${credit.name} • ${credit.role}`
          : credit.role,
    summary:
      media.type === "game"
        ? "A key name tied to how the experience was built and how it lands."
        : credit.character
          ? "Part of the face, voice, or chemistry that gives the story its pull."
          : "One of the people shaping the tone on screen or behind it.",
  }));
}

function buildRelatedTasteLine(media: MediaItem, related: MediaItem[], feelingTags: string[]) {
  const nextPick = related[0];
  if (nextPick) {
    const overlap = buildFeelingTags(nextPick)
      .filter((tag) => feelingTags.includes(tag))
      .slice(0, 2)
      .join(" • ");

    if (overlap) {
      return `${nextPick.title} is the closest nearby match here, especially if you want more of the ${overlap.toLowerCase()} side of this page.`;
    }

    return `${nextPick.title} is the nearest next stop if you want the same lane with a slightly different angle.`;
  }

  return media.type === "game"
    ? "Think atmosphere first, then systems, then whether you want to live in this loop for a while."
    : "Think identity first: if the tone and hook work for you, the rest usually follows quickly.";
}

function isFranchiseParentEntry(media: MediaItem, franchiseSection: FranchiseSectionData | null): boolean {
  if (!franchiseSection) return false;

  // Get the franchise root for comparison
  const mediaRoot = extractFranchiseRoot(media.title, media.type).toLowerCase();
  const franchiseRoot = extractFranchiseRoot(franchiseSection.title, media.type).toLowerCase();

  // If media title's root matches the franchise root, this is likely the parent
  if (mediaRoot === franchiseRoot && mediaRoot.length > 2) {
    return true;
  }

  // Check if this is the earliest entry by year in the franchise
  const allEntries = [...franchiseSection.entries, ...(franchiseSection.secondaryEntries ?? [])];
  if (allEntries.length > 0) {
    const currentYear = media.year || Number.MAX_SAFE_INTEGER;
    const earliestYear = Math.min(...allEntries.map(e => {
      // Parse year from meta string (format: "Year / Rating / Episodes")
      const yearMatch = e.meta.match(/^(\d{4})/);
      return yearMatch ? parseInt(yearMatch[1], 10) : Number.MAX_SAFE_INTEGER;
    }).filter(y => y > 0));

    // If this media is the earliest entry, it's the parent
    if (currentYear <= earliestYear && currentYear > 0) {
      return true;
    }
  }

  // Check if the media title is a direct match to the franchise title
  const normalizedMedia = normalizeAnimeBaseTitle(media.title, media.type).toLowerCase();
  const normalizedFranchise = normalizeAnimeBaseTitle(franchiseSection.title, media.type).toLowerCase();

  if (normalizedMedia === normalizedFranchise) {
    return true;
  }

  return false;
}

function buildSeriesContext(media: MediaItem, franchiseSection: FranchiseSectionData | null) {
  // Check if this media IS the parent/root entry - if so, don't show "part of series" box
  if (isFranchiseParentEntry(media, franchiseSection)) {
    return null;
  }

  const parentSeriesTitle =
    media.details.parentSeriesTitle && media.details.parentSeriesTitle !== media.title
      ? media.details.parentSeriesTitle
      : franchiseSection?.title && franchiseSection.title !== media.title
        ? franchiseSection.title
        : null;

  if (!parentSeriesTitle) {
    return null;
  }

  const relationshipLabel =
    media.details.parentSeriesLabel ??
    (media.type === "anime_movie"
      ? "Franchise movie"
      : media.type === "anime"
        ? "Part of a larger anime series"
        : media.type === "show"
          ? "Series continuation"
          : "Part of a larger franchise");

  const franchiseEntryCount =
    (franchiseSection?.entries.length ?? 0) + (franchiseSection?.secondaryEntries?.length ?? 0);

  return {
    parentSeriesTitle,
    relationshipLabel,
    summary:
      franchiseEntryCount >= 2
        ? `${media.title} belongs to ${parentSeriesTitle}. The franchise section below keeps the connected entries grouped so you can move through them without losing the series context.`
        : `${media.title} belongs to ${parentSeriesTitle}, even if the connected-entry rail is still thin for this exact source item.`,
  };
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

    if (media.type === "anime" || media.type === "anime_movie") {
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
        withTimeout(
          browseTmdbCatalog({ type: mediaType, page: 2, genre: primaryGenre, sort: "discovery", seed: 15 + mediaTypeIndex }),
          emptyBrowseResult(),
          700,
        ),
        withTimeout(
          browseTmdbCatalog({ type: mediaType, page: 1, sort: "discovery", seed: 17 + mediaTypeIndex }),
          emptyBrowseResult(),
          750,
        ),
        ...(tertiaryGenre
          ? [
              withTimeout(
                browseTmdbCatalog({ type: mediaType, page: 1, genre: tertiaryGenre, sort: "discovery", seed: 13 + mediaTypeIndex }),
                emptyBrowseResult(),
                650,
              ),
            ]
          : []),
      ]),
    );

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        collected.push(...result.value.items);
      }
    });
  }

  if (media.type === "anime" || media.type === "anime_movie") {
    const animeQueries = Array.from(
      new Set([
        media.details.collectionTitle ?? "",
        ...buildQueryVariants(media.title),
        ...buildTitleRoots(media),
      ].filter((value) => value.length >= 3)),
    ).slice(0, 4);

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
      ...(tertiaryGenre
        ? [
            withTimeout(
              browseJikanAnime({ page: 1, genre: tertiaryGenre, sort: "discovery", seed: 11 }),
              emptyBrowseResult(),
              650,
            ),
          ]
        : []),
      withTimeout(
        browseJikanAnime({ page: 1, sort: "rating", seed: 12 }),
        emptyBrowseResult(),
        750,
      ),
      ...animeQueries.flatMap((query, index) => [
        withTimeout(
          browseJikanAnime({ page: 1, query, sort: "rating", seed: 20 + index }),
          emptyBrowseResult(),
          750,
        ),
      ]),
    ]);

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        collected.push(...result.value.items);
      }
    });
  }

  if (media.type === "game") {
    if (media.source === "igdb" && Number.isFinite(Number(media.sourceId))) {
      const similarFromIgdb = await withTimeout(
        getIgdbSimilarGamesForGame(Number(media.sourceId)),
        [] as MediaItem[],
        900,
      );
      collected.push(...similarFromIgdb);
    }

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
    .filter((candidate) => !isSameFranchiseProductLine(media, candidate))
    .map((candidate) => ({
      candidate,
      score: scoreMoreLikeThisCandidate(media, candidate),
    }));

  const strictMatches = scored
    .filter((entry) => {
      const sharedGenres = sharedCanonicalGenreCount(media, entry.candidate);
      const sharedTopics = sharedTopicTokenCount(media, entry.candidate);
      const sharedTags = sharedSimilarityTagCount(media, entry.candidate);
      const sharedPlatforms = sharedPlatformCount(media, entry.candidate);
      if (media.type === "game") {
        return entry.score >= 22 && (sharedGenres >= 1 || sharedTags >= 1 || sharedPlatforms >= 1 || sharedTopics >= 2);
      }
      if (media.type === "movie" || media.type === "show") {
        return entry.score >= 20 && (sharedGenres >= 1 || sharedTags >= 1 || sharedTopics >= 2);
      }
      return entry.score >= 20 && (sharedGenres >= 1 || sharedTags >= 1 || sharedTopics >= 1);
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.candidate)
    .slice(0, media.type === "game" ? 10 : 12);

  if (strictMatches.length >= (media.type === "game" ? 8 : 10)) {
    return dedupeItems(strictMatches);
  }

  const fallbackMatches = scored
    .filter((entry) => {
      const sharedGenres = sharedCanonicalGenreCount(media, entry.candidate);
      const sharedTags = sharedSimilarityTagCount(media, entry.candidate);
      const sharedPlatforms = sharedPlatformCount(media, entry.candidate);
      const sharedTopics = sharedTopicTokenCount(media, entry.candidate);
      if (media.type === "game") {
        return entry.score >= 16 && (sharedGenres >= 1 || sharedTags >= 1 || sharedPlatforms >= 1);
      }
      if (media.type === "movie" || media.type === "show") {
        return entry.score >= 14 && (sharedGenres >= 1 || sharedTags >= 1 || sharedTopics >= 1);
      }
      return entry.score >= 12 && (sharedGenres >= 1 || sharedTags >= 1 || sharedTopics >= 1);
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.candidate)
    .slice(0, media.type === "game" ? 8 : 10);

  const broadMatches = scored
    .filter((entry) => {
      const sharedGenres = sharedCanonicalGenreCount(media, entry.candidate);
      const sharedTags = sharedSimilarityTagCount(media, entry.candidate);
      const sharedPlatforms = sharedPlatformCount(media, entry.candidate);
      const sharedTopics = sharedTopicTokenCount(media, entry.candidate);
      if (media.type === "game") {
        return entry.score >= 12 && (sharedGenres >= 1 || sharedTags >= 1 || sharedPlatforms >= 1 || sharedTopics >= 1);
      }
      if (media.type === "movie" || media.type === "show") {
        return entry.score >= 10 && (sharedGenres >= 1 || sharedTags >= 1 || sharedTopics >= 1);
      }
      return entry.score >= 8 && (sharedGenres >= 1 || sharedTags >= 1 || sharedTopics >= 1 || entry.candidate.rating >= 7.2);
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.candidate)
    .slice(0, media.type === "game" ? 12 : 14);

  const relevanceFloorMatches = scored
    .filter((entry) => {
      const sharedGenres = sharedCanonicalGenreCount(media, entry.candidate);
      const sharedTags = sharedSimilarityTagCount(media, entry.candidate);
      const sharedTopics = sharedTopicTokenCount(media, entry.candidate);
      const minimumScore = media.type === "game" ? 12 : 10;
      return entry.score >= minimumScore && (sharedGenres >= 1 || sharedTags >= 1 || sharedTopics >= 2);
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.candidate)
    .slice(0, media.type === "game" ? 10 : 12);

  const mergedMatches = dedupeItems([...strictMatches, ...fallbackMatches, ...broadMatches, ...relevanceFloorMatches]);

  if (mergedMatches.length >= (media.type === "game" ? 8 : 10)) {
    return mergedMatches.slice(0, media.type === "game" ? 10 : 12);
  }

  if ((media.type === "anime" || media.type === "anime_movie") && fallbackMatches.length) {
    return dedupeItems(fallbackMatches);
  }

  if (media.type === "anime" || media.type === "anime_movie") {
    const looseAnimeMatches = scored
      .filter((entry) => {
        const sharedGenres = sharedCanonicalGenreCount(media, entry.candidate);
        const sharedTags = sharedSimilarityTagCount(media, entry.candidate);
        const sharedTopics = sharedTopicTokenCount(media, entry.candidate);
        return entry.score >= 6 && (sharedGenres >= 1 || sharedTags >= 1 || sharedTopics >= 1 || entry.candidate.rating >= 7);
      })
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.candidate)
      .slice(0, 12);

    if (looseAnimeMatches.length) {
      return dedupeItems(looseAnimeMatches);
    }
  }

  const emergencyFallback = scored
    .filter((entry) => {
      const sharedGenres = sharedCanonicalGenreCount(media, entry.candidate);
      const sharedTags = sharedSimilarityTagCount(media, entry.candidate);
      const sharedTopics = sharedTopicTokenCount(media, entry.candidate);
      const sameStudio =
        Boolean(media.details.studio) &&
        Boolean(entry.candidate.details.studio) &&
        media.details.studio === entry.candidate.details.studio;

      return entry.score >= 4 && (sharedGenres >= 1 || sharedTags >= 1 || sharedTopics >= 2 || sameStudio);
    })
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.candidate)
    .slice(0, media.type === "game" ? 8 : 10);

  return dedupeItems([...mergedMatches, ...emergencyFallback]).slice(0, media.type === "game" ? 10 : 12);
}

export default async function MediaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string; sourceId?: string; type?: string }>;
}) {
  const session = await auth();
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;
  const [shellData, library] = session?.user?.id
    ? await Promise.all([
        getViewerShellData(session.user.id).catch(() => null),
        getLibraryStateForUser(session.user.id).catch(() => null),
      ])
    : [null, null];
  const sidebarFolders = shellData?.folders ?? [];
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
          <AppSidebar active="browse" initialFolders={sidebarFolders} />
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

  const [related, franchiseSection] = await Promise.all([
    getRelatedMediaRail(media).catch(() => [] as MediaItem[]),
    buildFranchiseSection(media, animeFranchise).catch(() => null),
  ]);
  const seriesContext = buildSeriesContext(media, franchiseSection);
  const franchiseIds = new Set([
    ...(franchiseSection?.entries.map((entry) => entry.id) ?? []),
    ...(franchiseSection?.secondaryEntries?.map((entry) => entry.id) ?? []),
  ]);
  const filteredRelated = related.filter((item) => !franchiseIds.has(item.id));
  const runtimeLabel =
    media.type === "game"
      ? "Platforms"
      : media.type === "show"
        ? "Seasons released"
        : media.type === "anime" || media.type === "anime_movie"
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
        : media.type === "anime" || media.type === "anime_movie"
          ? (animeFranchise?.seasonCount ?? media.details.seasonCount)
            ? `${animeFranchise?.seasonCount ?? media.details.seasonCount} seasons released`
            : media.details.runtime ?? media.details.entryLabel ?? media.details.releaseInfo ?? "Unknown"
          : media.details.runtime ?? media.details.entryLabel ?? media.details.releaseInfo ?? "Unknown";
  const studioValue = media.details.studio ?? media.details.platform ?? "Unknown";
  const statusValue = media.details.status ?? media.details.releaseInfo ?? "Unknown";
  const releaseValue = formatDetailDate(media.details.releaseDate, media.year);
  const genreValue = media.genres.length ? media.genres.slice(0, 4).join(" • ") : "Unknown";
  const sourceReference = buildSourceReference(media);
  const deepDiveCards = buildDeepDiveCards(media, animeFranchise);
  const spotlightCredits = dedupeSpotlightCredits(media.credits).slice(0, 6);
  const feelingTags = buildFeelingTags(media);
  const vibeSummary = buildVibeSummary(media, animeFranchise, feelingTags);
  const characterHighlights = buildCharacterHighlights(media, spotlightCredits);
  const gallery = uniqueGalleryImages(media).slice(0, 6);
  const storyGallery = buildStoryGallery(gallery, media.backdropUrl || media.coverUrl);
  const moodLine = buildPremiseLine(media);
  const synopsisPreview = buildSynopsisPreview(media);
  const trailerEmbedUrl = getTrailerEmbedUrl(media.details.trailerUrl);
  const immersionScenes = buildImmersionScenes(media, storyGallery, deepDiveCards);
  const atlasGallery = buildAtlasGallery(gallery, storyGallery);
  const showAtlas = atlasGallery.length >= 1;
  const detailIdentity = normalizeTitleSignal([media.title, media.originalTitle ?? "", media.details.collectionTitle ?? ""].join(" "));
  const easterEgg = DETAIL_EASTER_EGGS.find((entry) => entry.matches.some((match) => detailIdentity.includes(normalizeTitleSignal(match))));
  const palette = easterEgg?.palette ?? DETAIL_PALETTES[hashPaletteKey(`${media.id}-${media.title}`) % DETAIL_PALETTES.length];
  const relatedTasteLine = buildRelatedTasteLine(media, filteredRelated, feelingTags);
  const detailPaletteStyle = {
    "--detail-accent": palette.accent,
    "--detail-accent-soft": palette.accentSoft,
    "--detail-glow": palette.glow,
    "--detail-edge": palette.edge,
    "--detail-haze": palette.haze,
  } as Record<string, string>;

  return (
    <PremiumMediaDetails media={media}>
      <div className="page-shell">
        <div className="app-shell-layout">
          <AppSidebar active="browse" initialFolders={sidebarFolders} />

          <main className={`workspace detail-layout ${easterEgg?.className ?? ""}`} style={detailPaletteStyle}>
            <DetailViewEffects />
            <VaultClientPrimer
              library={library}
              profile={shellData ? { ...shellData, viewedProfile: shellData.viewerProfile, watched: library?.watched ?? [], wishlist: library?.wishlist ?? [], canSeeWatched: true, canSeeWishlist: true, viewingOwnProfile: true } : null}
            />
            <AppTopBar
              viewerId={viewerId}
              viewerName={viewerName}
              viewerAvatar={viewerAvatar}
              initialProfile={shellData?.viewerProfile ?? null}
              initialFriends={shellData?.friends ?? []}
            />
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
              <div className="detail-stage-grid">
                <div className="detail-hero-copy">
                  <p className="eyebrow">{media.type}</p>
                  <h1 className="display detail-display">{media.title}</h1>
                  <p className="detail-lead">{moodLine}</p>
                  <p className="copy detail-overview-copy">{synopsisPreview}</p>
                  {seriesContext ? (
                    <div className="detail-favorite-note glass">
                      <p className="eyebrow">{seriesContext.relationshipLabel}</p>
                      <h2 className="headline detail-favorite-title">Connected to {seriesContext.parentSeriesTitle}</h2>
                      <p className="copy">{seriesContext.summary}</p>
                    </div>
                  ) : null}
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
                    {(animeFranchise?.seasonCount ?? media.details.seasonCount) ? (
                      <span className="detail-pill">{animeFranchise?.seasonCount ?? media.details.seasonCount} seasons</span>
                    ) : null}
                    {media.details.entryLabel ? <span className="detail-pill">{media.details.entryLabel}</span> : null}
                    {media.genres.map((genre) => (
                      <span key={genre} className="detail-pill">
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>

                <aside className="detail-side-poster glass detail-stage-trailer">
                  <div className={`detail-side-poster-media ${trailerEmbedUrl ? "detail-side-poster-media-trailer" : ""}`}>
                    {trailerEmbedUrl ? (
                      <iframe
                        src={trailerEmbedUrl}
                        title={`${media.title} trailer`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <ResilientMediaImage item={media} loading="eager" decoding="async" fetchPriority="high" />
                    )}
                  </div>
                </aside>

                <aside className="detail-stage-sidebar">
                  <section className="info-panel glass detail-facts-panel detail-stage-facts">
                    <div className="detail-facts-head">
                      <div>
                        <p className="eyebrow">Quick facts</p>
                        <h2 className="headline">The details you should catch at a glance</h2>
                      </div>
                    </div>
                    <div className="detail-side-stat-grid">
                      <div className="detail-side-stat detail-side-stat-emphasis">
                        <span>Release date</span>
                        <strong>{releaseValue}</strong>
                      </div>
                      <div className="detail-side-stat detail-side-stat-emphasis">
                        <span>{runtimeLabel}</span>
                        <strong>{runtimeValue}</strong>
                      </div>
                      <div className="detail-side-stat detail-side-stat-wide">
                        <span>Genres</span>
                        <strong>{genreValue}</strong>
                      </div>
                      <div className="detail-side-stat">
                        <span>Status</span>
                        <strong>{statusValue}</strong>
                      </div>
                      <div className="detail-side-stat">
                        <span>{studioLabel}</span>
                        <strong>{studioValue}</strong>
                      </div>
                      {sourceReference.url ? (
                        <div className="detail-side-stat detail-side-stat-wide">
                          <span>Source data</span>
                          <strong>
                            <a href={sourceReference.url} target="_blank" rel="noreferrer" className="detail-source-link">
                              Open {sourceReference.label}
                            </a>
                          </strong>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="info-panel glass detail-stage-franchise">
                    {franchiseSection ? (
                      <FranchiseRelatedSection
                        title={franchiseSection.title}
                        summary={franchiseSection.summary}
                        entries={franchiseSection.entries}
                        secondaryTitle={franchiseSection.secondaryTitle}
                        secondaryEntries={franchiseSection.secondaryEntries}
                      />
                    ) : (
                      <div className="detail-stage-franchise-empty">
                        <p className="eyebrow">Franchise</p>
                        <h2 className="headline">Standalone title</h2>
                        <p className="copy">No verified parent collection or storyline grouping was found for this entry.</p>
                      </div>
                    )}
                  </section>
                </aside>
              </div>
            </div>
          </section>

          <section className="info-grid detail-summary-grid">
            <div className="info-panel glass detail-vibe-panel">
              <p className="eyebrow">Vibe summary</p>
              <h2 className="headline">The fast no-BS read</h2>
              <div className="detail-vibe-list">
                {vibeSummary.map((item) => (
                  <div key={item.label} className="detail-vibe-row">
                    <span className="detail-vibe-label">{item.label}</span>
                    <p className="copy detail-vibe-value">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="info-panel glass detail-feel-panel">
              <p className="eyebrow">What this feels like</p>
              <h2 className="headline">The vibe in plain English</h2>
              <div className="detail-feel-tags">
                {feelingTags.map((tag) => (
                  <span key={tag} className="detail-feel-tag">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="copy detail-feel-copy">{relatedTasteLine}</p>
            </div>
          </section>

          <section className="section-stack" style={{ paddingTop: 0 }}>
            <div className="info-panel glass">
              <p className="eyebrow">
                {(media.type === "anime" || media.type === "anime_movie") && (animeFranchise?.seasonEntries?.length || animeFranchise?.entries.length) ? "Seasons / Parts" : "Cast / Credits"}
              </p>
              {(media.type === "anime" || media.type === "anime_movie") && (animeFranchise?.seasonEntries?.length || animeFranchise?.entries.length) ? (
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

          {characterHighlights.length ? (
            <section className="section-stack detail-character-section" style={{ paddingTop: 0 }}>
              <div className="section-header">
                <div>
                  <p className="eyebrow">{media.type === "game" ? "Key creatives" : "Character highlights"}</p>
                  <h2 className="headline">
                    {media.type === "game" ? "The names behind the feel" : "The names and faces worth knowing"}
                  </h2>
                  <p className="copy" style={{ maxWidth: 760, marginTop: 10 }}>
                    {media.type === "game"
                      ? "A spoiler-free read on the people and studios most tied to how this one plays."
                      : "A spoiler-free glance at the characters, cast, and creators most likely to shape the experience."}
                  </p>
                </div>
              </div>
              <div className="detail-character-scroll">
                {characterHighlights.map((highlight) => (
                  <article key={`${highlight.name}-${highlight.role}`} className="glass detail-character-card">
                    <p className="eyebrow">{highlight.role}</p>
                    <h3 className="headline detail-character-name">{highlight.name}</h3>
                    <p className="copy detail-character-copy">{highlight.summary}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="section-stack detail-world-stage" style={{ paddingTop: 0 }}>
            <div className="section-header">
              <div>
                <p className="eyebrow">Smart visual gallery</p>
                <h2 className="headline">The world, tone, and texture at a glance</h2>
                <p className="copy" style={{ maxWidth: 700, marginTop: 10 }}>
                  High-signal stills only: real backdrops, real scene shots, and a cleaner spread that helps you decide quickly instead of repeating the same frame.
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
                <p className="eyebrow">Decision guide</p>
                <h2 className="headline">The parts that make this one click fast</h2>
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

          <ExpandableRelatedSection 
            related={filteredRelated}
            franchiseSection={undefined}
            mediaTitle={media.title}
            showFranchiseSection={false}
          />
        </main>
      </div>
    </div>
    </PremiumMediaDetails>
  );
}
