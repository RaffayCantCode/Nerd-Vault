import { MediaItem } from "@/lib/types";

type FallbackGameSeed = [string, string, number, number, string[], string, string];

const fallbackGames: FallbackGameSeed[] = [
  ["elden-ring", "Elden Ring", 2022, 9.6, ["Action RPG", "Open World"], "The Lands Between call again with punishing combat, strange beauty, and the freedom to wander into legend.", "FromSoftware"],
  ["baldur-s-gate-3", "Baldur's Gate 3", 2023, 9.8, ["RPG", "Fantasy"], "A reactive, party-driven fantasy epic where every conversation and battle can rewrite the campaign.", "Larian Studios"],
  ["the-legend-of-zelda-tears-of-the-kingdom", "The Legend of Zelda: Tears of the Kingdom", 2023, 9.5, ["Adventure", "Open World"], "Sky islands, engineering chaos, and a Hyrule built for curiosity make every detour worthwhile.", "Nintendo"],
  ["hades", "Hades", 2020, 9.3, ["Roguelike", "Action"], "Fast, expressive runs through the underworld with a story that keeps rewarding one more escape attempt.", "Supergiant Games"],
  ["disco-elysium", "Disco Elysium", 2019, 9.4, ["RPG", "Narrative"], "A detective RPG where your inner voices are as important as your clues.", "ZA/UM"],
  ["persona-5-royal", "Persona 5 Royal", 2020, 9.2, ["JRPG", "Turn-Based"], "Stylish dungeon crawling and social simulation fuse into a long-form rebellion fantasy.", "Atlus"],
  ["red-dead-redemption-2", "Red Dead Redemption 2", 2018, 9.4, ["Action Adventure", "Open World"], "An outlaw saga with patient detail, tragic momentum, and one of the richest worlds in games.", "Rockstar Games"],
  ["the-witcher-3-wild-hunt", "The Witcher 3: Wild Hunt", 2015, 9.3, ["RPG", "Fantasy"], "Monster contracts, political scars, and side quests that feel like full novels.", "CD Projekt Red"],
  ["hollow-knight", "Hollow Knight", 2017, 9.1, ["Metroidvania", "Indie"], "An atmospheric underground kingdom where precision platforming and quiet melancholy live together.", "Team Cherry"],
  ["cyberpunk-2077", "Cyberpunk 2077", 2020, 8.6, ["Action RPG", "Sci-Fi"], "Night City delivers neon sprawl, character-driven quests, and chrome-heavy ambition.", "CD Projekt Red"],
  ["sekiro-shadows-die-twice", "Sekiro: Shadows Die Twice", 2019, 9.0, ["Action", "Soulslike"], "Sword clashes, posture breaks, and hard-earned mastery turn every duel into a test of rhythm.", "FromSoftware"],
  ["god-of-war-ragnarok", "God of War Ragnarok", 2022, 9.1, ["Action Adventure", "Mythology"], "A father-son journey through the end times with weighty combat and emotional scale.", "Santa Monica Studio"],
  ["ghost-of-tsushima", "Ghost of Tsushima", 2020, 8.8, ["Action Adventure", "Samurai"], "Wind-guided exploration and cinematic duels reshape a war-torn island into something poetic.", "Sucker Punch"],
  ["mass-effect-2", "Mass Effect 2", 2010, 9.2, ["Sci-Fi", "RPG"], "Build the team, survive the mission, and watch loyalty turn into one of gaming's best finales.", "BioWare"],
  ["chrono-trigger", "Chrono Trigger", 1995, 9.5, ["JRPG", "Classic"], "Time travel, brisk pacing, and a dream-team of creators still make it feel timeless.", "Square"],
  ["stardew-valley", "Stardew Valley", 2016, 9.0, ["Simulation", "Cozy"], "Farming, fishing, friendship, and a gentle sense that small routines can become a life.", "ConcernedApe"],
  ["outer-wilds", "Outer Wilds", 2019, 9.4, ["Exploration", "Mystery"], "A solar-system mystery designed around discovery, memory, and the thrill of understanding.", "Mobius Digital"],
  ["minecraft", "Minecraft", 2011, 9.0, ["Sandbox", "Survival"], "A build-anything sandbox that still feels limitless whether you want calm creation or risky expeditions.", "Mojang"],
  ["portal-2", "Portal 2", 2011, 9.5, ["Puzzle", "Comedy"], "Sharp writing and elegant co-op puzzles wrapped around one of the best mechanical ideas ever shipped.", "Valve"],
  ["final-fantasy-vii-rebirth", "Final Fantasy VII Rebirth", 2024, 9.0, ["JRPG", "Adventure"], "A lavish road trip through familiar places made larger, stranger, and more emotionally layered.", "Square Enix"],
  ["metaphor-refantazio", "Metaphor: ReFantazio", 2024, 8.9, ["JRPG", "Fantasy"], "Political fantasy, confident style, and social systems that echo Persona while carving their own path.", "Studio Zero"],
  ["animal-well", "Animal Well", 2024, 8.8, ["Puzzle", "Metroidvania"], "Dense secrets and quietly brilliant systems reward the kind of curiosity that lingers for weeks.", "Shared Memory"],
  ["astro-bot", "Astro Bot", 2024, 9.1, ["Platformer", "Family"], "Pure platforming joy packed with tactile movement and playful celebration of game history.", "Team Asobi"],
  ["silent-hill-2-remake", "Silent Hill 2", 2024, 8.7, ["Horror", "Psychological"], "A modernized return to dread, guilt, and one of survival horror's most haunting stories.", "Bloober Team"],
];

