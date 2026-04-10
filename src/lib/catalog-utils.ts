import { MediaItem, MediaType } from "@/lib/types";

function normalizeGenreValue(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ANIME_GENRE_ALIASES: Record<string, string[]> = {
  "battle shonen": ["shounen", "shonen", "action", "adventure", "martial arts", "super power"],
  "shojo heartlines": ["shoujo", "shojo", "romance", "drama", "slice of life"],
  "after hours seinen": ["seinen", "psychological", "thriller", "mystery", "horror"],
  "josei slow burn": ["josei", "romance", "drama", "adult cast"],
  "saturday morning kodomo": ["kids", "family", "kodomo"],
  "isekai fever dream": ["isekai", "fantasy", "adventure"],
  "cosmic mind-benders": ["sci fi", "mecha", "psychological", "space"],
  "dark supernatural": ["supernatural", "horror", "demons", "vampire", "suspense"],
  "rom-com spiral": ["romance", "comedy", "school", "harem"],
  "cozy chaos comedy": ["comedy", "slice of life", "gourmet", "iyashikei"],
  "sports adrenaline": ["sports"],
  "fantasy questlines": ["fantasy", "adventure", "magic"],
  "boys love": ["boys love", "bl"],
  "girls love": ["girls love", "gl"],
};

function genreTerms(genre: string) {
  const normalized = normalizeGenreValue(genre);

  if (ANIME_GENRE_ALIASES[normalized]) {
    return [normalized, ...ANIME_GENRE_ALIASES[normalized]];
  }

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
  if (item.type === "anime") {
    const normalizedGenres = item.genres.map(normalizeGenreValue);
    const labels = new Set<string>();

    const hasAny = (...terms: string[]) =>
      terms.some((term) => normalizedGenres.some((genre) => genre.includes(term) || term.includes(genre)));

    if (hasAny("shounen", "shonen", "martial arts", "super power")) labels.add("Battle Shonen");
    if (hasAny("shoujo", "shojo")) labels.add("Shojo Heartlines");
    if (hasAny("seinen", "psychological", "thriller", "mystery")) labels.add("After Hours Seinen");
    if (hasAny("josei")) labels.add("Josei Slow Burn");
    if (hasAny("kids", "family", "kodomo")) labels.add("Saturday Morning Kodomo");
    if (hasAny("isekai")) labels.add("Isekai Fever Dream");
    if (hasAny("sci fi", "mecha", "space")) labels.add("Cosmic Mind-Benders");
    if (hasAny("supernatural", "horror", "demons", "vampire", "suspense")) labels.add("Dark Supernatural");
    if (hasAny("romance", "comedy", "school", "harem")) labels.add("Rom-Com Spiral");
    if (hasAny("comedy", "slice of life", "gourmet", "iyashikei")) labels.add("Cozy Chaos Comedy");
    if (hasAny("sports")) labels.add("Sports Adrenaline");
    if (hasAny("fantasy", "adventure", "magic")) labels.add("Fantasy Questlines");
    if (hasAny("boys love", "bl")) labels.add("Boys Love");
    if (hasAny("girls love", "gl")) labels.add("Girls Love");
    if (item.rating >= 8.2) labels.add("Critics' Darlings");

    if (labels.size) {
      return [...labels];
    }
  }

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
