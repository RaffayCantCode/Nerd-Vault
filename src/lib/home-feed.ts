import { browseIgdbGames, getIgdbFranchiseEntries } from "@/lib/sources/igdb";
import { browseJikanAnime, getJikanAnimeFranchise, getJikanAnimeDetails } from "@/lib/sources/jikan";
import { browseTmdbCatalog, getTmdbFranchiseEntries, getTmdbMediaDetails } from "@/lib/sources/tmdb";
import { MediaItem, MediaType } from "@/lib/types";
import { LibraryState } from "@/lib/vault-types";

export type HomeContinuation = {
  base: MediaItem;
  continuation: MediaItem;
  label: string;
  dateLabel: string;
  sortDate: string;
  reason: string;
};

export type HomeFeed = {
  greeting: string;
  sections: Record<MediaType, MediaItem[]>;
  upcoming: HomeContinuation[];
  watchedCounts: Record<MediaType, number>;
};

type SeedOrigin = "watched" | "wishlist" | "folder";

type SignalSeed = {
  item: MediaItem;
  weight: number;
  origin: SeedOrigin;
};

function dedupeItems(items: MediaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.source}-${item.sourceId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTitleRoot(item: MediaItem) {
  const candidate = item.details.collectionTitle || item.title;
  return normalizeText(candidate)
    .replace(/\b(season|part|chapter|volume|episode|edition|collection|complete)\b/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSignals(item: MediaItem) {
  const roots = new Set<string>();
  const titleRoot = buildTitleRoot(item);
  if (titleRoot.length >= 4) roots.add(titleRoot);

  const prefix = normalizeText(item.title).split(" ").slice(0, 3).join(" ");
  if (prefix.length >= 4) roots.add(prefix);

  if (item.details.studio) {
    const studio = normalizeText(item.details.studio);
    if (studio.length >= 4) roots.add(studio);
  }

  return Array.from(roots).slice(0, 3);
}

function parseInstallment(title: string) {
  const match = title.toLowerCase().match(/\b(season|part|chapter|episode)\s+(\d+)\b/);
  if (match) return Number(match[2]);

  const trailing = title.toLowerCase().match(/\b(\d+)\b\s*$/);
  if (trailing) return Number(trailing[1]);

  return null;
}

function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

async function withTimeout<T>(work: Promise<T>, fallback: T, timeoutMs = 1600) {
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

function buildSignalSeeds(library: LibraryState, type: MediaType) {
  const folderItems = library.folders.flatMap((folder) => folder.items);
  const dedupe = new Set<string>();
  const seeds: SignalSeed[] = [];

  const pushSeed = (item: MediaItem, origin: SeedOrigin, weight: number) => {
    if (item.type !== type) return;
    const key = `${item.source}-${item.sourceId}`;
    if (dedupe.has(key)) return;
    dedupe.add(key);
    seeds.push({ item, origin, weight });
  };

  library.watched.forEach((item) => pushSeed(item, "watched", 3));
  library.wishlist.forEach((item) => pushSeed(item, "wishlist", 2));
  folderItems.forEach((item) => pushSeed(item, "folder", 1.5));

  return seeds;
}

function scoreCandidate(seeds: SignalSeed[], candidate: MediaItem, ownedKeys: Set<string>) {
  const candidateKey = `${candidate.source}-${candidate.sourceId}`;
  if (ownedKeys.has(candidateKey)) return -999;

  let score = candidate.rating * 1.5;
  const candidateRoot = buildTitleRoot(candidate);
  let strongestAffinity = 0;

  for (const seed of seeds) {
    const sharedGenres = candidate.genres.filter((genre) => seed.item.genres.includes(genre)).length;
    let affinity = sharedGenres * 14;

    if (
      seed.item.details.studio &&
      candidate.details.studio &&
      normalizeText(seed.item.details.studio) === normalizeText(candidate.details.studio)
    ) {
      affinity += 26;
    }

    const seedRoot = buildTitleRoot(seed.item);
    if (seedRoot && candidateRoot && (seedRoot.includes(candidateRoot) || candidateRoot.includes(seedRoot))) {
      affinity += 48;
    }

    if (
      seed.item.details.collectionTitle &&
      candidate.details.collectionTitle &&
      normalizeText(seed.item.details.collectionTitle) === normalizeText(candidate.details.collectionTitle)
    ) {
      affinity += 54;
    }

    const yearGap = Math.abs((candidate.year || 0) - (seed.item.year || 0));
    if (yearGap <= 2) affinity += 8;
    else if (yearGap <= 5) affinity += 4;

    strongestAffinity = Math.max(strongestAffinity, affinity);
    score += affinity * seed.weight;
  }

  if (strongestAffinity < 18) {
    return -999;
  }

  return score;
}

function topGenres(seeds: SignalSeed[]) {
  const counts = new Map<string, number>();
  seeds.forEach((seed) => {
    seed.item.genres.forEach((genre) => counts.set(genre, (counts.get(genre) ?? 0) + seed.weight));
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre)
    .slice(0, 2);
}

function topSignals(seeds: SignalSeed[]) {
  const counts = new Map<string, number>();
  seeds.forEach((seed) => {
    buildSignals(seed.item).forEach((signal) => counts.set(signal, (counts.get(signal) ?? 0) + seed.weight));
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([signal]) => signal)
    .slice(0, 2);
}

async function gatherRelatedCandidates(type: MediaType, seeds: SignalSeed[]) {
  const focusSeeds = seeds.slice(0, 3);

  if (type === "movie") {
    const results = await Promise.all(
      focusSeeds.flatMap((seed) => [
        seed.item.source === "tmdb"
          ? getTmdbFranchiseEntries(Number(seed.item.sourceId), "movie").catch(() => [] as MediaItem[])
          : Promise.resolve([] as MediaItem[]),
      ]),
    );
    return dedupeItems(results.flatMap((group) => group));
  }

  if (type === "show") {
    const results = await Promise.all(
      focusSeeds.flatMap((seed) => [
        seed.item.source === "tmdb"
          ? getTmdbFranchiseEntries(Number(seed.item.sourceId), "tv").catch(() => [] as MediaItem[])
          : Promise.resolve([] as MediaItem[]),
      ]),
    );
    return dedupeItems(results.flatMap((group) => group));
  }

  if (type === "game") {
    const results = await Promise.all(
      focusSeeds.flatMap((seed) => [
        seed.item.source === "igdb"
          ? getIgdbFranchiseEntries(Number(seed.item.sourceId)).catch(() => [] as MediaItem[])
          : Promise.resolve([] as MediaItem[]),
      ]),
    );
    return dedupeItems(results.flatMap((group) => group));
  }

  if (type === "anime") {
    const results = await Promise.all(
      focusSeeds.flatMap((seed, index) =>
        buildSignals(seed.item).slice(0, 2).map((query, queryIndex) =>
          browseJikanAnime({
            page: 1,
            query,
            sort: "rating",
            seed: 211 + index * 10 + queryIndex,
          })
            .then((result) => result.items)
            .catch(() => [] as MediaItem[]),
        ),
      ),
    );
    return dedupeItems(results.flatMap((group) => group));
  }

  return [] as MediaItem[];
}

async function gatherCandidates(type: MediaType, genres: string[], signals: string[]) {
  if (type === "movie" || type === "show") {
    const results = await Promise.all([
      ...genres.map((genre, index) =>
        withTimeout(
          browseTmdbCatalog({ type, page: 1, genre, sort: "rating", seed: 11 + index }),
          emptyBrowseResult(),
        ),
      ),
      ...signals.map((query, index) =>
        withTimeout(
          browseTmdbCatalog({ type, page: 1, query, sort: "rating", seed: 31 + index }),
          emptyBrowseResult(),
        ),
      ),
    ]);

    return dedupeItems(results.flatMap((result) => result.items));
  }

  if (type === "anime") {
    const results = await Promise.all([
      ...genres.map((genre, index) =>
        withTimeout(
          browseJikanAnime({ page: 1, genre, sort: index === 0 ? "rating" : "discovery", seed: 51 + index }),
          emptyBrowseResult(),
        ),
      ),
      ...signals.map((query, index) =>
        withTimeout(
          browseJikanAnime({ page: 1, query, sort: "rating", seed: 71 + index }),
          emptyBrowseResult(),
        ),
      ),
    ]);

    return dedupeItems(results.flatMap((result) => result.items));
  }

  const results = await Promise.all([
    ...genres.map((genre, index) =>
      withTimeout(
        browseIgdbGames({ page: 1, genre, sort: index === 0 ? "rating" : "discovery", seed: 91 + index }),
        emptyBrowseResult(),
        8000,
      ),
    ),
    ...signals.map((query, index) =>
      withTimeout(
        browseIgdbGames({ page: 1, query, sort: "rating", seed: 111 + index }),
        emptyBrowseResult(),
        8000,
      ),
    ),
  ]);

  return dedupeItems(results.flatMap((result) => result.items));
}

async function buildRecommendationsForType(type: MediaType, library: LibraryState, ownedKeys: Set<string>) {
  const watchedSeeds = watchedItemsFromLibrary(library).filter((item) => item.type === type);
  if (!watchedSeeds.length) return [] as MediaItem[];

  const seeds = buildSignalSeeds(library, type);
  const [relatedCandidates, discoveryCandidates] = await Promise.all([
    gatherRelatedCandidates(type, seeds).catch(() => [] as MediaItem[]),
    gatherCandidates(type, topGenres(seeds), topSignals(seeds)).catch(() => [] as MediaItem[]),
  ]);

  const candidates = dedupeItems([...relatedCandidates, ...discoveryCandidates]);
  return candidates
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(seeds, candidate, ownedKeys),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.candidate)
    .slice(0, 8);
}

function watchedItemsFromLibrary(library: LibraryState) {
  return dedupeItems(library.watched);
}

async function findUpcomingForAnime(base: MediaItem, ownedKeys: Set<string>) {
  if (base.source !== "jikan") return null;

  const franchise = await getJikanAnimeFranchise(Number(base.sourceId)).catch(() => null);
  if (!franchise?.entries.length) return null;

  const today = new Date().toISOString().slice(0, 10);
  const currentOrder = parseInstallment(base.title) ?? 0;
  const nextEntry = franchise.entries.find((entry) => {
    if (!entry.releaseDate || entry.releaseDate <= today) return false;
    if (ownedKeys.has(`jikan-${entry.id}`)) return false;
    const order = parseInstallment(entry.title) ?? 0;
    return order > currentOrder || entry.year >= base.year;
  });

  if (!nextEntry) return null;
  const nextReleaseDate = nextEntry.releaseDate;
  if (!nextReleaseDate) return null;

  const continuation: MediaItem = {
    id: `jikan-${nextEntry.id}`,
    slug: nextEntry.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    source: "jikan",
    sourceId: String(nextEntry.id),
    title: nextEntry.title,
    type: "anime",
    originalTitle: nextEntry.title,
    year: nextEntry.year,
    rating: nextEntry.rating,
    language: "ja",
    genres: base.genres,
    coverUrl: base.coverUrl,
    backdropUrl: base.backdropUrl,
    overview: "A new connected anime entry is on the way.",
    credits: [],
    details: {
      status: nextEntry.status,
      releaseDate: nextEntry.releaseDate,
      releaseInfo: nextEntry.episodes ? `${nextEntry.episodes} episodes` : undefined,
      collectionTitle: franchise.title,
    },
  };

  return {
    base,
    continuation,
    label: parseInstallment(nextEntry.title) ? "Next season / part" : "Another anime entry",
    dateLabel: formatDate(nextReleaseDate),
    sortDate: nextReleaseDate,
    reason: `${nextEntry.title} is still ahead of what you've already watched.`,
  } satisfies HomeContinuation;
}

async function findUpcomingForShow(base: MediaItem, ownedKeys: Set<string>) {
  const today = new Date().toISOString().slice(0, 10);

  if (base.source === "tmdb") {
    const currentShow = await getTmdbMediaDetails(Number(base.sourceId), "tv").catch(() => null);
    const nextEpisodeDate = currentShow?.details.nextEpisodeDate;
    const status = currentShow?.details.status?.toLowerCase() ?? "";

    if (
      currentShow &&
      nextEpisodeDate &&
      nextEpisodeDate >= today &&
      !status.includes("ended") &&
      !status.includes("cancelled")
    ) {
      return {
        base,
        continuation: currentShow,
        label: "Currently airing",
        dateLabel: formatDate(nextEpisodeDate),
        sortDate: nextEpisodeDate,
        reason: `${currentShow.title} still has weekly episodes scheduled, so it stays in your upcoming lane until the run finishes.`,
      } satisfies HomeContinuation;
    }
  }

  const signals = buildSignals(base);
  const results = await Promise.all(
    signals.slice(0, 2).map((query, index) =>
      withTimeout(
        browseTmdbCatalog({ type: "show", page: 1, query, sort: "newest", seed: 151 + index }),
        emptyBrowseResult(),
      ),
    ),
  );

  const candidates = dedupeItems(results.flatMap((result) => result.items))
    .filter((candidate) => candidate.type === "show")
    .filter((candidate) => `${candidate.source}-${candidate.sourceId}` !== `${base.source}-${base.sourceId}`)
    .filter((candidate) => !ownedKeys.has(`${candidate.source}-${candidate.sourceId}`))
    .filter((candidate) => Boolean(candidate.details.releaseDate && candidate.details.releaseDate > today))
    .filter((candidate) => {
      const baseRoot = buildTitleRoot(base);
      const candidateRoot = buildTitleRoot(candidate);
      return baseRoot && candidateRoot && (baseRoot.includes(candidateRoot) || candidateRoot.includes(baseRoot));
    })
    .sort((a, b) => (a.details.releaseDate ?? "").localeCompare(b.details.releaseDate ?? ""));

  if (!candidates.length) return null;
  const continuation = candidates[0];

  return {
    base,
    continuation,
    label: parseInstallment(continuation.title) ? "Next season / chapter" : "New related release",
    dateLabel: formatDate(continuation.details.releaseDate as string),
    sortDate: continuation.details.releaseDate as string,
    reason: `${continuation.title} looks like the next connected release for something you've already finished.`,
  } satisfies HomeContinuation;
}

async function buildUpcomingContinuations(library: LibraryState) {
  const ownedKeys = new Set(
    dedupeItems([
      ...library.watched,
      ...library.wishlist,
      ...library.folders.flatMap((folder) => folder.items),
    ]).map((item) => `${item.source}-${item.sourceId}`),
  );

  const watchedSeries = dedupeItems(library.watched)
    .filter((item) => item.type === "show" || item.type === "anime")
    .slice(0, 8);

  const continuations = await Promise.all(
    watchedSeries.map((item) => (item.type === "anime" ? findUpcomingForAnime(item, ownedKeys) : findUpcomingForShow(item, ownedKeys))),
  );

  return continuations
    .filter((item): item is HomeContinuation => Boolean(item))
    .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
    .slice(0, 6);
}

function buildGreeting(library: LibraryState) {
  const total = library.watched.length + library.wishlist.length + library.folders.reduce((sum, folder) => sum + folder.items.length, 0);
  const variants = [
    "Oh, so that's your taste. Here's more of what fits your vault.",
    "Your shelf is giving strong signals. Here's more of the stuff you actually seem to like.",
    "This vault already has a vibe. I pulled more picks that line up with it.",
    "You've got a pattern going. Here's the next wave built around that taste.",
  ];

  return variants[total % variants.length];
}

export async function buildHomeFeed(library: LibraryState): Promise<HomeFeed> {
  const watchedItems = watchedItemsFromLibrary(library);
  const libraryItems = dedupeItems([
    ...watchedItems,
    ...library.wishlist,
    ...library.folders.flatMap((folder) => folder.items),
  ]);
  const ownedKeys = new Set(libraryItems.map((item) => `${item.source}-${item.sourceId}`));
  const watchedCounts: Record<MediaType, number> = {
    movie: watchedItems.filter((item) => item.type === "movie").length,
    show: watchedItems.filter((item) => item.type === "show").length,
    anime: watchedItems.filter((item) => item.type === "anime").length,
    anime_movie: watchedItems.filter((item) => item.type === "anime_movie").length,
    all: watchedItems.length,
    game: watchedItems.filter((item) => item.type === "game").length,
  };

  const [movies, shows, anime, games, upcoming] = await Promise.all([
    buildRecommendationsForType("movie", library, ownedKeys).catch(() => []),
    buildRecommendationsForType("show", library, ownedKeys).catch(() => []),
    buildRecommendationsForType("anime", library, ownedKeys).catch(() => []),
    buildRecommendationsForType("game", library, ownedKeys).catch(() => []),
    buildUpcomingContinuations(library).catch(() => []),
  ]);

  return {
    greeting: buildGreeting(library),
    upcoming,
    watchedCounts,
    sections: {
      movie: movies,
      show: shows,
      anime,
      "anime_movie": [],
      all: [],
      game: games,
    },
  };
}
