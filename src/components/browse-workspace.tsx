"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
const BROWSE_CACHE_TTL_MS = 1000 * 60 * 10;

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
  const spotlightScore = (item: MediaItem) => item.rating * 14 + getRecencyBoost(item.year) * 5;

  if (filter === "all") {
    const orderedTypes: MediaType[] = ["movie", "show", "anime", "game"];

    return orderedTypes
      .map((type, typeIndex) => {
        const candidates = shuffleBySeed(
          items.filter((item) => item.type === type),
          seed + typeIndex * 31,
        )
          .sort((left, right) => spotlightScore(right) - spotlightScore(left))
          .slice(0, 12);

        return shuffleBySeed(candidates, seed + typeIndex * 73)[0];
      })
      .filter((item): item is MediaItem => Boolean(item));
  }

  return shuffleBySeed(items, seed)
    .sort((left, right) => spotlightScore(right) - spotlightScore(left))
    .slice(0, 4);
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
  const [pageTransition, setPageTransition] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [wishlistedKeys, setWishlistedKeys] = useState<string[]>([]);
  const prefetchedPagesRef = useRef<Record<string, CachedPage>>(
    typeof window !== "undefined" ? readBrowsePageCache() : {},
  );
  const toolbarRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const shouldScrollToResultsRef = useRef(false);
  const didRestoreScrollRef = useRef(false);
  const didInitBrowseStateRef = useRef(false);

  const supportsRemotePaging =
    filter === "all" ||
    filter === "movie" ||
    filter === "show" ||
    filter === "anime" ||
    filter === "game";

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
      const targetKey = `${filter}-${targetPage}-${genre}-${deferredQuery.trim().toLowerCase()}-${sort}-${discoverySeed}`;
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
        seed: String(discoverySeed),
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
        setPageTransition(false);
        return;
      }

      setIsLoading(true);
      setPageTransition(true);

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
        window.setTimeout(() => setPageTransition(false), 180);
      }
    }

    void loadCatalog();
    return () => controller.abort();
  }, [catalog, deferredQuery, discoverySeed, filter, genre, initialTotalPages, page, sort, supportsRemotePaging]);

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

  const heroBaseCatalog = useMemo(() => {
    const typeScoped = filterCatalog(catalog, filter, "");
    const genreScoped = typeScoped.filter((item) => itemMatchesGenre(item, genre));

    return genreScoped.length ? genreScoped : typeScoped.length ? typeScoped : catalog;
  }, [catalog, filter, genre]);

  const sortedVisible = useMemo(() => {
    const items = [...visible];
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
        sortedItems = shuffleBySeed(items, discoverySeed + activePage);
        break;
    }

    if (filter !== "all" || sortedItems.length <= 4) {
      return sortedItems;
    }

    return takeBalancedTypeMix(sortedItems, Math.min(24, sortedItems.length));
  }, [activePage, deferredQuery, discoverySeed, filter, sort, visible]);

  const featuredDeck = useMemo(() => {
    const source = heroBaseCatalog;
    const deckSeed = discoverySeed + hashString(`${filter}-${genre}-${sort}-${activePage}`);
    return buildSurfacingDeck(source, deckSeed, filter);
  }, [activePage, discoverySeed, filter, genre, heroBaseCatalog, sort]);

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
    setPage(clamped);
    toolbarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          <div className="hero-media">
            <img src={featured.backdropUrl} alt={featured.title} loading="eager" fetchPriority="high" decoding="async" />
          </div>
          <div className="workspace-hero-grid">
            <div className="workspace-copy">
              <div className="hero-topline">
                <p className="eyebrow">Now surfacing</p>
                <div className="hero-arrow-row">
                  <button
                    type="button"
                    className="hero-arrow"
                    onClick={() =>
                      setHeroIndex((current) =>
                        featuredDeck.length ? (current - 1 + featuredDeck.length) % featuredDeck.length : 0,
                      )
                    }
                    disabled={featuredDeck.length <= 1}
                  >
                    <span aria-hidden="true">←</span>
                  </button>
                  <button
                    type="button"
                    className="hero-arrow"
                    onClick={() =>
                      setHeroIndex((current) =>
                        featuredDeck.length ? (current + 1) % featuredDeck.length : 0,
                      )
                    }
                    disabled={featuredDeck.length <= 1}
                  >
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>

              <h1 className="display browse-hero-title" title={featured.title}>
                {featured.title}
              </h1>
              <div className="hero-meta-strip">
                <span className="hero-stat">{featured.type}</span>
                <span className="hero-stat">{genreLabel}</span>
                <span className="hero-stat">{featured.year || "Unknown year"}</span>
                <span className="hero-stat">{featured.rating.toFixed(1)}</span>
              </div>
              <p className="copy workspace-hero-copy">{featured.overview}</p>
              <div className="button-row" style={{ marginTop: 20 }}>
                <Link
                  href={{
                    pathname: `/media/${featured.slug}`,
                    query: {
                      source: featured.source,
                      sourceId: featured.sourceId,
                      type: featured.type,
                    },
                  }}
                  className="button button-primary"
                  onClick={persistBrowseSnapshot}
                >
                  Open pick
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
            <div className="hero-art" style={{ backgroundImage: `url(${featured.coverUrl})` }} />
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

                <div className="sort-shell">
                  <label className="sort-label" htmlFor="catalog-sort">
                  Sort
                </label>
                <select
                  id="catalog-sort"
                  className="sort-select"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                >
                  <option value="discovery">Discovery</option>
                  <option value="newest">Newest first</option>
                  <option value="rating">Top rated</option>
                  <option value="title">A-Z</option>
                </select>
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

        <div className={`catalog-grid ${pageTransition ? "catalog-grid-loading" : ""}`}>
          {visibleGridItems.map((item, index) => (
            <CatalogCard key={item.id} item={item} priority={index < 12} onBeforeNavigate={persistBrowseSnapshot} />
          ))}
        </div>

        {renderPager()}
      </section>
    </div>
  );
}
