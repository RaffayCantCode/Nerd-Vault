"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { CatalogCard } from "@/components/catalog-card";
import { FilterChipBar } from "@/components/filter-chip-bar";
import { filterCatalog, itemGenreLabels, itemMatchesGenre } from "@/lib/catalog-utils";
import { itemMatchesSearch, searchScore } from "@/lib/search-utils";
import { MediaItem, MediaType } from "@/lib/types";
import { addMediaToWishlist, fetchLibraryState, removeMediaFromWishlist, subscribeVaultChanges } from "@/lib/vault-client";

type SortMode = "discovery" | "newest" | "rating" | "title";
type CachedPage = {
  items: MediaItem[];
  totalPages: number;
  cachedAt?: number;
};

const BROWSE_SCROLL_KEY = "nerdvault-browse-scroll";
const BROWSE_STATE_KEY = "nerdvault-browse-state";
const BROWSE_PAGE_CACHE_KEY = "nerdvault-browse-page-cache-v1";
const BROWSE_LAST_URL_KEY = "nerdvault-browse-last-url";
const BROWSE_CACHE_TTL_MS = 1000 * 60 * 10;

function getBrowsePageSize(viewportWidth: number) {
  if (viewportWidth < 640) return 10;
  if (viewportWidth < 960) return 18;
  if (viewportWidth < 1440) return 24;
  if (viewportWidth < 1800) return 30;
  return 36;
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
  const pool = items.filter((item) => item.type === filter);
  if (!pool.length) return [];
  const shuffled = shuffleBySeed(pool, seed);
  return shuffled.slice(0, Math.min(4, shuffled.length));
}

