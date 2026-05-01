"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { CatalogCard } from "@/components/catalog-card";
import { FilterChipBar } from "@/components/filter-chip-bar";
import { NVLoader } from "@/components/nv-loader";
import { clearBrowseReturnContext, readBrowseReturnContext } from "@/lib/detail-return";
import { optimizeMediaImageUrl } from "@/lib/media-image";
import { MediaItem, MediaType } from "@/lib/types";

type SortMode = "discovery" | "newest" | "rating" | "title";

type BrowseApiPayload = {
  ok?: boolean;
  page: number;
  totalPages: number;
  totalResults: number;
  items: MediaItem[];
  message?: string;
};

type CachedBrowsePayload = {
  expiresAt: number;
  payload: BrowseApiPayload;
};

const BROWSE_LAST_URL_KEY = "nerdvault-browse-last-url";
const DEFAULT_PAGE_SIZE = 48;
const BROWSE_CLIENT_CACHE_TTL_MS = 1000 * 60 * 5;
const BROWSE_GENRES = [
  "Action",
  "Adventure",
  "Fantasy",
  "Drama",
  "Romance",
  "Sci-Fi",
  "Horror",
  "Mystery & Thriller",
  "Comedy",
  "Family",
  "Sports",
  "RPG",
  "Strategy",
  "Simulation",
  "Platformer",
  "Documentary",
] as const;
const browseClientCache = new Map<string, CachedBrowsePayload>();

function normalizePage(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function clampPage(page: number, totalPages: number) {
  return Math.max(1, Math.min(normalizePage(page), Math.max(1, totalPages)));
}

function buildBrowseHref(filter: MediaType | "all", page: number, genre: string, query: string, sort: SortMode, seed: number) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (filter !== "all") params.set("mediaType", filter);
  if (genre !== "all") params.set("genre", genre);
  if (sort !== "discovery") params.set("sort", sort);
  if (query.trim()) params.set("query", query.trim());
  params.set("seed", String(seed));
  return params.toString() ? `/browse?${params.toString()}` : "/browse";
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

function buildSurfacingDeck(items: MediaItem[], fallbackItems: MediaItem[]) {
  const orderedTypes: MediaType[] = ["movie", "show", "game", "anime"];
  const source = dedupeItems([...items, ...fallbackItems]);

  return orderedTypes
    .map((type) => source.find((item) => item.type === type || (type === "anime" && item.type === "anime_movie")))
    .filter((item): item is MediaItem => Boolean(item));
}

function readBrowseClientCache(key: string) {
  const cached = browseClientCache.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    return null;
  }
  return cached.payload;
}

function writeBrowseClientCache(key: string, payload: BrowseApiPayload) {
  browseClientCache.set(key, {
    expiresAt: Date.now() + BROWSE_CLIENT_CACHE_TTL_MS,
    payload,
  });
}

async function prefetchBrowsePayload(
  params: URLSearchParams,
  signal?: AbortSignal,
) {
  const requestKey = params.toString();
  if (readBrowseClientCache(requestKey)) {
    return;
  }

  const response = await fetch(`/api/catalog/browse?${requestKey}`, {
    cache: "default",
    signal,
  });

  if (!response.ok) {
    return;
  }

  const payload = (await response.json()) as BrowseApiPayload;
  if (payload.ok === false) {
    return;
  }

  writeBrowseClientCache(requestKey, payload);
}

function preload(url?: string | null) {
  if (typeof window === "undefined" || !url) {
    return;
  }

  const image = new Image();
  image.decoding = "async";
  image.src = url;
}

function formatFilterLabel(filter: MediaType | "all") {
  if (filter === "all") return "Mixed feed";
  if (filter === "show") return "Shows";
  if (filter === "game") return "Games";
  return `${filter.charAt(0).toUpperCase()}${filter.slice(1)}s`;
}

