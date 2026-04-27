"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { CatalogCard } from "@/components/catalog-card";
import { FilterChipBar } from "@/components/filter-chip-bar";
import { NVLoader } from "@/components/nv-loader";
import { filterCatalog, itemGenreLabels, itemMatchesGenre } from "@/lib/catalog-utils";
import { clearBrowseReturnContext, readBrowseReturnContext, writeBrowseReturnContext, writeDetailReturnTarget } from "@/lib/detail-return";
import { optimizeMediaImageUrl } from "@/lib/media-image";
import { dedupeMediaKey, rankCandidatesForQuery } from "@/lib/search-utils";
import { MediaItem, MediaType } from "@/lib/types";

type SortMode = "discovery" | "newest" | "rating" | "title";
type CachedPage = {
  items: MediaItem[];
  totalPages: number;
  cachedAt?: number;
};

const BROWSE_SCROLL_KEY = "nerdvault-browse-scroll";
const BROWSE_STATE_KEY = "nerdvault-browse-state";
const BROWSE_PAGE_CACHE_KEY = "nerdvault-browse-page-cache-v3";
const BROWSE_LAST_URL_KEY = "nerdvault-browse-last-url";
const BROWSE_BOOTSTRAP_CACHE_KEY = "nerdvault-browse-bootstrap-v3";
const BROWSE_SEED_KEY = "nerdvault-browse-seed-v1";
const BROWSE_CACHE_TTL_MS = 1000 * 60 * 10;
const MAX_BROWSE_PAGE_COUNT = 100;
const HERO_AUTO_ROTATE_MS = 3000;
const warmedImageUrls = new Set<string>();

function normalizeBrowseTotalPages(totalPages: number, isSearch = false) {
  if (isSearch) {
    return 1;
  }

  if (!Number.isFinite(totalPages)) {
    return 1;
  }

  return Math.max(1, Math.min(MAX_BROWSE_PAGE_COUNT, Math.floor(totalPages)));
}

function isReloadNavigation() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigationEntries = window.performance.getEntriesByType("navigation");
  const firstEntry = navigationEntries[0] as PerformanceNavigationTiming | undefined;
  return firstEntry?.type === "reload";
}

function getBrowsePageSize(_viewportWidth: number) {
  // Fixed at 24 titles per page as requested
  return 24;
}

function scrollToElementWithOffset(element: HTMLElement | null, offset: number, behavior: ScrollBehavior = "auto") {
  if (!element) return;

  const nextTop = Math.max(0, window.scrollY + element.getBoundingClientRect().top - offset);
  window.scrollTo({ top: nextTop, behavior });
}

function preloadImage(url?: string | null) {
  if (typeof window === "undefined" || !url) {
    return;
  }

  if (warmedImageUrls.has(url)) {
    return;
  }
  warmedImageUrls.add(url);

  const image = new Image();
  image.decoding = "async";
  image.src = url;
}

function isSafeForSurfacing(item: MediaItem) {
  const unsafeGenreTerms = ["ecchi", "erotica", "hentai", "adult", "softcore"];
  const unsafeTextTerms = ["ecchi", "erotic", "sexual", "seductive", "lust", "bdsm"];
  const haystack = [item.title, item.originalTitle ?? "", item.overview, ...item.genres].join(" ").toLowerCase();

  return !unsafeGenreTerms.some((term) => item.genres.some((genre) => genre.toLowerCase().includes(term))) &&
    !unsafeTextTerms.some((term) => haystack.includes(term));
}

function readBrowsePageCache() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(BROWSE_PAGE_CACHE_KEY);
    if (!raw) return {} as Record<string, CachedPage>;
    const parsed = JSON.parse(raw) as Record<string, CachedPage>;

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => {
        if (!value?.cachedAt) return true;
        return Date.now() - value.cachedAt < BROWSE_CACHE_TTL_MS;
      }),
    ) as Record<string, CachedPage>;
  } catch {
    return {} as Record<string, CachedPage>;
  }
}

function writeBrowsePageCache(cache: Record<string, CachedPage>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(BROWSE_PAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors and continue with in-memory cache.
  }
}

function buildCacheKey(filter: MediaType | "all", page: number, genre: string, query: string, sort: SortMode, seed: number, pageSize: number) {
  return `${filter}-${page}-${genre}-${query.trim().toLowerCase()}-${sort}-${seed}-${pageSize}`;
}

function buildBrowseHref(filter: MediaType | "all", page: number, genre: string, query: string, sort: SortMode, seed: number) {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", String(page));
  }
  if (filter !== "all") {
    params.set("mediaType", filter);
  }
  if (genre !== "all") {
    params.set("genre", genre);
  }
  if (sort !== "discovery") {
    params.set("sort", sort);
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery) {
    params.set("query", trimmedQuery);
  }

  params.set("seed", String(seed));
  return params.toString() ? `/browse?${params.toString()}` : "/browse";
}

