"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AppTopBar } from "@/components/app-topbar";
import { CatalogCard } from "@/components/catalog-card";
import { FilterChipBar } from "@/components/filter-chip-bar";
import { NVLoader } from "@/components/nv-loader";
import { SocialProfile } from "@/lib/vault-types";
import { clearBrowseReturnContext, readBrowseReturnContext } from "@/lib/detail-return";
import { ResilientMediaImage } from "@/components/resilient-media-image";
import { optimizeMediaImageUrl } from "@/lib/media-image";
import { decodeHtmlEntities } from "@/lib/text-utils";
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
const BASE_PAGE_SIZE = 48;
const XL_PAGE_SIZE = 60;
const BROWSE_CLIENT_CACHE_TTL_MS = 1000 * 60 * 5;
const GENRES_BY_MEDIA: Record<MediaType | "all", string[]> = {
  all: ["Action", "Adventure", "Fantasy", "Drama", "Romance", "Sci-Fi", "Horror", "Mystery & Thriller", "Comedy", "Family", "Sports", "Documentary"],
  movie: ["Action", "Adventure", "Drama", "Romance", "Sci-Fi", "Horror", "Mystery & Thriller", "Comedy", "Family", "Documentary"],
  show: ["Action", "Adventure", "Drama", "Romance", "Sci-Fi", "Horror", "Mystery & Thriller", "Comedy", "Family", "Documentary"],
  anime: ["Action", "Adventure", "Fantasy", "Romance", "Drama", "Comedy", "Sci-Fi", "Mystery & Thriller", "Horror", "Sports", "Shonen", "Seinen"],
  anime_movie: ["Action", "Adventure", "Fantasy", "Romance", "Drama", "Comedy", "Sci-Fi", "Mystery & Thriller", "Horror", "Sports", "Shonen", "Seinen"],
  game: ["Action", "Adventure", "RPG", "Shooter", "Strategy", "Simulation", "Open World", "Platformer", "Puzzle", "Racing", "Sports", "Horror", "Fantasy"],
};
const browseClientCache = new Map<string, CachedBrowsePayload>();

export function clearBrowseClientCache() {
  browseClientCache.clear();
}

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

function getMediaKey(item: MediaItem) {
  return `${item.source}-${item.sourceId}`;
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

function browseResponseMatchesRequest(payload: BrowseApiPayload, requestedPage: number, hasSearch: boolean) {
  if (hasSearch || !payload.items?.length) {
    return true;
  }

  const responsePage = normalizePage(payload.page || requestedPage);
  return responsePage === normalizePage(requestedPage);
}

function normalizeBrowsePayload(
  payload: BrowseApiPayload,
  requestedPage: number,
  pageSize: number,
  surfacingKeys: Set<string>,
) {
  const nextPage = clampPage(payload.page || requestedPage, payload.totalPages || 1);
  const nextItems = dedupeItems(payload.items).filter((item) => !surfacingKeys.has(getMediaKey(item)));

  return {
    page: nextPage,
    totalPages: Math.max(1, payload.totalPages || 1),
    totalResults: payload.totalResults || payload.items.length,
    items: nextItems.slice(0, pageSize),
  };
}

async function fetchBrowsePayload(params: URLSearchParams, signal?: AbortSignal) {
  const response = await fetch(`/api/catalog/browse?${params.toString()}`, {
    cache: "no-store",
    signal,
  });
  const payload = (await response.json()) as BrowseApiPayload;

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || "Could not load the browse page.");
  }

  return payload;
}