export function BrowseWorkspace({
  catalog,
  discoverySeed,
  initialTotalPages,
}: {
  catalog: MediaItem[];
  discoverySeed: number;
  initialTotalPages: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("query") ?? "";
  const mediaTypeFromUrl = searchParams.get("mediaType");
  const initialState =
    typeof window !== "undefined"
      ? (() => {
          try {
            return JSON.parse(window.sessionStorage.getItem(BROWSE_STATE_KEY) || "null") as
              | {
                  filter?: MediaType | "all";
                  query?: string;
                  genre?: string;
                  sort?: SortMode;
                  page?: number;
                }
              | null;
          } catch {
            return null;
          }
        })()
      : null;
  const [filter, setFilter] = useState<MediaType | "all">(
    mediaTypeFromUrl === "movie" ||
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
  const [query, setQuery] = useState(queryFromUrl || initialState?.query || "");
  const deferredQuery = useDeferredValue(query);
  const [genre, setGenre] = useState(initialState?.genre ?? "all");
  const [sort, setSort] = useState<SortMode>(
    initialState?.sort === "newest" ||
      initialState?.sort === "rating" ||
      initialState?.sort === "title" ||
      initialState?.sort === "discovery"
      ? initialState.sort
      : "discovery",
  );
  const [remoteCatalog, setRemoteCatalog] = useState<MediaItem[]>(catalog);
  const initialPage = Number.isFinite(initialState?.page) && (initialState?.page ?? 1) > 0 ? (initialState?.page as number) : 1;
  const [page, setPage] = useState(initialPage);
  const [activePage, setActivePage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(Math.max(1, initialTotalPages));
  const [isLoading, setIsLoading] = useState(false);
  const [pageSize, setPageSize] = useState(
    typeof window === "undefined" ? 24 : getBrowsePageSize(window.innerWidth),
  );
  const [heroIndex, setHeroIndex] = useState(0);
  const [wishlistedKeys, setWishlistedKeys] = useState<string[]>([]);
  const prefetchedPagesRef = useRef<Record<string, CachedPage>>(
    typeof window !== "undefined" ? readBrowsePageCache() : {},
  );
  const sessionSeedRef = useRef(discoverySeed);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const shouldScrollToResultsRef = useRef(false);
  const shouldScrollToToolbarRef = useRef(false);
  const didRestoreScrollRef = useRef(false);
  const didInitBrowseStateRef = useRef(false);

  const supportsRemotePaging =
    filter === "all" ||
    filter === "movie" ||
    filter === "show" ||
    filter === "anime" ||
    filter === "game";

  useEffect(() => {
    function syncPageSize() {
      setPageSize(getBrowsePageSize(window.innerWidth));
    }

    syncPageSize();
    window.addEventListener("resize", syncPageSize);
    return () => window.removeEventListener("resize", syncPageSize);
  }, []);

  useEffect(() => {
    const initialKey = buildCacheKey("all", 1, "all", "", "discovery", sessionSeedRef.current, 24);
    if (!prefetchedPagesRef.current[initialKey] && catalog.length) {
      prefetchedPagesRef.current[initialKey] = {
        items: catalog,
        totalPages: Math.max(1, initialTotalPages),
        cachedAt: Date.now(),
      };
      writeBrowsePageCache(prefetchedPagesRef.current);
    }
  }, [catalog, initialTotalPages]);

  useEffect(() => {
    if (!didInitBrowseStateRef.current) {
      didInitBrowseStateRef.current = true;
      return;
    }
    setPage(1);
    setGenre("all");
    setHeroIndex(0);
  }, [filter, query, sort]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(
      BROWSE_STATE_KEY,
      JSON.stringify({
        filter,
        query,
        genre,
        sort,
        page: activePage,
      }),
    );
    window.sessionStorage.setItem(BROWSE_LAST_URL_KEY, `${window.location.pathname}${window.location.search}`);
  }, [activePage, filter, genre, query, sort]);

  useEffect(() => {
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
    setPage(1);
    setHeroIndex(0);
  }, [mediaTypeFromUrl, queryFromUrl]);

  useEffect(() => {
    function syncWishlist() {
      fetchLibraryState()
        .then((library) => setWishlistedKeys(library.wishlist.map((item) => `${item.source}-${item.sourceId}`)))
        .catch(() => setWishlistedKeys([]));
    }

    syncWishlist();
    return subscribeVaultChanges(syncWishlist);
  }, [catalog]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPage(targetPage: number, cacheOnly = false) {
      const targetKey = buildCacheKey(filter, targetPage, genre, deferredQuery, sort, sessionSeedRef.current, pageSize);
      if (prefetchedPagesRef.current[targetKey]) {
        if (!cacheOnly) {
          setRemoteCatalog(prefetchedPagesRef.current[targetKey].items);
          setTotalPages(Math.max(1, prefetchedPagesRef.current[targetKey].totalPages));
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

      if (deferredQuery.trim()) {
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
        totalPages: Math.max(1, payload.totalPages ?? 1),
        cachedAt: Date.now(),
      };
      writeBrowsePageCache(prefetchedPagesRef.current);

      if (!cacheOnly) {
        startTransition(() => {
          setRemoteCatalog(payload.items);
          setTotalPages(Math.max(1, payload.totalPages ?? 1));
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

      const targetKey = buildCacheKey(filter, page, genre, deferredQuery, sort, sessionSeedRef.current, pageSize);
      const hasCachedPage = Boolean(prefetchedPagesRef.current[targetKey]);

      if (!hasCachedPage) {
        setIsLoading(true);
      }

      try {
        await fetchPage(page);
        void fetchPage(page + 1, true).catch(() => undefined);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setRemoteCatalog(catalog);
        setTotalPages(Math.max(1, initialTotalPages));
        setActivePage(1);
      } finally {
        setIsLoading(false);
      }
    }

    void loadCatalog();
    return () => controller.abort();
  }, [catalog, deferredQuery, discoverySeed, filter, genre, initialTotalPages, page, pageSize, sort, supportsRemotePaging]);

  const baseCatalog = supportsRemotePaging ? remoteCatalog : catalog;
  const typedVisible = filterCatalog(
    baseCatalog,
    filter,
    supportsRemotePaging ? "" : deferredQuery,
  );
  const immediateLocalMatches = useMemo(() => {
    if (!deferredQuery.trim()) {
      return typedVisible;
    }

    const merged = [...catalog, ...remoteCatalog];
    const seen = new Set<string>();

    return merged.filter((item) => {
      const key = `${item.source}-${item.sourceId}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return (filter === "all" || item.type === filter) && itemMatchesSearch(item, deferredQuery);
    });
  }, [catalog, deferredQuery, filter, remoteCatalog, typedVisible]);

  const availableGenres = useMemo(() => {
    const genreSource =
      filter === "all"
        ? [...catalog, ...remoteCatalog]
        : typedVisible;

    return Array.from(
      new Set(
        genreSource.flatMap((item) =>
          filter === "all" ? itemGenreLabels(item) : item.genres,
        ),
      ),
    )
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 18);
  }, [catalog, filter, remoteCatalog, typedVisible]);

  useEffect(() => {
    if (genre !== "all" && !availableGenres.includes(genre)) {
      setGenre("all");
    }
  }, [availableGenres, genre]);

  const visibleSource =
    deferredQuery.trim() && supportsRemotePaging
      ? remoteCatalog.length
        ? typedVisible
        : immediateLocalMatches
      : deferredQuery.trim()
        ? immediateLocalMatches
        : typedVisible;
  const visible = visibleSource.filter((item) => itemMatchesGenre(item, genre));
  const queryVisible = useMemo(() => {
    if (!deferredQuery.trim()) {
      return visible;
    }

    const merged = [...remoteCatalog, ...catalog];
    const seen = new Set<string>();

    return merged.filter((item) => {
      const key = `${item.source}-${item.sourceId}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return (filter === "all" || item.type === filter) && itemMatchesSearch(item, deferredQuery) && itemMatchesGenre(item, genre);
    });
  }, [catalog, deferredQuery, filter, genre, remoteCatalog, visible]);

  const heroBaseCatalog = useMemo(() => {
    const typeScoped = filterCatalog(catalog, filter, "");
    const genreScoped = typeScoped.filter((item) => itemMatchesGenre(item, genre));

    return genreScoped.length ? genreScoped : typeScoped.length ? typeScoped : catalog;
  }, [catalog, filter, genre]);

  const sortedVisible = useMemo(() => {
    const items = [...queryVisible];
    const normalizedQuery = deferredQuery.trim();

    if (normalizedQuery) {
      return items.sort((left, right) => {
        const scoreGap = searchScore(right, normalizedQuery) - searchScore(left, normalizedQuery);
        if (scoreGap !== 0) return scoreGap;
        return right.rating - left.rating || right.year - left.year;
      });
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
    const deckSeed = sessionSeedRef.current + hashString(`${filter}-${genre}-${sort}-${activePage}`);
    return buildSurfacingDeck(source, deckSeed, filter);
  }, [activePage, filter, genre, heroBaseCatalog, sort]);

  useEffect(() => {
    if (!shouldScrollToToolbarRef.current || isLoading) {
      return;
    }

    toolbarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    shouldScrollToToolbarRef.current = false;
  }, [activePage, isLoading]);

  useEffect(() => {
    if (!shouldScrollToResultsRef.current || isLoading) {
      return;
    }

    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    shouldScrollToResultsRef.current = false;
  }, [deferredQuery, isLoading, sortedVisible.length]);

  useEffect(() => {
    const trimmedQuery = deferredQuery.trim();
    if (!trimmedQuery || isLoading) {
      return;
    }

    const shouldAssistScroll = trimmedQuery.length >= 8 || trimmedQuery.includes(" ");
    if (!shouldAssistScroll) {
      return;
    }

    const timer = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [deferredQuery, filter, genre, isLoading, sort]);

  useEffect(() => {
    setHeroIndex(0);
  }, [activePage, featuredDeck.length, filter, genre, sort]);

  useEffect(() => {
    if (didRestoreScrollRef.current || isLoading) {
      return;
    }

    const stored = window.sessionStorage.getItem(BROWSE_SCROLL_KEY);
    if (!stored) {
      didRestoreScrollRef.current = true;
      return;
    }

    const nextScroll = Number(stored);
    if (Number.isFinite(nextScroll) && nextScroll > 0) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: nextScroll, behavior: "auto" });
        window.sessionStorage.removeItem(BROWSE_SCROLL_KEY);
      });
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
  const featured =
    featuredDeck[heroIndex] ?? sortedVisible[0] ?? typedVisible[0] ?? baseCatalog[0] ?? catalog[0];
  const featuredKey = featured ? `${featured.source}-${featured.sourceId}` : "";
  const featuredWishlisted = featured ? wishlistedKeys.includes(featuredKey) : false;
  const visibleGridItems = featured
    ? sortedVisible.filter((item) => `${item.source}-${item.sourceId}` !== featuredKey)
    : sortedVisible;

  useEffect(() => {
    if (!featured) return;
    router.prefetch(`/media/${featured.slug}?source=${featured.source}&sourceId=${featured.sourceId}&type=${featured.type}`);
  }, [featured, router]);

  function toggleWishlist(item: MediaItem) {
    const key = `${item.source}-${item.sourceId}`;

    if (wishlistedKeys.includes(key)) {
      void removeMediaFromWishlist(item);
      return;
    }

    void addMediaToWishlist(item);
  }

  function handlePageChange(nextPage: number) {
    const clamped = Math.min(totalPages, Math.max(1, nextPage));
    shouldScrollToToolbarRef.current = true;
    setPage(clamped);
  }

  function persistBrowseSnapshot() {
    window.sessionStorage.setItem(BROWSE_SCROLL_KEY, String(window.scrollY));
  }

  function renderPager() {
    if (!supportsRemotePaging) return null;

    return (
      <div className="bottom-pager glass">
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
            onClick={() => handlePageChange(activePage - 1)}
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
            onClick={() => handlePageChange(activePage + 1)}
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
      {featured ? (
      <section className="workspace-hero glass">
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
                <button
                  type="button"
                  className={`button ${featuredWishlisted ? "button-accent" : "button-secondary"}`}
                  onClick={() => toggleWishlist(featured)}
                >
                  {featuredWishlisted ? "Wishlisted" : "Wishlist"}
                </button>
              </div>
            </div>

            {/* ── Right: cover art only, clean ── */}
            <div className="hero-art">
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
          <div className="route-loading-badge" />
          <div className="route-loading-title" />
          <div className="route-loading-copy" />
        </section>
      )}

      <section className="section-stack" style={{ paddingTop: 0 }}>
        <div className="browse-toolbar glass" ref={toolbarRef}>
          <div className="browse-toolbar-grid">
            <div className="browse-toolbar-copy">
              <p className="eyebrow">Browse</p>
              <h2 className="headline">A calmer vault for everything you play and watch.</h2>
              <p className="copy">
                Discovery keeps it fresh, newest keeps it current, and the surfacing rail rotates on each visit.
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
                <strong>{resultLabel}</strong>
              </div>
            </div>
          </div>

            <div className="browse-toolbar-row">
              <div className="search-cluster">
                <div className="search-input browse-search-display" aria-live="polite">
                  {query.trim() ? `Search: ${query}` : "Use the centered top search to find media."}
                </div>

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

        {renderPager()}

        <div className="section-header browse-status" style={{ alignItems: "center" }} ref={resultsRef}>
          <p className="copy browse-status-copy">
            {isLoading
              ? `Refreshing live ${
                  filter === "anime"
                    ? "anime"
                    : filter === "game"
                      ? "game"
                      : filter === "all"
                      ? "catalog"
                      : "TMDB"
                } results...`
              : `Showing ${sortedVisible.length} titles on page ${activePage}${supportsRemotePaging ? ` of ${totalPages}` : ""}.`}
          </p>
          <div className={`refresh-pulse ${isLoading ? "is-active" : ""}`} />
        </div>

        <div className={`catalog-grid ${isLoading ? "catalog-grid-loading" : ""}`} key={`${filter}-${activePage}-${sort}-${genre}`}>
          {visibleGridItems.map((item, index) => (
            <CatalogCard key={item.id} item={item} priority={index < 12} onBeforeNavigate={persistBrowseSnapshot} />
          ))}
        </div>

        {renderPager()}
      </section>
    </div>
  );
}
