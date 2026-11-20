import React, { useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
import { Search, ListFilter, Clock3, Sparkles, CircleDot, Gamepad2, ArrowUp, Loader2, X } from "lucide-react";
import { MediaCard } from "../components/media/MediaCard";
import { SectionHeading } from "../components/common/SectionHeading";
import { CustomSelect } from "../components/common/CustomSelect";
import { api, UnifiedMedia } from "../lib/api";
import { useVault } from "../context/VaultContext";
import { discoverStore } from "../lib/discoverStore";
import { pickRandomDiscoverHeadline } from "../lib/discoverHeadlines";

const DISCOVER_SESSION_CACHE_KEY = "nv_discover_initial_v3";
const DISCOVER_SESSION_TTL_MS = 1000 * 60 * 10;

const CURATIONS_BY_TYPE: Record<string, string[]> = {
  "All types": ["All curations", "Trending", "Popular", "Niche"],
  Movie: ["All curations", "Trending", "Popular", "Critically Acclaimed", "Hidden Gems"],
  Series: ["All curations", "Trending", "Popular", "Critically Acclaimed", "Hidden Gems"],
  Anime: ["All curations", "This Season", "Trending", "Top Rated", "Hidden Gems"],
  Game: ["All editions", "AAA", "Indie", "Trending", "Popular", "Hidden Gems"],
};

const GENRES_BY_TYPE: Record<string, string[]> = {
  "All types": [
    "All genres",
    "Action",
    "Adventure",
    "Comedy",
    "Drama",
    "Fantasy",
    "Horror",
    "Mystery",
    "Romance",
    "Sci-Fi",
    "Thriller",
  ],
  Movie: [
    "All genres",
    "Action",
    "Adventure",
    "Animation",
    "Comedy",
    "Crime",
    "Documentary",
    "Drama",
    "Family",
    "Fantasy",
    "History",
    "Horror",
    "Mystery",
    "Romance",
    "Sci-Fi",
    "Thriller",
    "War",
  ],
  Series: [
    "All genres",
    "Action & Adventure",
    "Comedy",
    "Crime",
    "Documentary",
    "Drama",
    "Family",
    "Mystery",
    "Reality",
    "Sci-Fi & Fantasy",
    "Thriller",
    "War & Politics",
  ],
  Anime: [
    "All genres",
    "Action",
    "Adventure",
    "Comedy",
    "Drama",
    "Fantasy",
    "Romance",
    "Sci-Fi",
    "Slice of Life",
    "Mystery",
    "Psychological",
    "Supernatural",
    "Horror",
    "Mecha",
    "Sports",
    "Thriller",
    "Music",
  ],
  Game: [
    "All genres",
    "RPG",
    "Action",
    "Adventure",
    "Shooter",
    "Strategy",
    "Indie",
    "Platformer",
    "Fighting",
    "Racing",
    "Simulator",
    "Puzzle",
    "Horror",
    "Hack & Slash",
    "Sport",
  ],
};

function alignQuadOrder(list: UnifiedMedia[]): UnifiedMedia[] {
  const movies: UnifiedMedia[] = [];
  const series: UnifiedMedia[] = [];
  const animes: UnifiedMedia[] = [];
  const games: UnifiedMedia[] = [];

  for (const item of list) {
    if (item.type === "Movie") movies.push(item);
    else if (item.type === "Series") series.push(item);
    else if (item.type === "Anime") animes.push(item);
    else if (item.type === "Game") games.push(item);
  }

  const ordered: UnifiedMedia[] = [];
  if (movies.length > 0 && series.length > 0 && animes.length > 0 && games.length > 0) {
    const quadCount = Math.min(movies.length, series.length, animes.length, games.length);
    for (let i = 0; i < quadCount; i++) {
      ordered.push(movies[i], series[i], animes[i], games[i]);
    }
    return ordered;
  }

  const maxLen = Math.max(movies.length, series.length, animes.length, games.length);
  for (let i = 0; i < maxLen; i++) {
    if (movies[i]) ordered.push(movies[i]);
    if (series[i]) ordered.push(series[i]);
    if (animes[i]) ordered.push(animes[i]);
    if (games[i]) ordered.push(games[i]);
  }
  return ordered;
}

function readCachedDiscover(): { items: UnifiedMedia[]; seed: number } | null {
  try {
    const raw = sessionStorage.getItem(DISCOVER_SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.items) && parsed.items.length > 0 && Date.now() - parsed.ts < DISCOVER_SESSION_TTL_MS) {
      return { items: parsed.items, seed: parsed.seed };
    }
  } catch {}
  return null;
}

