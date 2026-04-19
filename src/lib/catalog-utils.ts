import { MediaItem, MediaType } from "@/lib/types";
import { itemMatchesSearch } from "@/lib/search-utils";

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
  terms: string[];
};

const CANONICAL_GENRE_GROUPS: GenreGroup[] = [
  { label: "Action", terms: ["action", "action adventure", "beat em up", "hack and slash", "martial arts", "super power"] },
  { label: "Adventure", terms: ["adventure", "exploration", "point and click", "journey"] },
  { label: "Fantasy", terms: ["fantasy", "magic", "dark fantasy", "high fantasy", "sword and sorcery"] },
  { label: "Humor", terms: ["comedy", "humor", "humorous", "parody", "satire", "party"] },
  { label: "Drama", terms: ["drama", "melodrama"] },
  { label: "Romance", terms: ["romance", "romantic", "dating sim"] },
  { label: "Sci-Fi", terms: ["sci fi", "science fiction", "space", "cyberpunk", "mecha", "futuristic"] },
  { label: "Horror", terms: ["horror", "survival horror", "gore"] },
  { label: "Mystery & Thriller", terms: ["mystery", "thriller", "suspense", "psychological", "detective", "crime thriller"] },
  { label: "Crime", terms: ["crime", "gangster", "mafia", "police", "heist"] },
  { label: "Family", terms: ["family", "kids", "children"] },
  { label: "Sports", terms: ["sports", "sport"] },
  { label: "RPG", terms: ["role playing", "rpg", "jrpg", "action rpg", "crpg"] },
  { label: "Shooter", terms: ["shooter", "first person shooter", "third person shooter", "hero shooter", "tactical shooter"] },
  { label: "Strategy", terms: ["strategy", "tactical", "tactics", "turn based strategy", "real time strategy", "moba"] },
  { label: "Simulation", terms: ["simulation", "simulator", "sandbox", "management", "life sim"] },
  { label: "Racing", terms: ["racing", "vehicular combat"] },
  { label: "Fighting", terms: ["fighting", "fighter"] },
  { label: "Puzzle", terms: ["puzzle"] },
  { label: "Platformer", terms: ["platform", "platformer", "metroidvania"] },
  { label: "Slice of Life", terms: ["slice of life", "iyashikei", "cozy"] },
  { label: "Shonen", terms: ["shounen", "shonen"] },
  { label: "Seinen", terms: ["seinen"] },
  { label: "Isekai", terms: ["isekai"] },
  { label: "Mecha", terms: ["mecha"] },
  { label: "Documentary", terms: ["documentary"] },
];

function matchesTerm(value: string, term: string) {
  return value.includes(term) || term.includes(value);
}

function getItemSearchGenres(item: MediaItem) {
  return item.genres.map(normalizeGenreValue);
}

function matchingGroup(item: MediaItem, group: GenreGroup) {
  const itemGenres = getItemSearchGenres(item);
  return group.terms.some((term) => itemGenres.some((itemGenre) => matchesTerm(itemGenre, normalizeGenreValue(term))));
}

export function canonicalGenreLabels(item: MediaItem) {
  return CANONICAL_GENRE_GROUPS.filter((group) => matchingGroup(item, group)).map((group) => group.label);
}

export function sharedCanonicalGenreCount(left: MediaItem, right: MediaItem) {
  const leftLabels = new Set(canonicalGenreLabels(left));
  const rightLabels = new Set(canonicalGenreLabels(right));
  let total = 0;

  for (const label of leftLabels) {
    if (rightLabels.has(label)) {
      total += 1;
    }
  }

  return total;
}

export function itemMatchesGenre(item: MediaItem, genre: string) {
  if (!genre || genre === "all") return true;

  const normalizedGenre = normalizeGenreValue(genre);
  const curatedMatch = CANONICAL_GENRE_GROUPS.find((group) => normalizeGenreValue(group.label) === normalizedGenre);

  if (curatedMatch) {
    return matchingGroup(item, curatedMatch);
  }

  const itemGenres = getItemSearchGenres(item);
  return itemGenres.some((itemGenre) => matchesTerm(itemGenre, normalizedGenre));
}

export function itemGenreLabels(item: MediaItem, scope: MediaType | "all" = "all") {
  const labels = canonicalGenreLabels(item);

  if (scope === "all") {
    return labels;
  }

  return labels.filter((label) => {
    if (scope === "game") {
      return true;
    }

    return label !== "RPG" &&
      label !== "Shooter" &&
      label !== "Strategy" &&
      label !== "Simulation" &&
      label !== "Racing" &&
      label !== "Fighting" &&
      label !== "Puzzle" &&
      label !== "Platformer";
  });
}

export function filterCatalog(
  catalog: MediaItem[],
  type: MediaType | "all",
  query: string,
) {
  const trimmed = query.trim();

  return catalog.filter((item) => {
    const matchesType = type === "all" || item.type === type;
    if (!trimmed) return matchesType;
    return matchesType && itemMatchesSearch(item, trimmed);
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