async function prefetchBrowsePayload(
  params: URLSearchParams,
  signal?: AbortSignal,
) {
  const requestKey = params.toString();
  const requestedPage = normalizePage(Number(params.get("page") || "1"));
  const cached = readBrowseClientCache(requestKey);
  if (cached && browseResponseMatchesRequest(cached, requestedPage, Boolean(params.get("query")?.trim()))) {
    return;
  }

  try {
    const payload = await fetchBrowsePayload(params, signal);
    if (browseResponseMatchesRequest(payload, requestedPage, Boolean(params.get("query")?.trim()))) {
      writeBrowseClientCache(requestKey, payload);
    }
  } catch {
    return;
  }
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

export const BrowseWorkspace = memo(function BrowseWorkspace({
  catalog,
  surfacingCatalog,
  discoverySeed,
  initialTotalPages,
  viewerId,
  viewerName,
  viewerAvatar,
  initialProfile,
  initialFriends,
}: {
  catalog: MediaItem[];
  surfacingCatalog: MediaItem[];
  discoverySeed: number;
  initialBootstrapPageSize?: number;
  initialTotalPages: number;
  viewerId: string;
  viewerName: string;
  viewerAvatar?: string;
  initialProfile: SocialProfile | null;
  initialFriends: SocialProfile[];
}) {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("mediaType");
  const initialGenre = searchParams.get("genre") || "all";
  const initialSort = searchParams.get("sort");
  const initialQuery = searchParams.get("query") || "";
  const initialFocus = searchParams.get("focus");
  const initialPage = Number(searchParams.get("page") || "1");
  const initialSeed = Number(searchParams.get("seed") || String(discoverySeed));
  const surfacingKeys = useMemo(() => new Set(surfacingCatalog.map((item) => getMediaKey(item))), [surfacingCatalog]);
  const initialCatalogItems = dedupeItems(catalog).filter(
    (item) => !surfacingKeys.has(getMediaKey(item)),
  );
  const canHydrateFromBootstrap =
    !initialQuery.trim() &&
    initialGenre === "all" &&
    (!initialFilter || initialFilter === "all") &&
    (!initialSort || initialSort === "discovery") &&
    normalizePage(initialPage) === 1;

  const [filter, setFilterState] = useState<MediaType | "all">(
    initialFilter === "movie" || initialFilter === "show" || initialFilter === "anime" || initialFilter === "game"
      ? initialFilter
      : "all",
  );
  const [genre, setGenreState] = useState(initialGenre || "all");
  const [sort, setSortState] = useState<SortMode>(
    initialSort === "newest" || initialSort === "rating" || initialSort === "title" ? initialSort : "discovery",
  );

  const hasInteractedRef = useRef(false);

  function setFilter(next: MediaType | "all") { setFilterState(next); setActivePage(1); hasInteractedRef.current = true; }
  function setGenre(next: string) { setGenreState(next); setActivePage(1); hasInteractedRef.current = true; }
  function setSort(next: SortMode) { setSortState(next); setActivePage(1); hasInteractedRef.current = true; }
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const [activePage, setActivePage] = useState(normalizePage(initialPage));
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window === "undefined") return BASE_PAGE_SIZE;
    return window.innerWidth >= 1700 ? XL_PAGE_SIZE : BASE_PAGE_SIZE;
  });
  const initialPayload: BrowseApiPayload = {
    page: 1,
    totalPages: Math.max(1, initialTotalPages),
    totalResults: initialCatalogItems.length,
    items: canHydrateFromBootstrap ? initialCatalogItems.slice(0, pageSize) : [],
  };
  const [payload, setPayload] = useState<BrowseApiPayload>(initialPayload);
  const [isLoading, setIsLoading] = useState(!canHydrateFromBootstrap);
  const [error, setError] = useState<string | null>(null);
  // pageKey increments each time a new page of results loads in — used to trigger the stagger animation
  const [pageKey, setPageKey] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isHeroInView, setIsHeroInView] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const mediaListRef = useRef<HTMLDivElement | null>(null);
  const catalogGridRef = useRef<HTMLDivElement | null>(null);
  const bottomPagerRef = useRef<HTMLDivElement | null>(null);
  const pendingResultsFocusRef = useRef<"top" | "bottom" | null>(null);
  const lastStablePageRef = useRef(normalizePage(initialPage));
  const lastStablePayloadRef = useRef<BrowseApiPayload>(initialPayload);
  const surfacingRef = useRef<HTMLElement | null>(null);
  const hasRestoredScrollRef = useRef(false);
  const hasFocusedResultsRef = useRef(false);
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
  const isSearchActive = Boolean(deferredQuery.trim());
  const currentHref = buildBrowseHref(
    filter,
    isSearchActive ? 1 : activePage,
    isSearchActive ? "all" : genre,
    deferredQuery,
    isSearchActive ? "discovery" : sort,
    initialSeed,
  );
  const showPager = !isSearchActive && payload.totalPages > 1;

  useEffect(() => {
    if (!featuredDeck.length) {
      setHeroIndex(0);
      return;
    }
    setHeroIndex((current) => (current >= featuredDeck.length ? 0 : current));
  }, [featuredDeck.length]);

  useEffect(() => {
    function syncPageSize() {
      const nextSize = window.innerWidth >= 1700 ? XL_PAGE_SIZE : BASE_PAGE_SIZE;
      setPageSize((current) => (current === nextSize ? current : nextSize));
    }

    syncPageSize();
    window.addEventListener("resize", syncPageSize);
    return () => window.removeEventListener("resize", syncPageSize);
  }, []);

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

  const availableGenres = useMemo(() => GENRES_BY_MEDIA[filter], [filter]);

  useEffect(() => {
    if (genre === "all") {
      return;
    }

    if (!availableGenres.includes(genre)) {
      setGenre("all");
    }
  }, [availableGenres, genre]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadPage() {
      const requestedPage = activePage;
      const hasSearch = Boolean(deferredQuery.trim());
      const requestPage = hasSearch ? 1 : requestedPage;
      const requestType = filter;
      const requestSort: SortMode = hasSearch ? "discovery" : sort;

      // If the SSR bootstrap grid is already displayed (page 1, no filters, no
      // search, discovery sort) and the user hasn't changed anything yet, skip
      // the fetch entirely — this prevents the grid from refreshing 2-3 seconds
      // after the page loads.
      if (canHydrateFromBootstrap && !hasInteractedRef.current) {
        setIsLoading(false);
        return;
      }

      const hasBootstrapGrid =
        requestPage === 1 &&
        !hasSearch &&
        genre === "all" &&
        filter === "all" &&
        sort === "discovery" &&
        payload.page === 1 &&
        payload.items.length > 0;

      setIsLoading(!hasBootstrapGrid);
      setError(null);

      try {
        const params = new URLSearchParams({
          type: requestType,
          page: String(requestPage),
          sort: requestSort,
          seed: String(initialSeed),
          pageSize: String(pageSize),
        });

        if (!hasSearch && genre !== "all") {
          params.set("genre", genre);
        }

        if (hasSearch) {
          params.set("query", deferredQuery.trim());
        }

        const requestKey = params.toString();
        const cachedPayload = readBrowseClientCache(requestKey);
        if (
          cachedPayload &&
          browseResponseMatchesRequest(cachedPayload, requestPage, hasSearch)
        ) {
          if (!active) {
            return;
          }

          const normalized = normalizeBrowsePayload(cachedPayload, requestPage, pageSize, surfacingKeys);
          setPayload(normalized);
          lastStablePayloadRef.current = normalized;
          lastStablePageRef.current = requestPage;
          setIsLoading(false);
          return;
        }

        let nextPayload = await fetchBrowsePayload(params, controller.signal);

        if (!browseResponseMatchesRequest(nextPayload, requestPage, hasSearch)) {
          const retryParams = new URLSearchParams(params);
          retryParams.set("_nv", String(Date.now()));
          nextPayload = await fetchBrowsePayload(retryParams, controller.signal);
        }

        if (!active) {
          return;
        }

        if (nextPayload.items.length) {
          writeBrowseClientCache(requestKey, nextPayload);
          const normalized = normalizeBrowsePayload(nextPayload, requestPage, pageSize, surfacingKeys);
          setPayload(normalized);
          lastStablePayloadRef.current = normalized;
          lastStablePageRef.current = requestPage;
          setPageKey((k) => k + 1); // Trigger stagger animation for new cards
          setError(null);
        } else if (nextPayload.totalResults === 0) {
          const normalized = normalizeBrowsePayload(nextPayload, requestPage, pageSize, surfacingKeys);
          setPayload(normalized);
          lastStablePayloadRef.current = normalized;
          lastStablePageRef.current = requestPage;
          setError(null);
        } else if (!hasBootstrapGrid) {
          setPayload(lastStablePayloadRef.current);
          if (activePage !== lastStablePageRef.current) {
            setActivePage(lastStablePageRef.current);
          }
          setError("That page could not be loaded. Showing your last loaded page.");
        }
      } catch (loadError) {
        if (!active || controller.signal.aborted) {
          return;
        }

        if (!hasBootstrapGrid) {
          setPayload(lastStablePayloadRef.current);
          if (activePage !== lastStablePageRef.current) {
            setActivePage(lastStablePageRef.current);
          }
          setError(loadError instanceof Error ? loadError.message : "That page could not be loaded. Showing your last loaded page.");
        }
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
  }, [activePage, deferredQuery, filter, genre, initialSeed, pageSize, sort, surfacingKeys]);

  useEffect(() => {
    if (isLoading || hasRestoredScrollRef.current || typeof window === "undefined") {
      return;
    }

    const returnContext = readBrowseReturnContext();
    if (!returnContext) {
      hasRestoredScrollRef.current = true;
      return;
    }

    // Restore scroll as soon as items are rendered
    const timer = window.setTimeout(() => {
      const target = returnContext.cardId
        ? document.querySelector<HTMLElement>(`[data-browse-card-id="${returnContext.cardId}"]`)
        : null;

      if (target) {
        const nextTop = Math.max(0, window.scrollY + target.getBoundingClientRect().top - 112);
        const distance = Math.abs(nextTop - window.scrollY);
        window.scrollTo({ top: nextTop, behavior: distance > 1400 ? "auto" : "smooth" });
        target.style.transition = "box-shadow 300ms ease";
        target.style.boxShadow = "0 0 0 2px var(--gold)";
        window.setTimeout(() => {
          target.style.boxShadow = "";
        }, 800);
      } else if (Number.isFinite(returnContext.scrollY) && returnContext.scrollY > 0) {
        const nextTop = Math.max(0, returnContext.scrollY);
        const distance = Math.abs(nextTop - window.scrollY);
        window.scrollTo({ top: nextTop, behavior: distance > 1400 ? "auto" : "smooth" });
      }

      clearBrowseReturnContext();
      hasRestoredScrollRef.current = true;
    }, 60);

    return () => window.clearTimeout(timer);
  }, [isLoading, currentHref]);

  useEffect(() => {
    if (
      isLoading ||
      hasFocusedResultsRef.current ||
      initialFocus !== "results" ||
      typeof window === "undefined"
    ) {
      return;
    }

    hasFocusedResultsRef.current = true;
    window.setTimeout(() => {
      scrollToBrowseMediaList("auto");
    }, 40);
  }, [initialFocus, isLoading]);

  useEffect(() => {
    featuredDeck.slice(0, 4).forEach((item) => {
      preload(optimizeMediaImageUrl(item.coverUrl, "thumb") ?? item.coverUrl);
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
      pageSize: String(pageSize),
    });

    if (genre !== "all") {
      params.set("genre", genre);
    }

    void prefetchBrowsePayload(params, controller.signal).catch(() => undefined);

    return () => controller.abort();
  }, [deferredQuery, filter, genre, initialSeed, isLoading, pageSize, payload.page, payload.totalPages, sort]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (query.trim()) {
      setFilter("all");
      setGenre("all");
      setSort("discovery");
    }

    scrollToBrowseMediaList("smooth");
  }

  function scrollToBrowseMediaList(behavior: ScrollBehavior = "smooth") {
    if (typeof window === "undefined") {
      return;
    }

    const target = mediaListRef.current ?? catalogGridRef.current ?? resultsRef.current;
    if (!target) {
      return;
    }

    const topOffset = window.innerWidth <= 900 ? 92 : 116;
    const nextTop = Math.max(0, window.scrollY + target.getBoundingClientRect().top - topOffset);
    const distance = Math.abs(nextTop - window.scrollY);

    window.scrollTo({
      top: nextTop,
      behavior: distance > 1600 ? "auto" : behavior,
    });
  }

  function handlePageChange(targetPage: number, source: "top" | "bottom" = "top") {
    const nextPage = clampPage(targetPage, payload.totalPages);
    if (nextPage === activePage || isLoading) {
      return;
    }

    hasInteractedRef.current = true;
    pendingResultsFocusRef.current = source;
    setActivePage(nextPage);
    scrollToBrowseMediaList("smooth");
  }

  useEffect(() => {
    if (isLoading || !pendingResultsFocusRef.current) {
      return;
    }

    pendingResultsFocusRef.current = null;

    const timer = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        scrollToBrowseMediaList("smooth");
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [isLoading, activePage, payload.items.length]);

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
      <div
        ref={position === "bottom" ? bottomPagerRef : undefined}
        className={`bottom-pager bottom-pager-${position} glass`}
      >
        <div className="pager-copy">
          <p className="eyebrow">Browse pages</p>
          <p className="copy">
            Page {activePage} of {payload.totalPages} with {pageSize} titles loaded each time.
          </p>
        </div>
        <div className="pager-actions">
          <button
            type="button"
            className="chip"
            disabled={activePage <= 1 || isLoading}
            onClick={(event) => {
              event.stopPropagation();
              handlePageChange(activePage - 1, position);
            }}
          >
            Previous page
          </button>
          <div className="page-indicator">
            <span className="page-indicator-current">{activePage}</span>
            <span className="page-indicator-slash">/</span>
            <span className="page-indicator-total">{payload.totalPages}</span>
          </div>
          <button
            type="button"
            className="chip is-active"
            disabled={activePage >= payload.totalPages || isLoading}
            onClick={(event) => {
              event.stopPropagation();
              handlePageChange(activePage + 1, position);
            }}
          >
            Next page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace browse-workspace-root">
      <AppTopBar
        viewerId={viewerId}
        viewerName={viewerName}
        viewerAvatar={viewerAvatar}
        initialProfile={initialProfile}
        initialFriends={initialFriends}
      />

      <section
        ref={surfacingRef}
        className="workspace-hero browse-surfacing-hero"
        onMouseEnter={() => setIsHeroPaused(true)}
        onMouseLeave={() => setIsHeroPaused(false)}
      >
        {featured ? (
          <>
            <div className="hero-media">
              <img
                key={featured.backdropUrl}
                src={optimizeMediaImageUrl(featured.backdropUrl, "backdrop") ?? featured.backdropUrl}
                alt=""
                className="hero-backdrop-img"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>

            <div className="workspace-hero-grid">
              <div className="workspace-copy workspace-copy-browse">
                <div className="hero-nav-row">
                  <p className="eyebrow" style={{ margin: 0 }}>Now Surfing</p>
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

                <div className="hero-content-transition" key={featured.id}>
                  <h1 className="display browse-hero-title">{featured.title}</h1>
                  <div className="hero-meta-strip">
                    <span className="hero-stat">{formatSurfacingLabel(featured.type)}</span>
                    <span className="hero-stat">{featured.year || "Unknown year"}</span>
                    <span className="hero-stat">★ {featured.rating.toFixed(1)}</span>
                  </div>
                  <p className="copy workspace-hero-copy">{decodeHtmlEntities(featured.overview)}</p>
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
              </div>

              <div className="hero-art">
                <div
                  className="hero-art-backdrop"
                  style={{ backgroundImage: `url(${optimizeMediaImageUrl(featured.coverUrl, "thumb") ?? featured.coverUrl})` }}
                  aria-hidden="true"
                />
                <ResilientMediaImage
                  item={featured}
                  className="hero-art-image"
                  displayIntent="cover"
                  upgradeIntent="backdrop"
                  sizes="(max-width: 640px) 100vw, 440px"
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
        <div className={`browse-toolbar ${isFilterOpen ? "is-open" : ""}`}>
          <div className="browse-toolbar-grid">
            <div className="browse-toolbar-copy">
              <p className="eyebrow">Browse</p>
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

            <button
              type="button"
              className="button button-secondary browse-filter-toggle"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              {isFilterOpen ? "Hide Filters" : "Sort / Filter"}
            </button>
          </div>

          <div className="browse-toolbar-expandable">
            <div className="browse-toolbar-row">
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
        </div>

        {renderPager("top")}

        <div ref={mediaListRef} className="browse-status-dock-container">
          <form className="browse-live-search browse-search-dock glass" onSubmit={handleSubmit}>
            <label className="sort-label" htmlFor="browse-live-search">Search results</label>
            <div className="browse-live-search-row">
              <input
                id="browse-live-search"
                className="browse-search-input"
                type="search"
                placeholder="Type to filter titles..."
                value={query}
                onChange={(event) => {
                  const nextQuery = event.target.value;
                  if (nextQuery.trim() && !query.trim()) {
                    setFilterState("all");
                    setGenreState("all");
                    setSortState("discovery");
                    setActivePage(1);
                  }
                  setQuery(nextQuery);
                  hasInteractedRef.current = true;
                }}
              />
              <button type="submit" className="button button-primary browse-search-submit">
                Search
              </button>
              {query.trim() ? (
                <button type="button" className="button button-secondary browse-search-clear" onClick={() => { setQuery(""); setActivePage(1); hasInteractedRef.current = true; }}>
                  Clear
                </button>
              ) : null}
            </div>
          </form>

          <div className="section-header browse-status" style={{ alignItems: "center" }} ref={resultsRef}>
            <p className="copy browse-status-copy">
              {error
                ? error
                : isLoading
                  ? "Loading results..."
                  : `Showing ${payload.items.length} titles on page ${activePage}${showPager ? ` of ${payload.totalPages}` : ""}.`}
            </p>
            <div className={`refresh-pulse ${isLoading ? "is-active" : ""}`} />
          </div>
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

        <div
          ref={catalogGridRef}
          key={pageKey}
          data-page-key={pageKey}
          className={`catalog-grid browse-results-grid ${isLoading ? "catalog-grid-loading is-page-transitioning" : "catalog-grid-page-entered"}`}
        >
          {isLoading && !payload.items.length
            ? Array.from({ length: 12 }).map((_, index) => (
                <div key={`browse-skeleton-${index}`} className="catalog-card catalog-card-skeleton glass" aria-hidden="true" />
              ))
            : payload.items.map((item, index) => (
                <CatalogCard key={item.id} item={item} priority={index < 4} />
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
});
