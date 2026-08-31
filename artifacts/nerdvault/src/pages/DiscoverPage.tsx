import React, { useEffect, useState, useRef, useCallback } from "react";
import { Search, ListFilter, Clock3, Sparkles, CircleDot, Gamepad2, ArrowUp, Loader2, Plus, Check } from "lucide-react";
import { MediaCard } from "../components/media/MediaCard";
import { SectionHeading } from "../components/common/SectionHeading";
import { CustomSelect } from "../components/common/CustomSelect";
import { api, UnifiedMedia } from "../lib/api";
import { useVault } from "../context/VaultContext";

export default function DiscoverPage() {
  const { notify } = useVault();

  const queryParams = new URLSearchParams(window.location.search);
  const initialSearch = queryParams.get("search") || "";
  const initialType = queryParams.get("type") || "All types";

  const [query, setQuery] = useState(initialSearch);
  const [genre, setGenre] = useState("All genres");
  const [type, setType] = useState(initialType);
  const [sort, setSort] = useState("Recommended");
  const [mood, setMood] = useState<string | null>(null);

  const [items, setItems] = useState<UnifiedMedia[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const isFetchingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
  const sortOptions = ["Recommended", "Highest rated", "Newest"];

  // Scroll listener for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch initial batch (Page 1)
  useEffect(() => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    isFetchingRef.current = true;

    api.discover({
      type: type !== "All types" ? type : undefined,
      genre: genre !== "All genres" ? genre : undefined,
      mood: mood || undefined,
      sort,
      search: query || undefined,
      page: 1,
    })
      .then((data) => {
        const fetched = data?.items || [];
        setItems(fetched);
        setHasMore(fetched.length >= 8 && !query);

        // Restore scroll position if returning from detail page
        const savedScrollY = sessionStorage.getItem("nv_discover_scroll_y");
        if (savedScrollY) {
          setTimeout(() => {
            window.scrollTo({ top: Number(savedScrollY), behavior: "smooth" });
            sessionStorage.removeItem("nv_discover_scroll_y");
          }, 120);
        }
      })
      .catch((err) => {
        console.error("Discover error:", err);
        setItems([]);
      })
      .finally(() => {
        setLoading(false);
        isFetchingRef.current = false;
      });
  }, [type, genre, mood, sort, query]);

  // Load next batch
  const loadNextPage = useCallback(() => {
    if (isFetchingRef.current || !hasMore || query || loading) return;
    isFetchingRef.current = true;
    setLoadingMore(true);

    const nextPage = page + 1;

    api.discover({
      type: type !== "All types" ? type : undefined,
      genre: genre !== "All genres" ? genre : undefined,
      mood: mood || undefined,
      sort,
      search: query || undefined,
      page: nextPage,
    })
      .then((data) => {
        const newItems = data?.items || [];
        if (newItems.length === 0) {
          setHasMore(false);
        } else {
          setItems((prev) => {
            const seen = new Set(prev.map((i) => i.id));
            const unique = newItems.filter((i) => !seen.has(i.id));
            if (unique.length === 0) {
              setHasMore(false);
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
        // Small cooldown to prevent immediate refiring
        setTimeout(() => {
          isFetchingRef.current = false;
        }, 500);
      });
  }, [hasMore, query, page, type, genre, mood, sort, loading]);

  // Robust Infinite Scroll Observer on separate sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || query || loading) return;

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
  }, [loadNextPage, hasMore, query, loading]);

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
          <p className="max-w-[300px] text-[12px] leading-5 text-slate-400">
            Scroll infinitely through 1 Movie, 1 Series, 1 Anime, and 1 Game in seamless succession.
          </p>
        </div>
      </div>

      {/* Filter Bar with z-index elevation and solid backdrop */}
      <div className="nv-card nv-reveal nv-reveal-2 relative z-30 rounded-3xl p-4 sm:p-5 border border-white/[.1] shadow-2xl bg-[#10161b]">
        <div className="flex flex-col gap-3.5 lg:flex-row">
          <label className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="input-discover-search"
              placeholder="Search live titles, anime, games, movies, series..."
              className="h-12 w-full rounded-2xl border border-white/[.1] bg-black/40 pl-11 pr-4 text-[13px] text-slate-100 outline-none placeholder:text-slate-500 focus:border-[rgba(55,218,178,.55)] shadow-inner"
            />
          </label>

          <div className="flex gap-2.5 flex-wrap sm:flex-nowrap relative z-40">
            <CustomSelect
              value={type}
              onChange={(val) => {
                setType(val);
                setMood(null);
              }}
              options={types}
              minWidth="130px"
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
              minWidth="150px"
            />
          </div>
        </div>
      </div>

      {/* Results Count & Clear Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] text-slate-400">
          <ListFilter size={15} className="text-[hsl(var(--primary))]" />
          Showing <strong className="text-slate-100">{items.length} titles</strong>
          {mood && (
            <span className="rounded-lg bg-[hsl(var(--primary))]/20 px-2.5 py-0.5 text-[10px] font-bold text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30">
              Mood: {mood}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setQuery("");
            setGenre("All genres");
            setType("All types");
            setSort("Recommended");
            setMood(null);
            notify("Filters cleared");
          }}
          data-testid="button-clear-filters"
          className="nv-button text-[12px] font-bold text-slate-500 hover:text-slate-200"
        >
          Clear filters
        </button>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-8 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-2xl bg-white/[.04] border border-white/[.06]" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3.5 gap-y-8 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) => (
            <MediaCard item={item} key={item.id} />
          ))}
        </div>
      ) : (
        <div className="nv-card flex min-h-[260px] flex-col items-center justify-center rounded-3xl p-8 text-center border border-dashed border-white/[.1]">
          <p className="text-[14px] font-bold text-slate-200">
            No live titles match that search
          </p>
          <p className="mt-1 text-[12px] text-slate-500">Try adjusting your search terms or clearing your category filters.</p>
          <button
            onClick={() => {
              setQuery("");
              setGenre("All genres");
              setType("All types");
              setMood(null);
            }}
            className="nv-button mt-4 rounded-xl bg-white/[.08] px-4 py-2 text-[11px] font-bold text-slate-200 hover:bg-white/[.14]"
          >
            Reset search
          </button>
        </div>
      )}

      {/* Loading More Spinner & Status */}
      {loadingMore && (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-2 text-[12px] font-bold text-[hsl(var(--primary))] bg-black/60 px-5 py-2.5 rounded-2xl border border-white/[.1] shadow-2xl backdrop-blur-md">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading more titles...</span>
          </div>
        </div>
      )}

      {/* Separate Invisible Sentinel for Observer */}
      {hasMore && !query && <div ref={sentinelRef} className="h-6 w-full" />}

      {/* End of Feed Indicator */}
      {!hasMore && items.length > 0 && !query && (
        <div className="flex flex-col items-center justify-center py-6 text-slate-500 text-[12px]">
          <span>You've explored all currently loaded titles</span>
          <button
            onClick={scrollToTop}
            className="nv-button mt-2 text-[11px] text-[hsl(var(--primary))] hover:underline"
          >
            Back to top ↑
          </button>
        </div>
      )}

      {/* Browse by Mood */}
      <div className="pt-6 border-t border-white/[.08]">
        <SectionHeading
          eyebrow="Browse by mood"
          title="What are you in the mood for?"
          action="Shuffle"
          onAction={() => {
            const random = moods[Math.floor(Math.random() * moods.length)];
            setMood(random.id);
            notify(`Browsing ${random.title} titles`);
          }}
        />
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {moods.map((m) => {
            const Icon = m.icon;
            const active = mood === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setMood(active ? null : m.id);
                  notify(`Mood set to ${m.title}`);
                }}
                data-testid={`button-mood-${m.id}`}
                className={`nv-button flex min-h-[120px] flex-col justify-between rounded-2xl bg-gradient-to-br ${
                  moodTones[m.tone]
                } p-4 text-left hover:-translate-y-1 transition duration-300 ${
                  active ? "ring-2 ring-[hsl(var(--primary))] shadow-[0_0_24px_rgba(55,218,178,.3)]" : ""
                }`}
              >
                <Icon size={20} />
                <span>
                  <span className="block text-[13px] font-bold text-slate-100">
                    {m.title}
                  </span>
                  <span className="mt-1 block text-[11px] leading-4 text-slate-300/80">
                    {m.meta}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Scroll To Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-20 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(55,218,178,.4)] bg-[#10181d]/90 text-[hsl(var(--primary))] shadow-2xl backdrop-blur-xl transition duration-300 hover:scale-110 hover:bg-[hsl(var(--primary))] hover:text-[#08211c]"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}
