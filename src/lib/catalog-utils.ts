import { MediaItem, MediaType } from "@/lib/types";

function normalizeGenreValue(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function genreTerms(genre: string) {
  const normalized = normalizeGenreValue(genre);

  switch (normalized) {
    case "action":
      return ["action", "action and adventure", "action adventure", "hack and slash beat em up"];
    case "action and adventure":
    case "action adventure":
      return ["action", "adventure", "action and adventure", "action adventure"];
    case "adventure":
      return ["adventure", "action and adventure", "action adventure"];
    case "family":
      return ["family", "kids"];
    case "award winning":
      return ["award winning"];
    case "hack and slash beat em up":
      return ["hack and slash beat em up", "hack and slash", "beat em up", "action"];
    default:
      return [normalized];
  }
}

export function itemMatchesGenre(item: MediaItem, genre: string) {
  if (!genre || genre === "all") return true;

  const normalizedGenre = normalizeGenreValue(genre);
  if (normalizedGenre === "award winning") {
    return item.rating >= 8;
  }

  const itemGenres = item.genres.map(normalizeGenreValue);
  const terms = genreTerms(genre);

  return terms.some((term) => itemGenres.some((itemGenre) => itemGenre.includes(term) || term.includes(itemGenre)));
}

export function itemGenreLabels(item: MediaItem) {
  const labels = new Set<string>();

  item.genres.forEach((genre) => labels.add(genre));
  if (item.genres.some((genre) => {
    const normalized = normalizeGenreValue(genre);
    return normalized.includes("action") || normalized.includes("hack and slash") || normalized.includes("beat em up");
  })) {
    labels.add("Action");
  }
  if (item.genres.some((genre) => {
    const normalized = normalizeGenreValue(genre);
    return normalized.includes("family") || normalized.includes("kids");
  })) {
    labels.add("Family");
  }
  if (item.rating >= 8) {
    labels.add("Award Winning");
  }

  return [...labels];
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
