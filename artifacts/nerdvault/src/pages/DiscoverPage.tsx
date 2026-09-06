import React, { useEffect, useState, useRef, useCallback } from "react";
import { Search, ListFilter, Clock3, Sparkles, CircleDot, Gamepad2, ArrowUp, Loader2, X } from "lucide-react";
import { MediaCard } from "../components/media/MediaCard";
import { SectionHeading } from "../components/common/SectionHeading";
import { CustomSelect } from "../components/common/CustomSelect";
import { api, UnifiedMedia } from "../lib/api";
import { useVault } from "../context/VaultContext";

let cachedDiscoverBatch: { items: UnifiedMedia[]; hasMore: boolean } | null = null;

export default function DiscoverPage() {
  const { notify } = useVault();

  const queryParams = new URLSearchParams(window.location.search);
  const initialSearch = queryParams.get("search") || "";
  const initialType = queryParams.get("type") || "All types";

  const [query, setQuery] = useState(initialSearch);
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearch);
  const [genre, setGenre] = useState("All genres");
  const [type, setType] = useState(initialType);
  const [sort, setSort] = useState("Recommended");
  const [curation, setCuration] = useState("All curations");
  const [mood, setMood] = useState<string | null>(null);
  const [visitSeed, setVisitSeed] = useState(() => Math.floor(Math.random() * 100000));

  const isDefaultInitial = !initialSearch && initialType === "All types";
  const [items, setItems] = useState<UnifiedMedia[]>(() => (isDefaultInitial && cachedDiscoverBatch ? cachedDiscoverBatch.items : []));
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(() => !(isDefaultInitial && cachedDiscoverBatch));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(() => (isDefaultInitial && cachedDiscoverBatch ? cachedDiscoverBatch.hasMore : true));
  const [showScrollTop, setShowScrollTop] = useState(false);

  const isFetchingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const seenTitlesRef = useRef<Set<string>>(new Set());

  const genres = [
    "All genres",
    "Sci-Fi",
    "Drama",
    "Animation",
    "Thriller",
    "Action",
    "Crime",
    "Mystery",
    "Comedy",
    "Fantasy",
    "Adventure",
    "Horror",
  ];

  const types = ["All types", "Movie", "Series", "Anime", "Game"];
  const curations = ["All curations", "Trending", "Popular", "Niche"];
  const sortOptions = ["Recommended", "Highest rated", "Newest"];

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Scroll listener for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch initial batch (Page 1) fresh on every visit or filter change
  useEffect(() => {
    const isDefault =
      !debouncedQuery.trim() &&
      type === "All types" &&
      genre === "All genres" &&
      !mood &&
      sort === "Recommended" &&
      curation === "All curations";

    if (!isDefault || !cachedDiscoverBatch) {
      setLoading(true);
    }
    setPage(1);
    setHasMore(true);
    isFetchingRef.current = true;
    seenIdsRef.current.clear();
    seenTitlesRef.current.clear();

    // Opening discover page starts from top of page
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    api.discover({
      type: type !== "All types" ? type : undefined,
      genre: genre !== "All genres" ? genre : undefined,
      mood: mood || undefined,
      sort,
      curation: curation !== "All curations" ? curation : undefined,
      search: debouncedQuery.trim() || undefined,
      page: 1,
      seed: visitSeed,
    })
      .then((data) => {
        const fetched = data?.items || [];
        const unique = fetched.filter((i) => {
          const key = `${i.title.toLowerCase().trim()}-${i.type}`;
          if (seenIdsRef.current.has(i.id) || seenTitlesRef.current.has(key)) return false;
          seenIdsRef.current.add(i.id);
          seenTitlesRef.current.add(key);
          return true;
        });

        setItems(unique);
        const more = unique.length >= 8 && !debouncedQuery.trim();
        setHasMore(more);
        if (isDefault && unique.length > 0) {
          cachedDiscoverBatch = { items: unique, hasMore: more };
        }
      })
      .catch((err) => {
        console.error("Discover error:", err);
      })
      .finally(() => {
        setLoading(false);
        isFetchingRef.current = false;
      });
  }, [type, genre, mood, sort, curation, debouncedQuery, visitSeed]);

  // Load next batch without repeating entries
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
      curation: curation !== "All curations" ? curation : undefined,
      search: debouncedQuery.trim() || undefined,
      page: nextPage,
      seed: visitSeed,
    })
      .then((data) => {
        const newItems = data?.items || [];
        if (newItems.length === 0) {
          setHasMore(false);
        } else {
          setItems((prev) => {
            const unique = newItems.filter((i) => {
              const key = `${i.title.toLowerCase().trim()}-${i.type}`;
              if (seenIdsRef.current.has(i.id) || seenTitlesRef.current.has(key)) return false;
              seenIdsRef.current.add(i.id);
              seenTitlesRef.current.add(key);
              return true;
            });
            if (unique.length === 0) {
              return prev;
            }
            return [...prev, ...unique];
          });
          setPage(nextPage);
        }
      })
      .catch(() => {
        setHasMore(false);
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
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextPage, hasMore, debouncedQuery, loading]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        <p className="font-mono-ui text-[11px] uppercase font-bold tracking-[.22em] text-[hsl(var(--primary))]">
          The Infinite Vault
        </p>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <h2 className="font-display max-w-[620px] text-3xl font-bold tracking-[-.06em] text-white sm:text-4xl">
            Find your next
            <br />
            <span className="text-[hsl(var(--accent))]">obsession.</span>
          </h2>
          <p className="max-w-[340px] text-[12px] leading-5 text-slate-400">
            Equally balanced across Movies, Series, Anime, and Games — spanning trending buzz, popular hits, and niche gems. Fresh discoveries on every visit.
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
              onChange={(val) => {
                setType(val);
                setMood(null);
              }}
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
              minWidth="135px"
            />

            <CustomSelect
              value={genre}
              onChange={(val) => {
                setGenre(val);
                setMood(null);
              }}
              options={genres}
              minWidth="130px"
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
            onClick={() => {
              setVisitSeed(Math.floor(Math.random() * 100000));
              notify("Shuffled fresh discoveries!");
            }}
            data-testid="button-shuffle-discover"
            className="nv-button flex items-center gap-1.5 rounded-xl border border-white/[.15] bg-white/[.05] px-3 py-1.5 text-[11.5px] font-bold text-slate-200 hover:bg-white/[.12] hover:text-[hsl(var(--primary))] transition active:scale-95 cursor-pointer"
          >
            <Sparkles size={13} className="text-[hsl(var(--primary))]" />
            <span>Shuffle fresh mix</span>
          </button>

          {(genre !== "All genres" || type !== "All types" || curation !== "All curations" || mood || query) && (
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
        <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4 md:gap-5">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-pulse rounded-2xl border border-white/[.08] bg-white/[.03]"
            />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4 md:gap-5">
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
          eyebrow="Browse by mood"
          title="What are you in the mood for?"
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
                  <p className="mt-1 text-[11px] text-slate-400">{m.meta}</p>
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
