import { MediaItem, MediaType } from "@/lib/types";

function normalizeGenreValue(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type GenreGroup = {
  label: string;
  types?: MediaType[];
  terms: string[];
};

const GENERAL_GENRE_GROUPS: GenreGroup[] = [
  { label: "Action", terms: ["action", "action adventure", "hack and slash", "beat em up"] },
  { label: "Adventure", terms: ["adventure", "exploration", "point and click"] },
  { label: "Fantasy", terms: ["fantasy", "magic"] },
  { label: "Humor", terms: ["comedy", "humor", "humorous", "parody", "party"] },
  { label: "Drama", terms: ["drama"] },
  { label: "Romance", terms: ["romance", "romantic"] },
  { label: "Sci-Fi", terms: ["sci fi", "science fiction", "mecha", "cyberpunk", "space"] },
  { label: "Horror", terms: ["horror", "survival horror"] },
  { label: "Mystery & Thriller", terms: ["mystery", "thriller", "suspense", "psychological", "detective"] },
  { label: "Family", terms: ["family", "kids"] },
  { label: "Sports", terms: ["sports"] },
  { label: "Crime", terms: ["crime", "gangster", "police"] },
];

const MOVIE_SHOW_GROUPS: GenreGroup[] = [
  ...GENERAL_GENRE_GROUPS,
  { label: "Documentary", types: ["movie", "show"], terms: ["documentary"] },
];

const ANIME_GROUPS: GenreGroup[] = [
  { label: "Action", types: ["anime"], terms: ["action", "martial arts", "super power"] },
  { label: "Adventure", types: ["anime"], terms: ["adventure"] },
  { label: "Fantasy", types: ["anime"], terms: ["fantasy", "magic"] },
  { label: "Humor", types: ["anime"], terms: ["comedy", "parody"] },
  { label: "Drama", types: ["anime"], terms: ["drama"] },
  { label: "Romance", types: ["anime"], terms: ["romance"] },
  { label: "Sci-Fi", types: ["anime"], terms: ["sci fi", "science fiction", "space"] },
  { label: "Horror", types: ["anime"], terms: ["horror", "gore"] },
  { label: "Mystery & Thriller", types: ["anime"], terms: ["mystery", "thriller", "suspense", "psychological"] },
  { label: "Slice of Life", types: ["anime"], terms: ["slice of life", "iyashikei"] },
  { label: "Sports", types: ["anime"], terms: ["sports"] },
  { label: "Shonen", types: ["anime"], terms: ["shounen", "shonen"] },
  { label: "Seinen", types: ["anime"], terms: ["seinen"] },
  { label: "Isekai", types: ["anime"], terms: ["isekai"] },
  { label: "Mecha", types: ["anime"], terms: ["mecha"] },
];

const GAME_GROUPS: GenreGroup[] = [
  { label: "Action", types: ["game"], terms: ["action", "hack and slash", "beat em up"] },
  { label: "Adventure", types: ["game"], terms: ["adventure", "point and click", "visual novel"] },
  { label: "RPG", types: ["game"], terms: ["role playing", "rpg", "action rpg", "jrpg"] },
  { label: "Shooter", types: ["game"], terms: ["shooter"] },
  { label: "Strategy", types: ["game"], terms: ["strategy", "tactical", "tactics", "turn based strategy", "real time strategy", "moba", "card and board game"] },
  { label: "Simulation", types: ["game"], terms: ["simulator", "simulation", "sandbox", "management"] },
  { label: "Horror", types: ["game"], terms: ["horror", "survival horror"] },
  { label: "Racing", types: ["game"], terms: ["racing"] },
  { label: "Sports", types: ["game"], terms: ["sport"] },
  { label: "Fighting", types: ["game"], terms: ["fighting"] },
  { label: "Puzzle", types: ["game"], terms: ["puzzle"] },
  { label: "Platformer", types: ["game"], terms: ["platform"] },
];

const ALL_KNOWN_GROUPS = [...GENERAL_GENRE_GROUPS, ...MOVIE_SHOW_GROUPS, ...ANIME_GROUPS, ...GAME_GROUPS];

function matchesTerm(value: string, term: string) {
  return value.includes(term) || term.includes(value);
}

function getItemSearchGenres(item: MediaItem) {
  return item.genres.map(normalizeGenreValue);
}

function genreGroupsForScope(scope: MediaType | "all") {
  switch (scope) {
    case "movie":
    case "show":
      return MOVIE_SHOW_GROUPS.filter((group) => !group.types || group.types.includes(scope));
    case "anime":
      return ANIME_GROUPS;
    case "game":
      return GAME_GROUPS;
    default:
      return GENERAL_GENRE_GROUPS;
  }
}

function matchingGroup(item: MediaItem, group: GenreGroup) {
  if (group.types && !group.types.includes(item.type)) {
    return false;
  }

  const itemGenres = getItemSearchGenres(item);
  return group.terms.some((term) => itemGenres.some((itemGenre) => matchesTerm(itemGenre, normalizeGenreValue(term))));
}

export function itemMatchesGenre(item: MediaItem, genre: string) {
  if (!genre || genre === "all") return true;

  const normalizedGenre = normalizeGenreValue(genre);
  const curatedMatch = ALL_KNOWN_GROUPS.find((group) => normalizeGenreValue(group.label) === normalizedGenre);

  if (curatedMatch) {
    return matchingGroup(item, curatedMatch);
  }

  const itemGenres = getItemSearchGenres(item);
  return itemGenres.some((itemGenre) => matchesTerm(itemGenre, normalizedGenre));
}

export function itemGenreLabels(item: MediaItem, scope: MediaType | "all" = "all") {
  const groups = genreGroupsForScope(scope);
  return groups.filter((group) => matchingGroup(item, group)).map((group) => group.label);
}

export function filterCatalog(
  catalog: MediaItem[],
  type: MediaType | "all",
  query: string,
) {
  const normalized = query.trim().toLowerCase();

  return catalog.filter((item) => {
    const matchesType = type === "all" || item.type === type;
    const haystack = `${item.title} ${item.originalTitle ?? ""} ${item.overview} ${item.genres.join(" ")}`.toLowerCase();
    return matchesType && (!normalized || haystack.includes(normalized));
  });
}

export function groupCounts(catalog: MediaItem[]) {
  return {
    all: catalog.length,
    movie: catalog.filter((item) => item.type === "movie").length,
    show: catalog.filter((item) => item.type === "show").length,
    anime: catalog.filter((item) => item.type === "anime").length,
    game: catalog.filter((item) => item.type === "game").length,
  };
}