function buildCover(title: string, studio: string, accent: string, shadow: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1350">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${shadow}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="900" height="1350" fill="url(#bg)" />
      <rect x="78" y="86" width="744" height="1178" rx="44" fill="rgba(5,10,18,0.26)" stroke="rgba(255,255,255,0.12)" />
      <circle cx="724" cy="200" r="220" fill="rgba(255,255,255,0.08)" />
      <text x="118" y="990" fill="#f8fafc" font-family="Arial, sans-serif" font-size="78" font-weight="700">${title}</text>
      <text x="122" y="1080" fill="rgba(248,250,252,0.78)" font-family="Arial, sans-serif" font-size="36">${studio}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const accents = [
  ["#14b8a6", "#0f172a"],
  ["#f97316", "#111827"],
  ["#22c55e", "#0b1220"],
  ["#8b5cf6", "#111827"],
  ["#e11d48", "#131a2a"],
  ["#0ea5e9", "#101827"],
] as const;

function mapFallbackGame(
  [slug, title, year, rating, genres, overview, studio]: [string, string, number, number, string[], string, string],
  index: number,
): MediaItem {
  const [accent, shadow] = accents[index % accents.length];
  const cover = buildCover(title, studio, accent, shadow);

  return {
    id: `local-game-${slug}`,
    slug,
    source: "local",
    sourceId: `game-${slug}`,
    title,
    originalTitle: title,
    type: "game",
    year,
    rating,
    language: "en",
    genres,
    coverUrl: cover,
    backdropUrl: cover,
    screenshots: [cover],
    overview,
    credits: [{ name: studio, role: "Studio" }],
    details: {
      platform: "Multi-platform",
      status: "Released",
      studio,
      releaseInfo: `${year} release`,
      releaseDate: `${year}-01-01`,
    },
  };
}

export const fallbackGameCatalog = fallbackGames.map(mapFallbackGame);

export function browseFallbackGames(params: {
  page?: number;
  query?: string;
  genre?: string;
  sort?: "discovery" | "newest" | "rating" | "title";
}) {
  const page = Math.max(1, params.page ?? 1);
  const query = params.query?.trim().toLowerCase() ?? "";
  const genre = params.genre && params.genre !== "all" ? params.genre.toLowerCase() : "";
  const sort = params.sort ?? "discovery";
  const pageSize = 24;

  let items = [...fallbackGameCatalog];

  if (genre) {
    items = items.filter((item) => item.genres.some((value) => value.toLowerCase().includes(genre)));
  }

  if (query) {
    items = items.filter((item) => {
      const haystack = [item.title, item.overview, ...item.genres, item.details.studio ?? ""].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }

  items.sort((left, right) => {
    if (sort === "title") {
      return left.title.localeCompare(right.title);
    }
    if (sort === "newest") {
      return right.year - left.year || right.rating - left.rating;
    }
    return right.rating - left.rating || right.year - left.year;
  });

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pageItems = items.slice((page - 1) * pageSize, page * pageSize);

  return {
    page,
    totalPages,
    totalResults: items.length,
    items: pageItems,
  };
}