function hashString(input: string) {
  return input.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

function shuffleBySeed(items: MediaItem[], seed: number) {
  return [...items]
    .map((item, index) => ({
      item,
      key: Math.sin(seed + hashString(item.id) + index) * 10000,
    }))
    .sort((left, right) => left.key - right.key)
    .map((entry) => entry.item);
}

function interleaveTypeBuckets(buckets: MediaItem[][]) {
  const working = buckets.map((bucket) => [...bucket]);
  const mixed: MediaItem[] = [];

  while (working.some((bucket) => bucket.length)) {
    for (const bucket of working) {
      if (bucket.length) {
        mixed.push(bucket.shift() as MediaItem);
      }
    }
  }

  return mixed;
}

function takeBalancedTypeMix(items: MediaItem[], targetTotal = 24) {
  const buckets = {
    movie: items.filter((item) => item.type === "movie"),
    show: items.filter((item) => item.type === "show"),
    anime: items.filter((item) => item.type === "anime"),
    game: items.filter((item) => item.type === "game"),
  };

  const perTypeTarget = Math.max(1, Math.floor(targetTotal / 4));
  const picked: MediaItem[] = [
    ...buckets.movie.slice(0, perTypeTarget),
    ...buckets.show.slice(0, perTypeTarget),
    ...buckets.anime.slice(0, perTypeTarget),
    ...buckets.game.slice(0, perTypeTarget),
  ];

  if (picked.length >= targetTotal) {
    return interleaveTypeBuckets([
      picked.filter((item) => item.type === "movie"),
      picked.filter((item) => item.type === "show"),
      picked.filter((item) => item.type === "anime"),
      picked.filter((item) => item.type === "game"),
    ]).slice(0, targetTotal);
  }

  const overflow = interleaveTypeBuckets([
    buckets.movie.slice(perTypeTarget),
    buckets.show.slice(perTypeTarget),
    buckets.anime.slice(perTypeTarget),
    buckets.game.slice(perTypeTarget),
  ]);

  return interleaveTypeBuckets([
    picked.filter((item) => item.type === "movie"),
    picked.filter((item) => item.type === "show"),
    picked.filter((item) => item.type === "anime"),
    picked.filter((item) => item.type === "game"),
    [...overflow],
  ]).slice(0, targetTotal);
}

function getRecencyBoost(year: number) {
  if (!year) return 0;
  const currentYear = new Date().getFullYear();
  const distance = Math.abs(currentYear - year);
  return Math.max(0, 8 - distance);
}

function buildSurfacingDeck(items: MediaItem[], seed: number, filter: MediaType | "all") {
  // Always pick exactly one per type for the "Now Surfacing" rail.
  // Uses a mix of rating + recency + pure randomness so underrated gems surface too.
  const types: MediaType[] = ["movie", "show", "anime", "game"];

  const pickForType = (type: MediaType, typeSalt: number): MediaItem | undefined => {
    const pool = items.filter((item) => item.type === type);
    if (!pool.length) return undefined;

    // Split pool into tiers to mix blockbusters with hidden gems
    const sorted = [...pool].sort((a, b) => b.rating - a.rating);
    const topTier = sorted.slice(0, Math.ceil(sorted.length * 0.25));     // top 25% — known good
    const midTier = sorted.slice(Math.ceil(sorted.length * 0.25), Math.ceil(sorted.length * 0.6)); // mid
    const gemTier = sorted.slice(Math.ceil(sorted.length * 0.6));         // bottom 40% — hidden gems

    // Weighted random pick: ~35% top, ~30% mid, ~35% gems for real discovery feel
    const tierWeights = [0.35, 0.30, 0.35];
    const rand = Math.abs(Math.sin(seed * 9301 + typeSalt * 49297 + 233)) % 1;
    let tier: MediaItem[];
    if (rand < tierWeights[0]) tier = topTier.length ? topTier : pool;
    else if (rand < tierWeights[0] + tierWeights[1]) tier = midTier.length ? midTier : pool;
    else tier = gemTier.length ? gemTier : pool;

    // Pick randomly within the chosen tier using seed
    const idx = Math.abs(Math.floor(Math.sin(seed + typeSalt * 1000003) * 100000)) % tier.length;
    return tier[idx];
  };

  if (filter === "all") {
    return types.map((type, i) => pickForType(type, i * 31)).filter((item): item is MediaItem => Boolean(item));
  }

  // Single-type filter: still return up to 4 varied picks from that type
  const pool = items.filter((item) => matchesBrowseFilterType(item, filter));
  if (!pool.length) return [];
  const shuffled = shuffleBySeed(pool, seed);
  return shuffled.slice(0, Math.min(4, shuffled.length));
}

function hasEverySurfacingType(items: MediaItem[]) {
  const requiredTypes: MediaType[] = ["movie", "show", "anime", "game"];
  return requiredTypes.every((type) => items.some((item) => item.type === type));
}

function matchesBrowseFilterType(item: MediaItem, filter: MediaType | "all") {
  return filter === "all" || item.type === filter || (filter === "anime" && item.type === "anime_movie");
}

export function BrowseWorkspace({
  catalog,
  discoverySeed,
  initialBootstrapPageSize = 24,
  initialTotalPages,
}: {
  catalog: MediaItem[];
  discoverySeed: number;
  initialBootstrapPageSize?: number;
  initialTotalPages: number;
}) {
  const searchParams = useSearchParams();
  const shouldResetForReload = typeof window !== "undefined" && isReloadNavigation();
  const queryFromUrl = searchParams.get("query") ?? "";
  const mediaTypeFromUrl = searchParams.get("mediaType");
  const genreFromUrl = searchParams.get("genre") ?? "";
  const sortFromUrl = searchParams.get("sort");
  const seedFromUrl = Number(searchParams.get("seed") || "");
  const pageFromUrl = Number(searchParams.get("page") || "");
  const initialState =
    typeof window !== "undefined" && !shouldResetForReload
      ? (() => {
          try {
            return JSON.parse(window.sessionStorage.getItem(BROWSE_STATE_KEY) || "null") as
              | {
                  filter?: MediaType | "all";
                  query?: string;
                  genre?: string;
                  sort?: SortMode;
                  page?: number;
                  heroIndex?: number;
                }
              | null;
          } catch {
            return null;
          }
        })()
      : null;
  const [filter, setFilter] = useState<MediaType | "all">(
    shouldResetForReload
      ? "all"
      : mediaTypeFromUrl === "movie" ||
      mediaTypeFromUrl === "show" ||
      mediaTypeFromUrl === "anime" ||
      mediaTypeFromUrl === "game" ||
      mediaTypeFromUrl === "all"
      ? mediaTypeFromUrl
      : initialState?.filter === "movie" ||
          initialState?.filter === "show" ||
          initialState?.filter === "anime" ||
          initialState?.filter === "game" ||
          initialState?.filter === "all"
        ? initialState.filter
      : "all",
  );
  const [query, setQuery] = useState(shouldResetForReload ? "" : queryFromUrl || initialState?.query || "");
  const deferredQuery = useDeferredValue(query);
  const [urlUpdateQuery, setUrlUpdateQuery] = useState(query);
  const [genre, setGenre] = useState(shouldResetForReload ? "all" : genreFromUrl || initialState?.genre || "all");
  const [sort, setSort] = useState<SortMode>(
    shouldResetForReload
      ? "discovery"
      : sortFromUrl === "newest" ||
      sortFromUrl === "rating" ||
      sortFromUrl === "title" ||
      sortFromUrl === "discovery"
      ? sortFromUrl
      : initialState?.sort === "newest" ||
      initialState?.sort === "rating" ||
      initialState?.sort === "title" ||
      initialState?.sort === "discovery"
      ? initialState.sort
      : "discovery",
  );
  const [bootstrapCatalog, setBootstrapCatalog] = useState<MediaItem[]>(
    typeof window === "undefined"
      ? catalog
      : (() => {
          try {
            const raw = window.sessionStorage.getItem(BROWSE_BOOTSTRAP_CACHE_KEY);
            if (!raw) return catalog;
            const parsed = JSON.parse(raw) as { items?: MediaItem[]; cachedAt?: number };
            if (!Array.isArray(parsed.items) || !parsed.cachedAt) return catalog;
            if (Date.now() - parsed.cachedAt >= BROWSE_CACHE_TTL_MS) return catalog;
            return parsed.items;
          } catch {
            return catalog;
          }
        })(),
  );
  const [remoteCatalog, setRemoteCatalog] = useState<MediaItem[]>([]);
  const initialPage =
    shouldResetForReload
      ? 1
      : Number.isFinite(pageFromUrl) && pageFromUrl > 0
      ? pageFromUrl
      : Number.isFinite(initialState?.page) && (initialState?.page ?? 1) > 0
        ? (initialState?.page as number)
        : 1;
  const [page, setPage] = useState(initialPage);
  const [activePage, setActivePage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(normalizeBrowseTotalPages(initialTotalPages));
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [cacheVersion, setCacheVersion] = useState(0);
  const [pageSize, setPageSize] = useState(
    typeof window === "undefined" ? 24 : getBrowsePageSize(window.innerWidth),
  );
  const [heroIndex, setHeroIndex] = useState(
    shouldResetForReload ? 0 : Math.max(0, Number(initialState?.heroIndex ?? 0)),
  );
  const prefetchedPagesRef = useRef<Record<string, CachedPage>>(
    typeof window !== "undefined" ? readBrowsePageCache() : {},
  );
  const sessionSeedRef = useRef(
    shouldResetForReload
      ? discoverySeed
      : Number.isFinite(seedFromUrl) && seedFromUrl > 0
      ? seedFromUrl
      : typeof window !== "undefined"
        ? Number(window.sessionStorage.getItem(BROWSE_SEED_KEY) || "") || discoverySeed
        : discoverySeed,
  );
  const heroSectionRef = useRef<HTMLElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const shouldScrollToResultsRef = useRef(false);
  const shouldScrollToToolbarRef = useRef(false);
  const pageScrollOffsetRef = useRef(110);
  const scrollBehaviorRef = useRef<ScrollBehavior>("auto");
  const didRestoreScrollRef = useRef(false);
  const didInitBrowseStateRef = useRef(false);
  const didSyncUrlStateRef = useRef(false);
  const previousQueryRef = useRef(queryFromUrl.trim());
  const pendingReturnContextRef = useRef<ReturnType<typeof readBrowseReturnContext>>(null);
  const hasActiveSearch = Boolean(deferredQuery.trim());
  const [isHeroInView, setIsHeroInView] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    const previousHtmlBehavior = document.documentElement.style.scrollBehavior;
    const previousBodyBehavior = document.body.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    document.body.style.scrollBehavior = "smooth";

    return () => {
      document.documentElement.style.scrollBehavior = previousHtmlBehavior;
      document.body.style.scrollBehavior = previousBodyBehavior;
    };
  }, []);

  const supportsRemotePaging =
    filter === "all" ||
    filter === "movie" ||
    filter === "show" ||
    filter === "anime" ||
    filter === "game";
  const allowPaging = supportsRemotePaging && !hasActiveSearch;

  useEffect(() => {
    function syncPageSize() {
      setPageSize(getBrowsePageSize(window.innerWidth));
    }

    syncPageSize();
    window.addEventListener("resize", syncPageSize);
    return () => window.removeEventListener("resize", syncPageSize);
  }, []);

  useEffect(() => {
    if (!shouldResetForReload || typeof window === "undefined") {
      return;
    }

    setFilter("all");
    setQuery("");
    setGenre("all");
    setSort("discovery");
    setPage(1);
    setActivePage(1);
    setHeroIndex(0);
    window.sessionStorage.removeItem(BROWSE_STATE_KEY);
    window.sessionStorage.removeItem(BROWSE_SCROLL_KEY);
    window.sessionStorage.setItem(BROWSE_LAST_URL_KEY, "/browse");
    window.sessionStorage.setItem(BROWSE_SEED_KEY, String(discoverySeed));

    if (window.location.pathname !== "/browse" || window.location.search) {
      window.history.replaceState(null, "", "/browse");
    }
  }, [discoverySeed, shouldResetForReload]);

  useEffect(() => {
    const initialKey = buildCacheKey("all", 1, "all", "", "discovery", sessionSeedRef.current, initialBootstrapPageSize);
    if (!prefetchedPagesRef.current[initialKey] && bootstrapCatalog.length) {
      prefetchedPagesRef.current[initialKey] = {
        items: bootstrapCatalog,
        totalPages: normalizeBrowseTotalPages(initialTotalPages),
        cachedAt: Date.now(),
      };
      writeBrowsePageCache(prefetchedPagesRef.current);
      setCacheVersion((value) => value + 1);
    }
  }, [bootstrapCatalog, initialBootstrapPageSize, initialTotalPages]);

  useEffect(() => {
    if (bootstrapCatalog.length) {
      return;
    }

    let isActive = true;

    async function loadBootstrap() {
      try {
        const response = await fetch("/api/catalog/bootstrap", { cache: "no-store" });
        const payload = await response.json();
        if (!isActive || !payload.ok || !Array.isArray(payload.items)) {
          return;
        }

        setBootstrapCatalog(payload.items);
        window.sessionStorage.setItem(
          BROWSE_BOOTSTRAP_CACHE_KEY,
          JSON.stringify({
            items: payload.items,
            cachedAt: Date.now(),
          }),
        );
      } catch {
        // Browse still works even if the surfacing bootstrap misses.
      }
    }

    void loadBootstrap();
    return () => {
      isActive = false;
    };
  }, [bootstrapCatalog.length]);

  useEffect(() => {
    if (!didInitBrowseStateRef.current) {
      return;
    }
    setPage(1);
    setActivePage(1);
    setHeroIndex(0);
  }, [filter, sort]);

  useEffect(() => {
    if (!didInitBrowseStateRef.current) {
      return;
    }
    setPage(1);
    setActivePage(1);
    setHeroIndex(0);
  }, [genre]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!didInitBrowseStateRef.current) {
      previousQueryRef.current = normalizedQuery;
      return;
    }

    if (normalizedQuery === previousQueryRef.current) {
      return;
    }

    previousQueryRef.current = normalizedQuery;
    setPage(1);
    setActivePage(1);
    setHeroIndex(0);
  }, [query]);

  useEffect(() => {
    didInitBrowseStateRef.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const lastBrowseParams = new URLSearchParams();
    if (activePage > 1) {
      lastBrowseParams.set("page", String(activePage));
    }
    if (filter !== "all") {
      lastBrowseParams.set("mediaType", filter);
    }
    if (genre !== "all") {
      lastBrowseParams.set("genre", genre);
    }
    if (sort !== "discovery") {
      lastBrowseParams.set("sort", sort);
    }
    const debouncedQuery = urlUpdateQuery.trim();
    if (debouncedQuery) {
      lastBrowseParams.set("query", debouncedQuery);
    }
    lastBrowseParams.set("seed", String(sessionSeedRef.current));
    const nextUrl = lastBrowseParams.toString() ? `/browse?${lastBrowseParams.toString()}` : "/browse";
    window.sessionStorage.setItem(
      BROWSE_STATE_KEY,
      JSON.stringify({
        filter,
        query: urlUpdateQuery,
        genre,
        sort,
        page: activePage,
        heroIndex,
      }),
    );
    window.sessionStorage.setItem(BROWSE_LAST_URL_KEY, nextUrl);
    window.sessionStorage.setItem(BROWSE_SEED_KEY, String(sessionSeedRef.current));
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [activePage, filter, genre, heroIndex, urlUpdateQuery, sort]);

  // Debounced URL updates to prevent typing glitches
  useEffect(() => {
    const timer = setTimeout(() => {
      setUrlUpdateQuery(query);
    }, 500); // 500ms delay to allow smooth typing

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (shouldResetForReload) {
      return;
    }

    if (!didSyncUrlStateRef.current) {
      didSyncUrlStateRef.current = true;
      return;
    }
    const nextFilter =
      mediaTypeFromUrl === "movie" ||
      mediaTypeFromUrl === "show" ||
      mediaTypeFromUrl === "anime" ||
      mediaTypeFromUrl === "game" ||
      mediaTypeFromUrl === "all"
        ? mediaTypeFromUrl
        : "all";
    setFilter(nextFilter);
    setQuery(queryFromUrl);
    setGenre(genreFromUrl || "all");
    setSort(
      sortFromUrl === "newest" ||
        sortFromUrl === "rating" ||
        sortFromUrl === "title" ||
        sortFromUrl === "discovery"
        ? sortFromUrl
        : "discovery",
    );
    if (Number.isFinite(seedFromUrl) && seedFromUrl > 0) {
      sessionSeedRef.current = seedFromUrl;
      window.sessionStorage.setItem(BROWSE_SEED_KEY, String(seedFromUrl));
    }
    setPage(Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1);
    setHeroIndex(Math.max(0, Number(initialState?.heroIndex ?? 0)));
  }, [genreFromUrl, mediaTypeFromUrl, pageFromUrl, queryFromUrl, seedFromUrl, shouldResetForReload, sortFromUrl]);


  useEffect(() => {
    const controller = new AbortController();

    async function fetchPage(targetPage: number, cacheOnly = false) {
      const targetKey = buildCacheKey(filter, targetPage, genre, deferredQuery, sort, sessionSeedRef.current, pageSize);
      if (prefetchedPagesRef.current[targetKey]) {
        if (!cacheOnly) {
          setRemoteCatalog(prefetchedPagesRef.current[targetKey].items);
          setTotalPages(normalizeBrowseTotalPages(prefetchedPagesRef.current[targetKey].totalPages, hasActiveSearch));
          setActivePage(targetPage);
        }
        return prefetchedPagesRef.current[targetKey].items;
      }

      const search = new URLSearchParams({
        type: filter,
        page: String(targetPage),
        sort,
        seed: String(sessionSeedRef.current),
        pageSize: String(pageSize),
      });

      if (hasActiveSearch) {
        search.set("query", deferredQuery.trim());
      }
      if (genre !== "all") {
        search.set("genre", genre);
      }

      const response = await fetch(`/api/catalog/browse?${search.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Catalog request failed");
      }

      const payload = await response.json();
      if (!payload.ok || !Array.isArray(payload.items)) {
        throw new Error("Catalog payload invalid");
      }

      prefetchedPagesRef.current[targetKey] = {
        items: payload.items,
        totalPages: normalizeBrowseTotalPages(payload.totalPages ?? 1, hasActiveSearch),
        cachedAt: Date.now(),
      };
      writeBrowsePageCache(prefetchedPagesRef.current);
      setCacheVersion((value) => value + 1);

      if (!cacheOnly) {
        startTransition(() => {
          setRemoteCatalog(payload.items);
          setTotalPages(normalizeBrowseTotalPages(payload.totalPages ?? 1, hasActiveSearch));
          setActivePage(targetPage);
        });
      }

      return payload.items as MediaItem[];
    }

    async function loadCatalog() {
      if (!supportsRemotePaging) {
        setRemoteCatalog(filterCatalog(catalog, filter, deferredQuery));
        setTotalPages(1);
        setActivePage(1);
        setIsLoading(false);
        return;
      }

      const currentKey = buildCacheKey(filter, page, genre, deferredQuery, sort, sessionSeedRef.current, pageSize);
      const hasCachedPage = Boolean(prefetchedPagesRef.current[currentKey]);
      setIsLoading(!hasCachedPage);

      try {
        const primaryItems = await fetchPage(page);
        if (!hasActiveSearch) {
          const resolvedTotalPages = Math.max(1, prefetchedPagesRef.current[currentKey]?.totalPages ?? 1);
          const prefetchTargets = [page + 1, page + 2, page + 3].filter((nextPage) => nextPage <= resolvedTotalPages);
          prefetchTargets.forEach((nextPage) => {
            void fetchPage(nextPage, true).catch(() => undefined);
          });

          if (page > 1) void fetchPage(page - 1, true).catch(() => undefined);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setRemoteCatalog(bootstrapCatalog);
        setTotalPages(normalizeBrowseTotalPages(initialTotalPages));
        setActivePage(1);
      } finally {
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    }

    void loadCatalog();
    return () => controller.abort();
  }, [bootstrapCatalog, catalog, deferredQuery, discoverySeed, filter, genre, hasActiveSearch, initialTotalPages, page, pageSize, sort, supportsRemotePaging]);


  const baseCatalog = supportsRemotePaging ? remoteCatalog : bootstrapCatalog;
  const typedVisible = filterCatalog(
    baseCatalog,
    filter,
    supportsRemotePaging ? "" : deferredQuery,
  );
  const immediateLocalMatches = useMemo(() => {
    if (!hasActiveSearch) {
      return typedVisible;
    }

    const mergedItems = dedupeMediaKey([...remoteCatalog, ...bootstrapCatalog, ...catalog]).filter((item) => {
      return matchesBrowseFilterType(item, filter) && itemMatchesGenre(item, genre);
    });

    return rankCandidatesForQuery(mergedItems, deferredQuery, {
      limit: Math.max(pageSize * 3, 144),
      minRank: 6,
    });
  }, [bootstrapCatalog, catalog, deferredQuery, filter, genre, hasActiveSearch, pageSize, remoteCatalog, typedVisible]);

  const knownGenreCatalog = useMemo(() => {
    const seen = new Set<string>();

    // Better deduplication: prioritize remote catalog, then bootstrap, then initial catalog
    return [...remoteCatalog, ...bootstrapCatalog, ...catalog].filter((item) => {
      const key = `${item.source}-${item.sourceId}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return matchesBrowseFilterType(item, filter);
    });
  }, [bootstrapCatalog, catalog, filter, remoteCatalog]);

  const availableGenres = useMemo(() => {
    const counts = new Map<string, number>();
    const mediaTypesByGenre = new Map<string, Set<MediaType>>();

    for (const item of knownGenreCatalog) {
      for (const label of itemGenreLabels(item, filter)) {
        counts.set(label, (counts.get(label) ?? 0) + 1);
        const typeSet = mediaTypesByGenre.get(label) ?? new Set<MediaType>();
        typeSet.add(item.type === "anime_movie" ? "anime" : item.type);
        mediaTypesByGenre.set(label, typeSet);
      }
    }

    return [...counts.entries()]
      .filter(([label]) => {
        if (filter !== "all") {
          return true;
        }

        const typeSet = mediaTypesByGenre.get(label);
        return (typeSet?.size ?? 0) >= 2;
      })
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([label]) => label)
      .slice(0, 18);
  }, [filter, knownGenreCatalog]);

  useEffect(() => {
    if (genre !== "all" && !availableGenres.includes(genre)) {
      setGenre("all");
    }
  }, [availableGenres, genre]);

  const visibleSource = hasActiveSearch ? immediateLocalMatches : typedVisible;
  const visible = useMemo(
    () => dedupeMediaKey(visibleSource.filter((item) => itemMatchesGenre(item, genre))),
    [genre, visibleSource],
  );
  const queryVisible = useMemo(() => {
    if (!hasActiveSearch) {
      return visible;
    }

    return immediateLocalMatches;
  }, [hasActiveSearch, immediateLocalMatches, visible]);

  const bootstrapHeroBaseCatalog = useMemo(() => {
    const typeScoped = filterCatalog(bootstrapCatalog, filter, "");
    const genreScoped = typeScoped.filter((item) => itemMatchesGenre(item, genre));
    const safeGenreScoped = genreScoped.filter(isSafeForSurfacing);
    const safeTypeScoped = typeScoped.filter(isSafeForSurfacing);

    if (safeGenreScoped.length) return safeGenreScoped;
    if (safeTypeScoped.length) return safeTypeScoped;
    if (genreScoped.length) return genreScoped;
    if (typeScoped.length) return typeScoped;
    return bootstrapCatalog.filter(isSafeForSurfacing).length ? bootstrapCatalog.filter(isSafeForSurfacing) : bootstrapCatalog;
  }, [bootstrapCatalog, filter, genre]);

  const liveHeroBaseCatalog = useMemo(() => {
    const mergedCatalog = (() => {
      const seen = new Set<string>();
      return [...remoteCatalog, ...catalog].filter((item) => {
        const key = `${item.source}-${item.sourceId}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    })();

    const preferredSource =
      filter === "all" && hasEverySurfacingType(mergedCatalog)
        ? mergedCatalog
        : bootstrapCatalog;
    const typeScoped = filterCatalog(preferredSource, filter, "");
    const genreScoped = typeScoped.filter((item) => itemMatchesGenre(item, genre));
    const safeGenreScoped = genreScoped.filter(isSafeForSurfacing);
    const safeTypeScoped = typeScoped.filter(isSafeForSurfacing);

    if (safeGenreScoped.length) return safeGenreScoped;
    if (safeTypeScoped.length) return safeTypeScoped;
    if (genreScoped.length) return genreScoped;
    if (typeScoped.length) return typeScoped;
    const safeMergedCatalog = mergedCatalog.filter(isSafeForSurfacing);
    if (safeMergedCatalog.length) return safeMergedCatalog;
    return mergedCatalog.length ? mergedCatalog : bootstrapCatalog;
  }, [bootstrapCatalog, catalog, filter, genre, remoteCatalog]);

  const heroBaseCatalog = liveHeroBaseCatalog.length ? liveHeroBaseCatalog : bootstrapHeroBaseCatalog;

  const sortedVisible = useMemo(() => {
    const items = [...queryVisible];
    const normalizedQuery = deferredQuery.trim();

    if (normalizedQuery) {
      return items;
    }

    let sortedItems: MediaItem[];

    switch (sort) {
      case "newest":
        sortedItems = items.sort((left, right) => right.year - left.year || right.rating - left.rating);
        break;
      case "rating":
        sortedItems = items.sort((left, right) => right.rating - left.rating || right.year - left.year);
        break;
      case "title":
        sortedItems = items.sort((left, right) => left.title.localeCompare(right.title));
        break;
      default:
        sortedItems = shuffleBySeed(items, sessionSeedRef.current + activePage * 13);
        break;
    }

    if (filter !== "all" || sortedItems.length <= 4) {
      return sortedItems;
    }

    return takeBalancedTypeMix(sortedItems, Math.min(pageSize, sortedItems.length));
  }, [activePage, deferredQuery, filter, pageSize, queryVisible, sort]);

  const featuredDeck = useMemo(() => {
    const source = heroBaseCatalog;
    const deckSeed = sessionSeedRef.current + hashString(`${filter}-${genre}-${sort}`);
    const deck = buildSurfacingDeck(source, deckSeed, filter);

    if (filter !== "all" || deck.length === 4) {
      return deck;
    }

    const fallbackPool = (() => {
      const seen = new Set<string>();
      return [...knownGenreCatalog, ...bootstrapCatalog].filter((item) => {
        const key = `${item.source}-${item.sourceId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    })();

    const supplement = buildSurfacingDeck(fallbackPool, deckSeed + 97, "all");
    const merged = [...deck, ...supplement];
    const seen = new Set<string>();

    return merged.filter((item) => {
      const key = `${item.source}-${item.sourceId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 4);
  }, [bootstrapCatalog, filter, genre, heroBaseCatalog, knownGenreCatalog, sort]);

  useEffect(() => {
    if (!shouldScrollToToolbarRef.current || isLoading) {
      return;
    }

    scrollToElementWithOffset(toolbarRef.current, 110);
    shouldScrollToToolbarRef.current = false;
  }, [activePage, isLoading]);

  useEffect(() => {
    if (!shouldScrollToResultsRef.current || isLoading) {
      return;
    }

    const timer = setTimeout(() => {
      if (resultsRef.current) {
        scrollToElementWithOffset(resultsRef.current, pageScrollOffsetRef.current, scrollBehaviorRef.current);
        shouldScrollToResultsRef.current = false;
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [activePage, deferredQuery, isLoading, sortedVisible.length]);

  useEffect(() => {
    setHeroIndex(0);
  }, [filter, genre, sort]);

  useEffect(() => {
    if (!featuredDeck.length) {
      return;
    }

    setHeroIndex((current) => (current >= featuredDeck.length ? 0 : current));
  }, [featuredDeck.length]);

  useEffect(() => {
    if (typeof window === "undefined" || !featuredDeck.length) {
      return;
    }

    const heroSection = heroSectionRef.current;
    if (!heroSection) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeroInView(entry?.isIntersecting ?? false);
      },
      {
        threshold: 0.35,
        rootMargin: "-8% 0px -14% 0px",
      },
    );

    observer.observe(heroSection);
    return () => observer.disconnect();
  }, [featuredDeck.length]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (featuredDeck.length <= 1 || !isHeroInView) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const interval = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % featuredDeck.length);
    }, HERO_AUTO_ROTATE_MS);

    return () => window.clearInterval(interval);
  }, [featuredDeck.length, isHeroInView]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    pendingReturnContextRef.current = readBrowseReturnContext();
  }, []);

  useEffect(() => {
    if (didRestoreScrollRef.current || isLoading) {
      return;
    }

    const currentHref = `${window.location.pathname}${window.location.search}`;
    const pendingReturnContext = pendingReturnContextRef.current;
    if (pendingReturnContext && pendingReturnContext.href === currentHref) {
      const selector = pendingReturnContext.cardId ? `[data-browse-card-id="${pendingReturnContext.cardId}"]` : "";
      const targetCard = selector ? document.querySelector<HTMLElement>(selector) : null;

      if (targetCard) {
        const desiredTop =
          typeof pendingReturnContext.cardTop === "number"
            ? pendingReturnContext.cardTop
            : Math.max(92, window.innerWidth < 900 ? 108 : 132);
        const nextTop = Math.max(0, window.scrollY + targetCard.getBoundingClientRect().top - desiredTop);
        const fallbackTop = Number.isFinite(pendingReturnContext.scrollY) ? pendingReturnContext.scrollY : nextTop;

        const timer = setTimeout(() => {
          window.scrollTo({ top: Math.max(0, Math.min(nextTop, fallbackTop + 8)), behavior: "auto" });
          clearBrowseReturnContext();
          pendingReturnContextRef.current = null;
          window.sessionStorage.removeItem(BROWSE_SCROLL_KEY);
          didRestoreScrollRef.current = true;
        }, 60);

        return () => clearTimeout(timer);
      }
    }

    const stored = window.sessionStorage.getItem(BROWSE_SCROLL_KEY);
    if (!stored) {
      didRestoreScrollRef.current = true;
      return;
    }

    const nextScroll = Number(stored);
    if (Number.isFinite(nextScroll) && nextScroll > 0) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: nextScroll, behavior: "auto" });
        window.sessionStorage.removeItem(BROWSE_SCROLL_KEY);
        clearBrowseReturnContext();
        pendingReturnContextRef.current = null;
        didRestoreScrollRef.current = true;
      }, 50);
      
      return () => clearTimeout(timer);
    }

    didRestoreScrollRef.current = true;
  }, [isLoading]);

  const filterLabel =
    filter === "all"
      ? "Mixed feed"
      : filter === "movie"
        ? "Movies"
        : filter === "show"
          ? "Series"
          : filter === "anime"
            ? "Anime"
            : "Games";
  const genreLabel = genre === "all" ? "All genres" : genre;
  const resultLabel = `${sortedVisible.length} visible now`;
  const activeSearchLabel = deferredQuery.trim();
  const featured =
    featuredDeck[heroIndex] ?? sortedVisible[0] ?? typedVisible[0] ?? baseCatalog[0] ?? bootstrapCatalog[0] ?? catalog[0];
  const featuredKey = featured ? `${featured.source}-${featured.sourceId}` : "";
  const visibleGridItems = useMemo(() => {
    const baseItems = featured
      ? sortedVisible.filter((item) => `${item.source}-${item.sourceId}` !== featuredKey)
      : [...sortedVisible];

    return baseItems.slice(0, pageSize);
  }, [featured, featuredKey, pageSize, sortedVisible]);
  const isPagePending = allowPaging && page !== activePage;
  const hasVisibleBrowseContent = visibleGridItems.length > 0 || Boolean(featured);
  const suppressInitialPendingChrome =
    isLoading &&
    !isPagePending &&
    activePage === 1 &&
    page === 1 &&
    !hasActiveSearch &&
    hasVisibleBrowseContent;
  const showPendingState = (isLoading && !suppressInitialPendingChrome) || isPagePending;
  const showGridSkeletons = showPendingState && !remoteCatalog.length && !hasVisibleBrowseContent;

  useEffect(() => {
    featuredDeck.forEach((item) => {
      preloadImage(optimizeMediaImageUrl(item.coverUrl, "cover") ?? item.coverUrl);
      preloadImage(optimizeMediaImageUrl(item.backdropUrl, "backdrop") ?? item.backdropUrl);
    });
  }, [featuredDeck]);

  useEffect(() => {
    // Preload current page images first (priority)
    const nextVisible = visibleGridItems.slice(0, Math.min(18, visibleGridItems.length));
    nextVisible.forEach((item) => {
      preloadImage(optimizeMediaImageUrl(item.coverUrl, "thumb") ?? item.coverUrl);
      preloadImage(optimizeMediaImageUrl(item.backdropUrl, "backdrop") ?? item.backdropUrl);
    });

    // After current page images are loaded, warm next pages for near-instant transitions.
    if (!isInitialLoad && !isLoading && visibleGridItems.length > 0) {
      const timer = setTimeout(() => {
        [activePage + 1, activePage + 2].forEach((nextPage) => {
          const nextPageKey = buildCacheKey(filter, nextPage, genre, deferredQuery, sort, sessionSeedRef.current, pageSize);
          const nextPageData = prefetchedPagesRef.current[nextPageKey];
          if (!nextPageData?.items?.length) return;

          nextPageData.items.slice(0, Math.min(18, nextPageData.items.length)).forEach((item) => {
            preloadImage(optimizeMediaImageUrl(item.coverUrl, "thumb") ?? item.coverUrl);
            preloadImage(optimizeMediaImageUrl(item.backdropUrl, "backdrop") ?? item.backdropUrl);
          });
        });
      }, 120);

      return () => clearTimeout(timer);
    }
  }, [visibleGridItems, isInitialLoad, isLoading, activePage, filter, genre, deferredQuery, sort, pageSize]);


  function handlePageChange(targetPage: number, source?: string) {
    const clamped = Math.max(1, Math.min(totalPages, targetPage));
    if (clamped === activePage) {
      return;
    }

    const targetKey = buildCacheKey(filter, clamped, genre, deferredQuery, sort, sessionSeedRef.current, pageSize);
    const cachedPage = prefetchedPagesRef.current[targetKey];

    if (cachedPage) {
      startTransition(() => {
        setRemoteCatalog(cachedPage.items);
          setTotalPages(normalizeBrowseTotalPages(cachedPage.totalPages, hasActiveSearch));
        setActivePage(clamped);
      });
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    shouldScrollToToolbarRef.current = false;
    shouldScrollToResultsRef.current = true;
    scrollBehaviorRef.current = "smooth";
    pageScrollOffsetRef.current = window.innerWidth < 900 ? 88 : 96;
    startTransition(() => {
      setPage(clamped);
    });
  }

  function persistBrowseSnapshot() {
    if (typeof window === "undefined") {
      return;
    }

    const href = buildBrowseHref(filter, activePage, genre, query, sort, sessionSeedRef.current);
    window.sessionStorage.setItem(BROWSE_SCROLL_KEY, String(window.scrollY));
    window.sessionStorage.setItem(BROWSE_LAST_URL_KEY, href);
    window.sessionStorage.setItem(
      BROWSE_STATE_KEY,
      JSON.stringify({
        filter,
        query,
        genre,
        sort,
        page: activePage,
        heroIndex,
      }),
    );
    writeDetailReturnTarget({ href });
    writeBrowseReturnContext({
      href,
      scrollY: window.scrollY,
    });
  }

  function handleSearchJump(event?: FormEvent) {
    event?.preventDefault();
    shouldScrollToResultsRef.current = true;
    scrollBehaviorRef.current = "auto";
    pageScrollOffsetRef.current = window.innerWidth < 900 ? 96 : 92;

    if (!isLoading) {
      scrollToElementWithOffset(resultsRef.current, pageScrollOffsetRef.current, "auto");
    }
  }

  function renderPager(source: "top" | "bottom") {
    if (!allowPaging) return null;

    return (
      <div className={`bottom-pager bottom-pager-${source} glass`}>
          <div className="pager-copy">
            <p className="eyebrow">Page flow</p>
            <p className="copy">
              {activePage} of {totalPages} live browse pages.
            </p>
          </div>
        <div className="pager-actions">
          <button
            type="button"
            className="chip"
            onClick={() => handlePageChange(activePage - 1, source)}
            disabled={activePage <= 1}
          >
            Previous page
          </button>
          <div className="page-indicator">
            <span>{activePage}</span>
            <span>/</span>
            <span>{totalPages}</span>
          </div>
          <button
            type="button"
            className="chip is-active"
            onClick={() => handlePageChange(activePage + 1, source)}
            disabled={activePage >= totalPages}
          >
            Next page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace">
      {featured && !isInitialLoad ? (
      <section className="workspace-hero glass browse-surfacing-hero" ref={heroSectionRef}>
          {/* Full-bleed backdrop */}
          <div className="hero-media" key={`bg-${featuredKey}`}>
            <img
              src={featured.backdropUrl}
              alt=""
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onLoad={(e) => (e.currentTarget as HTMLImageElement).classList.add("img-loaded")}
            />
          </div>

          <div className="workspace-hero-grid">
            {/* ── Left: content ── */}
            <div className="workspace-copy workspace-copy-browse" key={featuredKey}>

              {/* Row: eyebrow + arrow nav + type pills */}
              <div className="hero-nav-row">
                <p className="eyebrow" style={{ margin: 0 }}>Now surfacing</p>
                <div className="hero-nav-controls">
                  <button
                    type="button"
                    className="hero-nav-arrow"
                    onClick={() => setHeroIndex((i) => (i - 1 + featuredDeck.length) % featuredDeck.length)}
                    aria-label="Previous"
                  >
                    ←
                  </button>

                  {/* One pill per type — click to jump */}
                  <div className="surfacing-pills">
                    {featuredDeck.map((item, i) => (
                      <button
                        key={`${item.source}-${item.sourceId}`}
                        type="button"
                        className={`surfacing-pill ${i === heroIndex ? "is-active" : ""}`}
                        onClick={() => setHeroIndex(i)}
                        aria-label={`Show ${item.type}: ${item.title}`}
                      >
                        {item.type}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="hero-nav-arrow"
                    onClick={() => setHeroIndex((i) => (i + 1) % featuredDeck.length)}
                    aria-label="Next"
                  >
                    →
                  </button>
                </div>
              </div>

              <h1 className="display browse-hero-title" title={featured.title}>
                {featured.title}
              </h1>

              <div className="hero-meta-strip">
                <span className="hero-stat">{featured.type}</span>
                <span className="hero-stat">{featured.year || "—"}</span>
                <span className="hero-stat">★ {featured.rating.toFixed(1)}</span>
              </div>

              <p className="copy workspace-hero-copy">{featured.overview}</p>

              <div className="button-row" style={{ marginTop: 24 }}>
                <Link
                  href={{
                    pathname: `/media/${featured.slug}`,
                    query: { source: featured.source, sourceId: featured.sourceId, type: featured.type },
                  }}
                  className="button button-primary"
                  onClick={persistBrowseSnapshot}
                >
                  Open
                </Link>
              </div>
            </div>

            {/* ── Right: cover art only, clean ── */}
            <div className="hero-art">
              <div
                className="hero-art-backdrop"
                style={{ backgroundImage: `url(${featured.coverUrl})` }}
                aria-hidden="true"
              />
              <img
                key={`cover-${featuredKey}`}
                src={featured.coverUrl}
                alt={featured.title}
                className="hero-art-image"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onLoad={(e) => (e.currentTarget as HTMLImageElement).classList.add("img-loaded")}
              />
            </div>
          </div>
        </section>
      ) : (
        <section className="workspace-hero glass route-loading">
          <NVLoader compact label="Loading browse..." />
        </section>
      )}

      <section className="section-stack" style={{ paddingTop: 0 }}>
        <div className="browse-toolbar" ref={toolbarRef}>
          <div className="browse-toolbar-grid">
            <div className="browse-toolbar-copy">
              <p className="eyebrow">Search and browse</p>
              <h2 className="headline">Find something worth watching or playing without losing your place.</h2>
              <p className="copy">
                Search updates as you type, filters stay in view, and the current query stays attached to these results.
              </p>
            </div>

            <div className="toolbar-stats">
              <div className="toolbar-stat">
                <span>View</span>
                <strong>{filterLabel}</strong>
              </div>
              <div className="toolbar-stat">
                <span>Genre</span>
                <strong>{genreLabel}</strong>
              </div>
              <div className="toolbar-stat">
                <span>Results</span>
                <strong>{showPendingState ? "Refreshing results..." : resultLabel}</strong>
              </div>
            </div>
          </div>

            <div className="browse-toolbar-row">
              <form className="browse-live-search" onSubmit={handleSearchJump}>
                <label className="sort-label" htmlFor="browse-live-search">Search</label>
                <div className="browse-live-search-row">
                  <input
                    id="browse-live-search"
                    className="browse-search-input"
                    type="search"
                    placeholder="Search titles, genres, or keywords..."
                    value={query}
                    onChange={(event) => {
                      // Immediate state update for smooth typing
                      setQuery(event.target.value);
                    }}
                    onKeyDown={(event) => {
                      // Prevent form submission on Enter to allow smooth typing
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleSearchJump(event);
                      }
                    }}
                  />
                  <button type="submit" className="button button-primary browse-search-submit">
                    Search
                  </button>
                  {query.trim() ? (
                    <button type="button" className="button button-secondary browse-search-clear" onClick={() => setQuery("")}>
                      Clear
                    </button>
                  ) : null}
                </div>
                <p className="copy browse-live-search-copy">
                  {activeSearchLabel ? `Searching for "${activeSearchLabel}"` : "Start typing and the browse results update here."}
                </p>
              </form>

              <div className="search-cluster">
                <div className="sort-chip-block">
                  <p className="sort-label">Sort</p>
                  <div className="picker-grid sort-chip-row">
                    <button type="button" className={`picker-chip ${sort === "discovery" ? "is-active" : ""}`} onClick={() => setSort("discovery")}>
                      Discovery
                    </button>
                    <button type="button" className={`picker-chip ${sort === "newest" ? "is-active" : ""}`} onClick={() => setSort("newest")}>
                      Newest
                    </button>
                    <button type="button" className={`picker-chip ${sort === "rating" ? "is-active" : ""}`} onClick={() => setSort("rating")}>
                      Top rated
                    </button>
                    <button type="button" className={`picker-chip ${sort === "title" ? "is-active" : ""}`} onClick={() => setSort("title")}>
                      A-Z
                    </button>
                  </div>
                </div>
            </div>

            <FilterChipBar active={filter} onChange={setFilter} />

            <div className="chip-row">
              <button
                type="button"
                className={`chip ${genre === "all" ? "is-active" : ""}`}
                onClick={() => setGenre("all")}
              >
                All genres
              </button>
              {availableGenres.map((itemGenre) => (
                <button
                  key={itemGenre}
                  type="button"
                  className={`chip ${genre === itemGenre ? "is-active" : ""}`}
                  onClick={() => setGenre(itemGenre)}
                >
                  {itemGenre}
                </button>
              ))}
            </div>
          </div>
        </div>

        {renderPager("top")}

        <div className="section-header browse-status" style={{ alignItems: "center" }} ref={resultsRef}>
          <p className="copy browse-status-copy">
            {showGridSkeletons
              ? `Refreshing live ${
                  filter === "anime"
                    ? "anime"
                    : filter === "game"
                      ? "game"
                      : filter === "all"
                      ? "catalog"
                      : "browse"
                } results...`
              : activeSearchLabel
                ? `Search results for "${activeSearchLabel}" collected into one ranked list.`
                : `Showing ${sortedVisible.length} titles on page ${activePage}${allowPaging ? ` of ${totalPages}` : ""}.`}
          </p>
          <div className={`refresh-pulse ${showPendingState ? "is-active" : ""}`} />
        </div>

        {showPendingState ? (
          <div className="glass browse-loader-panel">
            <NVLoader compact label={activeSearchLabel ? `Updating "${activeSearchLabel}"...` : "Loading fresh picks..."} />
          </div>
        ) : null}

        <div className={`catalog-grid ${showPendingState ? "catalog-grid-loading" : ""}`} key={`${filter}-${activePage}-${sort}-${genre}`}>
          {!showGridSkeletons && visibleGridItems.length
            ? visibleGridItems.map((item, index) => (
                <CatalogCard key={item.id} item={item} priority={index < 10} onBeforeNavigate={persistBrowseSnapshot} />
              ))
            : showGridSkeletons
              ? Array.from({ length: Math.min(pageSize, 12) }, (_, index) => (
                  <article key={`browse-skeleton-${index}`} className="catalog-card catalog-card-skeleton" aria-hidden="true">
                    <div className="catalog-card-skeleton-media" />
                    <div className="catalog-copy">
                      <div className="meta-row">
                        <span className="pill catalog-skeleton-pill" />
                        <span className="pill catalog-skeleton-pill" />
                        <span className="pill catalog-skeleton-pill" />
                      </div>
                      <div className="catalog-skeleton-line title" />
                      <div className="catalog-skeleton-line" />
                    </div>
                  </article>
                ))
              : null}
        </div>

        {renderPager("bottom")}
      </section>
    </div>
  );
}