function formatSurfacingLabel(type: MediaType) {
  if (type === "show") return "Shows";
  if (type === "game") return "Games";
  if (type === "anime" || type === "anime_movie") return "Anime";
  return "Movies";
}

export function BrowseWorkspace({
  catalog,
  surfacingCatalog,
  discoverySeed,
  initialTotalPages,
}: {
  catalog: MediaItem[];
  surfacingCatalog: MediaItem[];
  discoverySeed: number;
  initialBootstrapPageSize?: number;
  initialTotalPages: number;
}) {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("mediaType");
  const initialGenre = searchParams.get("genre") || "all";
  const initialSort = searchParams.get("sort");
  const initialQuery = searchParams.get("query") || "";
  const initialPage = Number(searchParams.get("page") || "1");
  const initialSeed = Number(searchParams.get("seed") || String(discoverySeed));

  const [filter, setFilter] = useState<MediaType | "all">(
    initialFilter === "movie" || initialFilter === "show" || initialFilter === "anime" || initialFilter === "game"
      ? initialFilter
      : "all",
  );
  const [genre, setGenre] = useState(initialGenre || "all");
  const [sort, setSort] = useState<SortMode>(
    initialSort === "newest" || initialSort === "rating" || initialSort === "title" ? initialSort : "discovery",
  );
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const [activePage, setActivePage] = useState(normalizePage(initialPage));
  const [payload, setPayload] = useState<BrowseApiPayload>({
    page: 1,
    totalPages: Math.max(1, initialTotalPages),
    totalResults: 0,
    items: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isHeroInView, setIsHeroInView] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const surfacingRef = useRef<HTMLElement | null>(null);
  const hasRestoredScrollRef = useRef(false);
  const didInitRef = useRef(false);
  const heroTimerRef = useRef<number | null>(null);

  const featuredDeck = useMemo(() => {
    const guaranteedDeck = buildSurfacingDeck(surfacingCatalog, catalog);
    if (guaranteedDeck.length === 4) {
      return guaranteedDeck;
    }

    const liveDeck = buildSurfacingDeck(payload.items, [...surfacingCatalog, ...catalog]);
    return liveDeck.length >= guaranteedDeck.length ? liveDeck : guaranteedDeck;
  }, [catalog, payload.items, surfacingCatalog]);

  const featured = featuredDeck[heroIndex] ?? featuredDeck[0];
  const currentHref = buildBrowseHref(filter, activePage, genre, deferredQuery, sort, initialSeed);
  const showPager = !deferredQuery.trim() && payload.totalPages > 1;

  useEffect(() => {
    if (!featuredDeck.length) {
      setHeroIndex(0);
      return;
    }
    setHeroIndex((current) => (current >= featuredDeck.length ? 0 : current));
  }, [featuredDeck.length]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.history.replaceState(null, "", currentHref);
    window.sessionStorage.setItem(BROWSE_LAST_URL_KEY, currentHref);
  }, [currentHref]);

  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true;
      return;
    }
    setActivePage(1);
  }, [filter, genre, sort, deferredQuery]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadPage() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          type: filter,
          page: String(activePage),
          sort,
          seed: String(initialSeed),
          pageSize: String(DEFAULT_PAGE_SIZE),
        });

        if (genre !== "all") {
          params.set("genre", genre);
        }

        if (deferredQuery.trim()) {
          params.set("query", deferredQuery.trim());
        }

        const requestKey = params.toString();
        const cachedPayload = readBrowseClientCache(requestKey);
        if (cachedPayload) {
          if (!active) {
            return;
          }

          const nextPage = deferredQuery.trim() ? 1 : clampPage(cachedPayload.page || activePage, cachedPayload.totalPages || 1);
          const nextItems = dedupeItems(cachedPayload.items).filter(
            (item) => !surfacingCatalog.some((featuredItem) => featuredItem.id === item.id),
          );
          setPayload({
            page: nextPage,
            totalPages: Math.max(1, cachedPayload.totalPages || 1),
            totalResults: cachedPayload.totalResults || cachedPayload.items.length,
            items: nextItems.slice(0, DEFAULT_PAGE_SIZE),
          });
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/catalog/browse?${params.toString()}`, {
          cache: "default",
          signal: controller.signal,
        });
        const nextPayload = (await response.json()) as BrowseApiPayload;

        if (!response.ok || nextPayload.ok === false) {
          throw new Error(nextPayload.message || "Could not load the browse page.");
        }

        if (!active) {
          return;
        }

        writeBrowseClientCache(requestKey, nextPayload);

        const nextPage = deferredQuery.trim() ? 1 : clampPage(nextPayload.page || activePage, nextPayload.totalPages || 1);
        const nextItems = dedupeItems(nextPayload.items).filter(
          (item) => !surfacingCatalog.some((featuredItem) => featuredItem.id === item.id),
        );
        setPayload({
          page: nextPage,
          totalPages: Math.max(1, nextPayload.totalPages || 1),
          totalResults: nextPayload.totalResults || nextPayload.items.length,
          items: nextItems.slice(0, DEFAULT_PAGE_SIZE),
        });
        if (nextPage !== activePage) {
          setActivePage(nextPage);
        }
      } catch (loadError) {
        if (!active || controller.signal.aborted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Could not load the browse page.");
        setPayload((current) => ({
          ...current,
          items: [],
        }));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      active = false;
      controller.abort();
    };
  }, [activePage, deferredQuery, filter, genre, initialSeed, sort, surfacingCatalog]);

  useEffect(() => {
    if (isLoading || hasRestoredScrollRef.current || typeof window === "undefined") {
      return;
    }

    const returnContext = readBrowseReturnContext();
    if (!returnContext || returnContext.href !== currentHref) {
      hasRestoredScrollRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      const target = returnContext.cardId
        ? document.querySelector<HTMLElement>(`[data-browse-card-id="${returnContext.cardId}"]`)
        : null;

      if (target) {
        const nextTop = Math.max(0, window.scrollY + target.getBoundingClientRect().top - 112);
        window.scrollTo({ top: nextTop, behavior: "auto" });
      } else if (Number.isFinite(returnContext.scrollY)) {
        window.scrollTo({ top: Math.max(0, returnContext.scrollY), behavior: "auto" });
      }

      clearBrowseReturnContext();
      hasRestoredScrollRef.current = true;
    }, 40);

    return () => window.clearTimeout(timer);
  }, [currentHref, isLoading]);

  useEffect(() => {
    featuredDeck.slice(0, 4).forEach((item) => {
      preload(optimizeMediaImageUrl(item.backdropUrl, "backdrop") ?? item.backdropUrl);
      preload(optimizeMediaImageUrl(item.coverUrl, "cover") ?? item.coverUrl);
    });
  }, [featuredDeck]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function syncVisibility() {
      setIsDocumentVisible(document.visibilityState !== "hidden");
    }

    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility, { passive: true });

    return () => {
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !surfacingRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsHeroInView(Boolean(entry?.isIntersecting));
      },
      {
        threshold: 0.35,
        rootMargin: "0px 0px -12% 0px",
      },
    );

    observer.observe(surfacingRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (heroTimerRef.current) {
      window.clearTimeout(heroTimerRef.current);
      heroTimerRef.current = null;
    }

    if (
      featuredDeck.length <= 1 ||
      typeof window === "undefined" ||
      !isHeroInView ||
      !isDocumentVisible ||
      isHeroPaused
    ) {
      return;
    }

    heroTimerRef.current = window.setTimeout(() => {
      setHeroIndex((current) => (current + 1) % featuredDeck.length);
    }, 3000);

    return () => {
      if (heroTimerRef.current) {
        window.clearTimeout(heroTimerRef.current);
        heroTimerRef.current = null;
      }
    };
  }, [featuredDeck.length, heroIndex, isDocumentVisible, isHeroInView, isHeroPaused]);

  useEffect(() => {
    if (isLoading || deferredQuery.trim() || payload.page >= payload.totalPages) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      type: filter,
      page: String(payload.page + 1),
      sort,
      seed: String(initialSeed),
      pageSize: String(DEFAULT_PAGE_SIZE),
    });

    if (genre !== "all") {
      params.set("genre", genre);
    }

    void prefetchBrowsePayload(params, controller.signal).catch(() => undefined);

    return () => controller.abort();
  }, [deferredQuery, filter, genre, initialSeed, isLoading, payload.page, payload.totalPages, sort]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handlePageChange(targetPage: number) {
    const nextPage = clampPage(targetPage, payload.totalPages);
    if (nextPage === activePage) {
      return;
    }

    setActivePage(nextPage);
    window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function setHeroIndexWithReset(nextIndex: number) {
    if (!featuredDeck.length) {
      return;
    }

    setHeroIndex((nextIndex + featuredDeck.length) % featuredDeck.length);
  }

  function renderPager(position: "top" | "bottom") {
    if (!showPager) {
      return null;
    }

    return (
      <div className={`bottom-pager bottom-pager-${position} glass`}>
        <div className="pager-copy">
          <p className="eyebrow">Browse pages</p>
          <p className="copy">
            Page {payload.page} of {payload.totalPages} with {DEFAULT_PAGE_SIZE} titles loaded each time.
          </p>
        </div>
        <div className="pager-actions">
          <button type="button" className="chip" disabled={payload.page <= 1 || isLoading} onClick={() => handlePageChange(payload.page - 1)}>
            Previous page
          </button>
          <div className="page-indicator">
            <span>{payload.page}</span>
            <span>/</span>
            <span>{payload.totalPages}</span>
          </div>
          <button
            type="button"
            className="chip is-active"
            disabled={payload.page >= payload.totalPages || isLoading}
            onClick={() => handlePageChange(payload.page + 1)}
          >
            Next page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace">
      <section
        ref={surfacingRef}
        className="workspace-hero glass browse-surfacing-hero"
        onMouseEnter={() => setIsHeroPaused(true)}
        onMouseLeave={() => setIsHeroPaused(false)}
      >
        {featured ? (
          <>
            <div className="hero-media">
              <img
                src={optimizeMediaImageUrl(featured.backdropUrl, "backdrop") ?? featured.backdropUrl}
                alt=""
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>

            <div className="workspace-hero-grid">
              <div className="workspace-copy workspace-copy-browse">
                <div className="hero-nav-row">
                  <p className="eyebrow" style={{ margin: 0 }}>Now surfacing</p>
                  {featuredDeck.length > 1 ? (
                    <div className="hero-nav-controls">
                      <button type="button" className="hero-nav-arrow" onClick={() => setHeroIndexWithReset(heroIndex - 1)}>
                        {"<"}
                      </button>
                      <div className="surfacing-pills">
                        {featuredDeck.map((item, index) => (
                          <button
                            key={`${item.source}-${item.sourceId}`}
                            type="button"
                            className={`surfacing-pill ${index === heroIndex ? "is-active" : ""}`}
                            onClick={() => setHeroIndexWithReset(index)}
                          >
                            {formatSurfacingLabel(item.type)}
                          </button>
                        ))}
                      </div>
                      <button type="button" className="hero-nav-arrow" onClick={() => setHeroIndexWithReset(heroIndex + 1)}>
                        {">"}
                      </button>
                    </div>
                  ) : null}
                </div>

                <h1 className="display browse-hero-title">{featured.title}</h1>
                <div className="hero-meta-strip">
                  <span className="hero-stat">{formatSurfacingLabel(featured.type)}</span>
                  <span className="hero-stat">{featured.year || "Unknown year"}</span>
                  <span className="hero-stat">★ {featured.rating.toFixed(1)}</span>
                </div>
                <p className="copy workspace-hero-copy">{featured.overview}</p>
                <div className="button-row" style={{ marginTop: 20 }}>
                  <Link
                    href={{
                      pathname: `/media/${featured.slug}`,
                      query: { source: featured.source, sourceId: featured.sourceId, type: featured.type },
                    }}
                    className="button button-primary"
                  >
                    Open details
                  </Link>
                </div>
              </div>

              <div className="hero-art">
                <div
                  className="hero-art-backdrop"
                  style={{ backgroundImage: `url(${optimizeMediaImageUrl(featured.coverUrl, "cover") ?? featured.coverUrl})` }}
                  aria-hidden="true"
                />
                <img
                  src={optimizeMediaImageUrl(featured.coverUrl, "cover") ?? featured.coverUrl}
                  alt={featured.title}
                  className="hero-art-image"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="browse-loader-panel" style={{ minHeight: 320 }}>
            <NVLoader label="Loading browse..." />
          </div>
        )}
      </section>

      <section className="section-stack" style={{ paddingTop: 0 }}>
        <div className="browse-toolbar">
          <div className="browse-toolbar-grid">
            <div className="browse-toolbar-copy">
              <p className="eyebrow">Search and browse</p>
              <h2 className="headline">Clean paging, fuller shelves, and results that stay consistent from page to page.</h2>
              <p className="copy">
                Each browse page is now loaded directly from stable source windows, with one fixed page size and no shrinking result grid.
              </p>
            </div>

            <div className="toolbar-stats">
              <div className="toolbar-stat">
                <span>View</span>
                <strong>{formatFilterLabel(filter)}</strong>
              </div>
              <div className="toolbar-stat">
                <span>Genre</span>
                <strong>{genre === "all" ? "All genres" : genre}</strong>
              </div>
              <div className="toolbar-stat">
                <span>Results</span>
                <strong>{isLoading ? "Refreshing..." : `${payload.totalResults.toLocaleString()} matched`}</strong>
              </div>
            </div>
          </div>

          <div className="browse-toolbar-row">
            <form className="browse-live-search" onSubmit={handleSubmit}>
              <label className="sort-label" htmlFor="browse-live-search">Search</label>
              <div className="browse-live-search-row">
                <input
                  id="browse-live-search"
                  className="browse-search-input"
                  type="search"
                  placeholder="Search titles, genres, or keywords..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
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
                {deferredQuery.trim() ? `Searching for "${deferredQuery.trim()}"` : "Browse uses a fixed 48-title page size for a fuller grid."}
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
              <button type="button" className={`chip ${genre === "all" ? "is-active" : ""}`} onClick={() => setGenre("all")}>
                All genres
              </button>
              {BROWSE_GENRES.map((itemGenre) => (
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
            {error
              ? error
              : isLoading
                ? "Loading a stable page of results..."
                : `Showing ${payload.items.length} titles on page ${payload.page}${showPager ? ` of ${payload.totalPages}` : ""}.`}
          </p>
          <div className={`refresh-pulse ${isLoading ? "is-active" : ""}`} />
        </div>

        {isLoading ? (
          <div className="glass browse-loader-panel">
            <NVLoader compact label="Refreshing the browse page..." />
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="folder-empty glass">
            <p className="headline">Browse could not load right now.</p>
            <p className="copy">{error}</p>
          </div>
        ) : null}

        <div className={`catalog-grid ${isLoading ? "catalog-grid-loading" : ""}`} key={`${filter}-${payload.page}-${sort}-${genre}-${deferredQuery}`}>
          {payload.items.map((item, index) => (
            <CatalogCard key={item.id} item={item} priority={index < 8} />
          ))}
        </div>

        {!isLoading && !error && !payload.items.length ? (
          <div className="folder-empty glass">
            <p className="headline">No titles matched this view.</p>
            <p className="copy">Try a different genre, sort, or search term.</p>
          </div>
        ) : null}

        {renderPager("bottom")}
      </section>
    </div>
  );
}