function writeCachedDiscover(items: UnifiedMedia[], seed: number): void {
  try {
    sessionStorage.setItem(
      DISCOVER_SESSION_CACHE_KEY,
      JSON.stringify({ items: items.slice(0, 60), seed, ts: Date.now() })
    );
  } catch {}
}

function isClientReleased(item: UnifiedMedia): boolean {
  if (!item) return false;
  if (item.airingStatus && item.airingStatus.toLowerCase() === "upcoming") return false;
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();
  if (item.year) {
    const y = parseInt(item.year, 10);
    if (!isNaN(y) && y > currentYear) return false;
  }
  if (item.releaseDate && item.releaseDate.slice(0, 10) > today) return false;
  return true;
}

export default function DiscoverPage() {
  const { notify } = useVault();

  const queryParams = new URLSearchParams(window.location.search);
  const paramSearch = queryParams.get("search");
  const paramType = queryParams.get("type");

  const savedState = discoverStore.getState();
  const hasSavedSession = discoverStore.isInitialized();

  // Randomize headline on every Discover page opening
  const [headline, setHeadline] = useState(() => pickRandomDiscoverHeadline());

  // If query parameters are present in the URL, prioritize them; otherwise use saved session state
  const initialSearch = paramSearch !== null ? paramSearch : (hasSavedSession ? savedState.query : "");
  const initialType = paramType !== null ? paramType : (hasSavedSession ? savedState.type : "All types");

  const isDefaultView = !initialSearch && initialType === "All types" && (!hasSavedSession || (savedState.genre === "All genres" && savedState.curation === "All curations" && !savedState.mood));
  const persistedDefault = !hasSavedSession && isDefaultView ? readCachedDiscover() : null;

  const [query, setQuery] = useState(initialSearch);
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearch);
  const [genre, setGenre] = useState(() => hasSavedSession ? savedState.genre : "All genres");
  const [type, setType] = useState(initialType);
  const [sort, setSort] = useState(() => hasSavedSession ? savedState.sort : "Recommended");
  const [curation, setCuration] = useState(() => hasSavedSession ? savedState.curation : "All curations");
  const [mood, setMood] = useState<string | null>(() => hasSavedSession ? savedState.mood : null);
  const [visitSeed, setVisitSeed] = useState(() =>
    hasSavedSession ? savedState.visitSeed : (persistedDefault?.seed ?? Math.floor(Math.random() * 100000))
  );

  // Initialize items directly from in-memory session or persisted sessionStorage for 0ms paint
  const [items, setItems] = useState<UnifiedMedia[]>(() =>
    hasSavedSession ? savedState.items : (persistedDefault?.items ?? [])
  );
  const [page, setPage] = useState(() => hasSavedSession ? savedState.page : 1);
  const [loading, setLoading] = useState(() => !hasSavedSession && !persistedDefault);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(() => hasSavedSession ? savedState.hasMore : true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const isFetchingRef = useRef(false);
  const isFirstMountRef = useRef(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const seenIdsRef = useRef<Set<string>>(hasSavedSession ? new Set(savedState.seenIds) : new Set());
  const seenTitlesRef = useRef<Set<string>>(hasSavedSession ? new Set(savedState.seenTitles) : new Set());

  const types = ["All types", "Movie", "Series", "Anime", "Game"];
  const curations = CURATIONS_BY_TYPE[type] || CURATIONS_BY_TYPE["All types"];
  const genres = GENRES_BY_TYPE[type] || GENRES_BY_TYPE["All types"];
  const sortOptions = ["Recommended", "Highest rated", "Newest"];

  const handleTypeChange = (nextType: string) => {
    setType(nextType);
    setMood(null);
    const validCurations = CURATIONS_BY_TYPE[nextType] || CURATIONS_BY_TYPE["All types"];
    if (!validCurations.includes(curation)) {
      setCuration(validCurations[0]);
    }
    const validGenres = GENRES_BY_TYPE[nextType] || GENRES_BY_TYPE["All types"];
    if (!validGenres.includes(genre)) {
      setGenre("All genres");
    }
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Track and save scroll position continuously and restore on return
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
      if (!ticking) {
        window.requestAnimationFrame(() => {
          discoverStore.setScroll(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      discoverStore.setScroll(window.scrollY);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Restore scroll position when returning from details page with existing items
  useLayoutEffect(() => {
    if (hasSavedSession && savedState.items.length > 0) {
      const targetY = discoverStore.getScroll();
      if (targetY > 0) {
        // Dual requestAnimationFrame guarantees DOM layout is painted before scroll
        requestAnimationFrame(() => {
          window.scrollTo({ top: targetY, behavior: "instant" });
          requestAnimationFrame(() => {
            window.scrollTo({ top: targetY, behavior: "instant" });
          });
        });
      }
    }
  }, [hasSavedSession]);

  // Fetch initial batch (Page 1) fresh only on first site visit, page reload, or explicit filter/search change
  useEffect(() => {
    // If returning from details page or hydrated from persisted session cache, do NOT flash skeleton or refetch!
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      if (discoverStore.isInitialized() && discoverStore.getState().items.length > 0) {
        return;
      }
      if (persistedDefault && persistedDefault.items.length > 0) {
        const hydratedIds = new Set<string>();
        const hydratedTitles = new Set<string>();
        for (const i of persistedDefault.items) {
          hydratedIds.add(i.id);
          hydratedTitles.add(`${i.title.toLowerCase().trim()}-${i.type}`);
        }
        seenIdsRef.current = hydratedIds;
        seenTitlesRef.current = hydratedTitles;
        discoverStore.updateState({
          items: persistedDefault.items,
          page: 1,
          hasMore: true,
          seenIds: hydratedIds,
          seenTitles: hydratedTitles,
          isInitialized: true,
          visitSeed: persistedDefault.seed,
        });
        return;
      }
    }

    setLoading(true);
    setPage(1);
    setHasMore(true);
    isFetchingRef.current = true;
    seenIdsRef.current.clear();
    seenTitlesRef.current.clear();

    discoverStore.resetForFilterChange();
    discoverStore.updateState({
      query,
      debouncedQuery,
      genre,
      type,
      sort,
      curation,
      mood,
      visitSeed,
    });

    // When changing filters or on fresh visit, start at top
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    api.discover({
      type: type !== "All types" ? type : undefined,
      genre: genre !== "All genres" ? genre : undefined,
      mood: mood || undefined,
      sort,
      curation: !curation.startsWith("All ") ? curation : undefined,
      search: debouncedQuery.trim() || undefined,
      page: 1,
      seed: visitSeed,
    })
      .then(async (data) => {
        let fetched = data?.items || [];
        // Failsafe automatic retry on seed 1 if a non-search discover page transiently returned 0 items
        if (fetched.length === 0 && !debouncedQuery.trim()) {
          const retry = await api
            .discover({
              type: type !== "All types" ? type : undefined,
              genre: genre !== "All genres" ? genre : undefined,
              mood: mood || undefined,
              sort,
              curation: !curation.startsWith("All ") ? curation : undefined,
              page: 1,
              seed: 1,
            })
            .catch(() => null);
          fetched = retry?.items || [];
        }
        const filtered = fetched.filter((i) => {
          if (!isClientReleased(i)) return false;
          if (type !== "All types" && (i.type || "").toLowerCase() !== type.toLowerCase()) return false;
          return true;
        });

        const uniqueRaw = filtered.filter((i) => {
          const key = `${i.title.toLowerCase().trim()}-${i.type}`;
          if (seenIdsRef.current.has(i.id) || seenTitlesRef.current.has(key)) return false;
          seenIdsRef.current.add(i.id);
          seenTitlesRef.current.add(key);
          return true;
        });

        const unique =
          type === "All types" && sort === "Recommended" && !debouncedQuery.trim()
            ? alignQuadOrder(uniqueRaw)
            : uniqueRaw;

        setItems(unique);
        const more = unique.length >= 8 && !debouncedQuery.trim();
        setHasMore(more);

        if (
          type === "All types" &&
          genre === "All genres" &&
          curation.startsWith("All ") &&
          !mood &&
          !debouncedQuery.trim() &&
          unique.length > 0
        ) {
          writeCachedDiscover(unique, visitSeed);
        }

        discoverStore.updateState({
          items: unique,
          page: 1,
          hasMore: more,
          seenIds: seenIdsRef.current,
          seenTitles: seenTitlesRef.current,
          isInitialized: true,
          visitSeed,
        });
      })
      .catch((err) => {
        console.error("Discover error:", err);
      })
      .finally(() => {
        setLoading(false);
        isFetchingRef.current = false;
      });
  }, [type, genre, mood, sort, curation, debouncedQuery, visitSeed]);

  // Load next batch without repeating entries and sync to session store
  const loadNextPage = useCallback(() => {
    if (isFetchingRef.current || !hasMore || debouncedQuery.trim() || loading) return;
    isFetchingRef.current = true;
    setLoadingMore(true);

    const nextPage = page + 1;

    api.discover({
      type: type !== "All types" ? type : undefined,
      genre: genre !== "All genres" ? genre : undefined,
      mood: mood || undefined,
      sort,
      curation: !curation.startsWith("All ") ? curation : undefined,
      search: debouncedQuery.trim() || undefined,
      page: nextPage,
      seed: visitSeed,
    })
      .then((data) => {
        const newItems = data?.items || [];
        const filtered = newItems.filter((i) => {
          if (!isClientReleased(i)) return false;
          if (type !== "All types" && (i.type || "").toLowerCase() !== type.toLowerCase()) return false;
          return true;
        });

        if (filtered.length === 0) {
          setHasMore(false);
          discoverStore.updateState({ hasMore: false });
        } else {
          setItems((prev) => {
            const uniqueRaw = filtered.filter((i) => {
              const key = `${i.title.toLowerCase().trim()}-${i.type}`;
              if (seenIdsRef.current.has(i.id) || seenTitlesRef.current.has(key)) return false;
              seenIdsRef.current.add(i.id);
              seenTitlesRef.current.add(key);
              return true;
            });
            const unique =
              type === "All types" && sort === "Recommended" && !debouncedQuery.trim()
                ? alignQuadOrder(uniqueRaw)
                : uniqueRaw;
            if (unique.length === 0) {
              return prev;
            }
            const updated = [...prev, ...unique];
            discoverStore.updateState({
              items: updated,
              page: nextPage,
              hasMore: true,
              seenIds: seenIdsRef.current,
              seenTitles: seenTitlesRef.current,
            });
            return updated;
          });
          setPage(nextPage);
        }
      })
      .catch(() => {
        setHasMore(false);
        discoverStore.updateState({ hasMore: false });
      })
      .finally(() => {
        setLoadingMore(false);
        setTimeout(() => {
          isFetchingRef.current = false;
        }, 500);
      });
  }, [hasMore, debouncedQuery, page, type, genre, mood, sort, curation, visitSeed, loading]);

  // Robust Infinite Scroll Observer on separate sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || debouncedQuery.trim() || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingRef.current) {
          loadNextPage();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextPage, hasMore, debouncedQuery, loading]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleShuffle = () => {
    const newSeed = discoverStore.resetForShuffle();
    setHeadline(pickRandomDiscoverHeadline());
    setVisitSeed(newSeed);
    setItems([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
    isFetchingRef.current = true;
    seenIdsRef.current.clear();
    seenTitlesRef.current.clear();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    notify("Shuffled fresh discoveries!");

    api.discover({
      type: type !== "All types" ? type : undefined,
      genre: genre !== "All genres" ? genre : undefined,
      mood: mood || undefined,
      sort,
      curation: !curation.startsWith("All ") ? curation : undefined,
      search: debouncedQuery.trim() || undefined,
      page: 1,
      seed: newSeed,
    })
      .then((data) => {
        const fetched = data?.items || [];
        const filtered = fetched.filter((i) => {
          if (!isClientReleased(i)) return false;
          if (type !== "All types" && (i.type || "").toLowerCase() !== type.toLowerCase()) return false;
          return true;
        });

        const uniqueRaw = filtered.filter((i) => {
          const key = `${i.title.toLowerCase().trim()}-${i.type}`;
          if (seenIdsRef.current.has(i.id) || seenTitlesRef.current.has(key)) return false;
          seenIdsRef.current.add(i.id);
          seenTitlesRef.current.add(key);
          return true;
        });

        const unique =
          type === "All types" && sort === "Recommended" && !debouncedQuery.trim()
            ? alignQuadOrder(uniqueRaw)
            : uniqueRaw;

        setItems(unique);
        const more = unique.length >= 8 && !debouncedQuery.trim();
        setHasMore(more);

        if (
          type === "All types" &&
          genre === "All genres" &&
          curation === "All curations" &&
          !mood &&
          !debouncedQuery.trim() &&
          unique.length > 0
        ) {
          writeCachedDiscover(unique, visitSeed);
        }

        discoverStore.updateState({
          items: unique,
          page: 1,
          hasMore: more,
          seenIds: seenIdsRef.current,
          seenTitles: seenTitlesRef.current,
          isInitialized: true,
          visitSeed: newSeed,
        });
      })
      .catch((err) => {
        console.error("Discover error:", err);
      })
      .finally(() => {
        setLoading(false);
        isFetchingRef.current = false;
      });
  };

  const moods = [
    { id: "slow-burn", title: "Slow burn", meta: "Patient stories, big payoffs", tone: "teal", icon: Clock3 },
    { id: "otherworldly", title: "Otherworldly", meta: "Planets past the map", tone: "violet", icon: Sparkles },
    { id: "beautiful-chaos", title: "Beautiful chaos", meta: "Feelings at full volume", tone: "orange", icon: CircleDot },
    { id: "one-more-run", title: "One more run", meta: "Just one more level", tone: "green", icon: Gamepad2 },
  ];

  const moodTones: Record<string, string> = {
    teal: "from-[#153f41] to-[#122629] text-[#75ddc4]",
    violet: "from-[#30294a] to-[#1d1a2b] text-[#c2b4ed]",
    orange: "from-[#4b3028] to-[#251d1d] text-[#e6a074]",
    green: "from-[#2c402c] to-[#1b2820] text-[#b8df99]",
  };

  return (
    <div className="space-y-8 pb-20 relative">
      {/* Title */}
      <div className="nv-reveal">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <h2 className="font-display max-w-[620px] text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {headline.lead}
            <br />
            <span className="text-[hsl(var(--accent))]">{headline.accent}</span>
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-slate-400">
            Seamless continuous scroll across Movies, Series, Anime, and Games. Your browsing position and discovered titles are preserved as you explore.
          </p>
        </div>
      </div>

      {/* Filter Bar with z-index elevation and solid backdrop */}
      <div className="nv-card nv-reveal nv-reveal-2 relative z-30 rounded-3xl p-4 sm:p-5 border border-white/[.1] shadow-2xl bg-[#10161b]">
        <div className="flex flex-col gap-3.5 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="input-discover-search"
              placeholder="Search live titles, anime, games, movies, series..."
              className="h-12 w-full rounded-2xl border border-white/[.1] bg-black/40 pl-11 pr-10 text-[13px] text-slate-100 outline-none placeholder:text-slate-500 focus:border-[rgba(55,218,178,.55)] shadow-inner"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex gap-2.5 flex-wrap sm:flex-nowrap relative z-40">
            <CustomSelect
              value={type}
              onChange={handleTypeChange}
              options={types}
              minWidth="120px"
            />

            <CustomSelect
              value={curation}
              onChange={(val) => {
                setCuration(val);
                setMood(null);
              }}
              options={curations}
              minWidth="145px"
            />

            <CustomSelect
              value={genre}
              onChange={(val) => {
                setGenre(val);
                setMood(null);
              }}
              options={genres}
              minWidth="140px"
            />

            <CustomSelect
              value={sort}
              onChange={(val) => setSort(val)}
              options={sortOptions}
              minWidth="140px"
            />
          </div>
        </div>
      </div>

      {/* Results Count & Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] text-slate-400">
          <ListFilter size={15} className="text-[hsl(var(--primary))]" />
          Showing <strong className="text-slate-100">{items.length} titles</strong>
          {debouncedQuery.trim() && (
            <span className="text-[hsl(var(--primary))] font-medium">for "{debouncedQuery}"</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleShuffle}
            data-testid="button-shuffle-discover"
            className="nv-button flex items-center gap-1.5 rounded-xl border border-white/[.15] bg-white/[.05] px-3 py-1.5 text-[11.5px] font-bold text-slate-200 hover:bg-white/[.12] hover:text-[hsl(var(--primary))] transition active:scale-95 cursor-pointer"
          >
            <Sparkles size={13} className="text-[hsl(var(--primary))]" />
            <span>Shuffle fresh mix</span>
          </button>

          {(genre !== "All genres" || type !== "All types" || !curation.startsWith("All ") || mood || query) && (
            <button
              onClick={() => {
                setGenre("All genres");
                setType("All types");
                setCuration("All curations");
                setMood(null);
                setQuery("");
              }}
              data-testid="button-clear-filters"
              className="text-[12px] font-semibold text-[hsl(var(--primary))] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-5 md:gap-6">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-pulse rounded-2xl sm:rounded-[22px] border border-white/[.08] bg-white/[.03]"
            />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-5 md:gap-6">
          {items.map((item, idx) => (
            <MediaCard
              key={`${item.id}-${idx}`}
              item={item}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/[.08] bg-white/[.02] p-12 text-center">
          <p className="text-[14px] font-bold text-white">No live titles match that search</p>
          <p className="mt-1 text-[12px] text-slate-500">
            Try adjusting your search terms or clearing your category filters.
          </p>
          <button
            onClick={() => {
              setGenre("All genres");
              setType("All types");
              setMood(null);
              setQuery("");
            }}
            className="nv-button mt-4 rounded-xl bg-white/[.06] px-4 py-2 text-[12px] font-bold text-white hover:bg-white/[.12]"
          >
            Reset search
          </button>
        </div>
      )}

      {/* Infinite Scroll Loading Spinner & Sentinel */}
      {hasMore && !query && (
        <div className="py-8 flex justify-center items-center">
          {loadingMore && (
            <div className="flex items-center gap-2 text-slate-400 font-mono-ui text-[12px]">
              <Loader2 className="animate-spin text-[hsl(var(--primary))]" size={18} />
              <span>Loading next multi-media batch...</span>
            </div>
          )}
        </div>
      )}

      {/* Target sentinel for IntersectionObserver */}
      <div ref={sentinelRef} className="h-10 w-full" />

      {/* Browse by Mood */}
      <div className="pt-8 border-t border-white/[.06]">
        <SectionHeading
          title="Browse by Mood"
          action="Shuffle"
          onAction={() => {
            const nextIdx = Math.floor(Math.random() * moods.length);
            setMood(moods[nextIdx].id);
          }}
        />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {moods.map((m) => {
            const Icon = m.icon;
            const isSelected = mood === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMood(isSelected ? null : m.id)}
                className={`group flex flex-col justify-between rounded-2xl border p-5 text-left transition-all duration-300 ${
                  isSelected
                    ? "border-[hsl(var(--primary))] bg-[rgba(55,218,178,.08)] shadow-[0_0_24px_rgba(55,218,178,.15)] scale-[1.02]"
                    : "border-white/[.08] bg-gradient-to-br " + moodTones[m.tone] + " opacity-85 hover:opacity-100 hover:scale-[1.02]"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/40 backdrop-blur-md">
                  <Icon size={18} />
                </div>
                <div className="mt-8">
                  <h4 className="font-display text-[15px] font-bold text-white group-hover:text-[hsl(var(--primary))] transition">
                    {m.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">{m.meta}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scroll to Top Floating Button (Centered above bottom nav on mobile, corner on desktop) */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-[82px] left-1/2 -translate-x-1/2 sm:bottom-6 sm:right-6 sm:left-auto sm:translate-x-0 z-50 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full sm:rounded-2xl bg-[hsl(var(--primary))] text-[#08211c] shadow-[0_0_24px_rgba(55,218,178,.45)] transition hover:bg-[#73e4c7] hover:scale-105 active:scale-95 animate-bounce-short"
        >
          <ArrowUp size={20} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
