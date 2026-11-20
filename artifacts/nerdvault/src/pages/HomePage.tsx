import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Play, BookmarkPlus, Check, ChevronLeft, ChevronRight, Sparkles, Star, Shuffle } from "lucide-react";
import { api, HomeFeedData, UnifiedMedia } from "../lib/api";
import { mediaCache } from "../lib/mediaCache";
import { discoverStore } from "../lib/discoverStore";
import { MediaRail } from "../components/media/MediaRail";
import { useVault } from "../context/VaultContext";
import { useAuth } from "../context/AuthContext";

const SLIDE_DURATION_MS = 8000; // 8 seconds per slide for a punchier, dynamic rhythm
const HOME_CACHE_KEY = "nv_home_feed_cache_v4";
const HOME_CACHE_TTL_MS = 1000 * 60 * 15;

let cachedHomeFeed: HomeFeedData | null = null;
let cachedHomeFeedAt = 0;

function isCompleteHomeFeed(data: HomeFeedData | null | undefined): boolean {
  if (!data) return false;
  return (
    (data.featuredSlides?.length ?? 0) >= 4 &&
    (data.trendingMovies?.length ?? 0) >= 4 &&
    (data.trendingShows?.length ?? 0) >= 4 &&
    (data.topAnime?.length ?? 0) >= 4 &&
    (data.popularGames?.length ?? 0) >= 4
  );
}

function readPersistedHomeFeed(): { data: HomeFeedData; ts: number } | null {
  if (cachedHomeFeed && isCompleteHomeFeed(cachedHomeFeed)) return { data: cachedHomeFeed, ts: cachedHomeFeedAt };
  try {
    const raw = sessionStorage.getItem(HOME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.data && parsed?.ts && Date.now() - parsed.ts < HOME_CACHE_TTL_MS && isCompleteHomeFeed(parsed.data)) {
      cachedHomeFeed = parsed.data;
      cachedHomeFeedAt = parsed.ts;
      return parsed;
    }
  } catch {}
  return null;
}

function persistHomeFeed(data: HomeFeedData): void {
  if (!isCompleteHomeFeed(data)) return;
  cachedHomeFeed = data;
  cachedHomeFeedAt = Date.now();
  try {
    sessionStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ data, ts: cachedHomeFeedAt }));
  } catch {}
}

export default function HomePage() {
  const { user, openAuthModal } = useAuth();
  const { trackMedia, isInVault, notify } = useVault();

  const initialCache = readPersistedHomeFeed();
  const [feed, setFeed] = useState<HomeFeedData | null>(initialCache?.data || null);
  const [loading, setLoading] = useState(!initialCache?.data);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100%
  const [isPaused, setIsPaused] = useState(false);

  const progressRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const thumbStripRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback((forceFresh: boolean = false) => {
    const existing = readPersistedHomeFeed();
    const isFresh = existing && Date.now() - existing.ts < 1000 * 60 * 3;
    if (!forceFresh && existing?.data) {
      setFeed(existing.data);
      setLoading(false);
      if (isFresh) return;
      // Otherwise silently revalidate in background without showing skeleton
    } else {
      setLoading(true);
    }

    api.getHomeFeed()
      .then((data) => {
        if (data) {
          persistHomeFeed(data);
          setFeed(data);
          if (data.featuredSlides) {
            mediaCache.setMany(data.featuredSlides);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load home feed:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Warm Discover Page 1 in background when idle so navigating to Discover is instant
  useEffect(() => {
    if (!feed || discoverStore.isInitialized()) return;
    const timer = window.setTimeout(() => {
      if (discoverStore.isInitialized()) return;
      const seed = discoverStore.getState().visitSeed;
      api
        .discover({ page: 1, seed, sort: "Recommended" })
        .then((data) => {
          if (discoverStore.isInitialized() || !data?.items?.length) return;
          const seenIds = new Set<string>();
          const seenTitles = new Set<string>();
          const unique = data.items.filter((i) => {
            const key = `${i.title.toLowerCase().trim()}-${i.type}`;
            if (seenIds.has(i.id) || seenTitles.has(key)) return false;
            seenIds.add(i.id);
            seenTitles.add(key);
            return true;
          });
          discoverStore.updateState({
            items: unique,
            page: 1,
            hasMore: unique.length >= 8,
            seenIds,
            seenTitles,
            isInitialized: true,
          });
        })
        .catch(() => {});
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [feed]);

  // Extract 4 dynamic hero slides (1 Movie, 1 Series, 1 Anime, 1 Game)
  const slides: UnifiedMedia[] = [];
  if (feed) {
    if (feed.featuredSlides && feed.featuredSlides.length > 0) {
      slides.push(...feed.featuredSlides.slice(0, 4));
    } else {
      const pickOne = (arr?: UnifiedMedia[]) =>
        (arr || []).find((m) => m && m.backdrop && m.backdrop !== m.poster);
      const fallbackFour = [
        pickOne(feed.trendingMovies),
        pickOne(feed.trendingShows),
        pickOne(feed.topAnime),
        pickOne(feed.popularGames),
      ].filter((m): m is UnifiedMedia => Boolean(m));
      slides.push(...fallbackFour);
    }
  }

  if (slides.length === 0 && feed?.featured) {
    slides.push(feed.featured);
  }

  // Hardware-synced animation frame loop for the continuous slide progress bar
  useEffect(() => {
    if (slides.length <= 1) return;

    const tick = (timestamp: number) => {
      if (lastTimeRef.current !== null && !isPaused) {
        const delta = timestamp - lastTimeRef.current;
        progressRef.current += (delta / SLIDE_DURATION_MS) * 100;

        if (progressRef.current >= 100) {
          progressRef.current = 0;
          setCurrentSlide((prev) => (prev + 1) % slides.length);
        }
        setProgress(progressRef.current);
      }
      lastTimeRef.current = timestamp;
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
    };
  }, [slides.length, isPaused]);

  // Keyboard navigation for hero slider (Left / Right arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (slides.length <= 1) return;
      if (e.key === "ArrowLeft") {
        handlePrevSlide();
      } else if (e.key === "ArrowRight") {
        handleNextSlide();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length]);

  // Automatically smoothly scroll the mini-cards strip to center the active slide
  useEffect(() => {
    if (!thumbStripRef.current) return;
    const container = thumbStripRef.current;
    const activeEl = container.children[currentSlide] as HTMLElement;
    if (activeEl) {
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      const offset = (activeRect.left - containerRect.left) - (container.clientWidth / 2) + (activeEl.clientWidth / 2);
      container.scrollBy({
        left: offset,
        behavior: "smooth",
      });
    }
  }, [currentSlide]);

  const handlePrevSlide = () => {
    if (slides.length <= 1) return;
    progressRef.current = 0;
    setProgress(0);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNextSlide = () => {
    if (slides.length <= 1) return;
    progressRef.current = 0;
    setProgress(0);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handleSelectSlide = (idx: number) => {
    progressRef.current = 0;
    setProgress(0);
    setCurrentSlide(idx);
  };

  const handleShuffleHero = () => {
    progressRef.current = 0;
    setProgress(0);
    if (slides.length > 2) {
      // Rotate by a random offset to immediately show a different title
      const offset = 1 + Math.floor(Math.random() * (slides.length - 1));
      setCurrentSlide((prev) => (prev + offset) % slides.length);
      notify("Switched to fresh spotlight title!");
    } else {
      loadFeed(true);
      notify("Refreshed spotlight feed!");
    }
  };

  const activeMedia = slides[currentSlide] || feed?.featured;
  const isSaved = activeMedia ? isInVault(activeMedia.id) : false;

  const handleHeroTrack = () => {
    if (!user) {
      openAuthModal();
      return;
    }
    if (activeMedia) {
      trackMedia(activeMedia, isSaved ? "Wishlist" : "Watching");
    }
  };

  return (
    <div className="relative min-h-screen w-full">
      {/* Full-Page Dynamic Ambient Atmosphere (Uses lightweight poster for blurred wash — 15x faster) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {slides.map((slide, idx) => {
          const isNear =
            idx === currentSlide ||
            idx === (currentSlide + 1) % slides.length ||
            idx === (currentSlide - 1 + slides.length) % slides.length;
          if (!isNear) return null;
          return (
            <img
              key={`ambient-${slide.id}`}
              src={slide.poster || slide.backdrop}
              alt=""
              aria-hidden="true"
              decoding="async"
              loading={idx === currentSlide ? "eager" : "lazy"}
              className={`absolute inset-0 h-full w-full object-cover scale-125 filter blur-[90px] sm:blur-[110px] saturate-[140%] transition-opacity duration-1000 ease-in-out ${
                idx === currentSlide ? "opacity-55 sm:opacity-70" : "opacity-0"
              }`}
            />
          );
        })}
        {/* Subtle natural vignette that maintains crisp readability across all media cards */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[#070b0e]/85" />
      </div>

      {/* Full-Bleed Immersive Hero Section */}
      {activeMedia ? (
        <section
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => {
            lastTimeRef.current = null;
            setIsPaused(false);
          }}
          className="nv-reveal relative z-10 w-full -mt-[76px] pt-[80px] min-h-[580px] h-[100dvh] max-h-[860px] flex flex-col justify-end"
        >
          {/* Feathered Hero Artwork Container with Dynamic Crossfade (only mounts active & adjacent slides for fast initial paint) */}
          <div className="absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)]">
            {slides.map((slide, idx) => {
              const isNear =
                idx === currentSlide ||
                idx === (currentSlide + 1) % slides.length ||
                idx === (currentSlide - 1 + slides.length) % slides.length;
              if (!isNear) return null;
              return (
                <img
                  key={`hero-art-${slide.id}`}
                  src={slide.backdrop || slide.poster}
                  alt={slide.title}
                  fetchPriority={idx === currentSlide ? "high" : "low"}
                  loading={idx === currentSlide ? "eager" : "lazy"}
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-in-out ${
                    idx === currentSlide ? "opacity-95" : "opacity-0 pointer-events-none"
                  }`}
                />
              );
            })}
            {/* Directional left gradient shadow for maximum text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/55 to-transparent sm:max-w-[75%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070b0e] via-transparent to-transparent opacity-80" />
          </div>

          {/* Hero Content Container aligned with media rails */}
          <div className="relative z-10 mx-auto max-w-[1600px] w-full px-6 sm:px-10 lg:px-12 pb-6 sm:pb-8 lg:pb-10 flex flex-col justify-end drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              {/* Left Column: Title, Highlight Tags, Synopsis, Actions */}
              <div className="max-w-[820px] flex flex-col justify-end">
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <span className="text-xs font-bold text-white bg-black/70 px-3 py-1.5 rounded-xl border border-white/[.16] backdrop-blur-md shadow-sm">
                    {activeMedia.type}
                  </span>

                  <span className="text-slate-500 font-bold">·</span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#acd986] bg-black/70 px-3 py-1.5 rounded-xl border border-white/[.16] backdrop-blur-md shadow-sm">
                    <Star size={13} fill="#acd986" stroke="#acd986" />
                    <span className="font-mono-ui font-extrabold">{Math.round(Number(activeMedia.rating) > 5 ? Number(activeMedia.rating) / 2 : (Number(activeMedia.rating) || 4))}</span>
                    <span className="text-slate-400 font-normal">/ 5</span>
                  </div>

                  {activeMedia.year && (
                    <>
                      <span className="text-slate-500 font-bold">·</span>
                      <span className="font-mono-ui text-xs font-semibold text-slate-200 bg-black/70 px-3 py-1.5 rounded-xl border border-white/[.16] backdrop-blur-md">
                        {activeMedia.year}
                      </span>
                    </>
                  )}

                  {activeMedia.genre && (
                    <span className="hidden sm:inline-block text-xs font-medium text-slate-300 bg-black/70 px-3 py-1.5 rounded-xl border border-white/[.16] backdrop-blur-md">
                      {activeMedia.genre}
                    </span>
                  )}

                  {activeMedia.highlightTag && (
                    <span className="text-xs font-semibold text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/15 px-3 py-1.5 rounded-xl border border-[hsl(var(--primary))]/30 backdrop-blur-md flex items-center gap-1.5">
                      <Sparkles size={12} className="text-[hsl(var(--primary))]" />
                      <span>{activeMedia.highlightTag}</span>
                    </span>
                  )}

                  {(activeMedia.type === "Series" || activeMedia.type === "Anime") && activeMedia.airingStatus === "Ongoing" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--primary))] bg-[#08241d]/85 px-3 py-1.5 rounded-xl border border-[hsl(var(--primary))]/40 backdrop-blur-md shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))] shadow-[0_0_6px_hsl(var(--primary))] animate-pulse" />
                      <span>Ongoing</span>
                    </span>
                  )}
                </div>

                <h2 className="font-display mt-3 sm:mt-4 text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white line-clamp-2 drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
                  {activeMedia.title}
                </h2>

                <p className="mt-3 max-w-2xl text-sm sm:text-[15px] leading-relaxed text-slate-200 line-clamp-2 sm:line-clamp-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  {activeMedia.overview}
                </p>

                {/* Primary Action Buttons */}
                <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <Link
                    href={`/media/${activeMedia.id}`}
                    onClick={() => mediaCache.set(activeMedia)}
                    data-testid="link-hero-details"
                    className="nv-button group flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-extrabold text-[#061c17] hover:bg-[#6ae5c6] shadow-[0_8px_30px_rgba(55,218,178,.38),inset_0_1px_0_rgba(255,255,255,.45)] active:scale-95 transition-all"
                  >
                    <Play size={14} fill="currentColor" className="transition-transform group-hover:translate-x-0.5" />
                    View details
                  </Link>

                  <button
                    onClick={handleHeroTrack}
                    data-testid="button-hero-vault"
                    className={`nv-button flex items-center gap-2 rounded-full border px-5 py-2.5 sm:px-5.5 sm:py-3 text-xs sm:text-sm font-bold backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_8px_24px_rgba(0,0,0,.35)] active:scale-95 transition-all cursor-pointer ${
                      isSaved
                        ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/25"
                        : "border-white/[.18] bg-white/[.08] text-white hover:bg-white/[.16] hover:border-white/[.3]"
                    }`}
                  >
                    {isSaved ? <Check size={15} strokeWidth={2.5} /> : <BookmarkPlus size={15} />}
                    {isSaved ? "In your vault" : "Add to vault"}
                  </button>

                  <button
                    onClick={handleShuffleHero}
                    data-testid="button-hero-shuffle"
                    title="Shuffle featured titles"
                    className="nv-button group flex items-center gap-2 rounded-full border border-white/[.14] bg-[#0a0f14]/70 px-4 py-2.5 sm:py-3 text-xs sm:text-[13px] font-semibold text-slate-200 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_8px_24px_rgba(0,0,0,.35)] hover:text-[hsl(var(--primary))] hover:border-[hsl(var(--primary))]/45 hover:bg-[#0e171d]/85 active:scale-95 transition-all cursor-pointer"
                  >
                    <Shuffle size={14} className="text-[hsl(var(--primary))] transition-transform duration-300 group-hover:rotate-180" />
                    <span className="hidden sm:inline">Shuffle</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Unified Glass Controls & Refined Mini Entry Strip */}
              <div className="flex flex-col items-start lg:items-end flex-shrink-0 gap-3">
                {/* Unified Glass Carousel Control Dock */}
                <div className="inline-flex items-center gap-1 rounded-full border border-white/[.14] bg-[#0a0f14]/80 p-1 backdrop-blur-2xl shadow-[0_12px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <button
                    type="button"
                    onClick={handlePrevSlide}
                    aria-label="Previous slide"
                    className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-slate-300 transition-all hover:bg-white/[.12] hover:text-white active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] cursor-pointer"
                  >
                    <ChevronLeft size={18} strokeWidth={2.2} />
                  </button>

                  <div className="flex items-center gap-2 px-2.5 sm:px-3 font-mono-ui text-xs font-bold tracking-wider select-none">
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        isPaused
                          ? "bg-amber-400/80"
                          : "bg-[hsl(var(--primary))] shadow-[0_0_8px_hsl(var(--primary))] animate-pulse"
                      }`}
                    />
                    <span className="text-white">{String(currentSlide + 1).padStart(2, "0")}</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-slate-400">{String(slides.length).padStart(2, "0")}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextSlide}
                    aria-label="Next slide"
                    className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-slate-300 transition-all hover:bg-white/[.12] hover:text-white active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] cursor-pointer"
                  >
                    <ChevronRight size={18} strokeWidth={2.2} />
                  </button>
                </div>

                {/* Interactive Mini-Thumbnail Entry Strip */}
                <div
                  ref={thumbStripRef}
                  className="flex items-center gap-2.5 overflow-x-auto w-full max-w-[92vw] sm:max-w-[540px] lg:max-w-[600px] xl:max-w-[680px] py-2 px-3 -mx-1 scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_14px,black_calc(100%-14px),transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_14px,black_calc(100%-14px),transparent)]"
                >
                  {slides.map((slide, idx) => {
                    const isActive = currentSlide === idx;
                    const displayScore = Math.round(Number(slide.rating) > 5 ? Number(slide.rating) / 2 : (Number(slide.rating) || 4));
                    return (
                      <button
                        type="button"
                        key={`hero-thumb-${slide.id || idx}`}
                        onClick={() => handleSelectSlide(idx)}
                        aria-label={`Jump to slide: ${slide.title}`}
                        className={`group relative flex items-center gap-2.5 overflow-hidden rounded-[14px] p-2 pr-3 transition-all duration-300 text-left cursor-pointer flex-shrink-0 backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] ${
                          isActive
                            ? "border border-[hsl(var(--primary))]/75 bg-[#0d161b]/90 shadow-[0_8px_28px_rgba(55,218,178,0.22),inset_0_1px_0_rgba(255,255,255,0.12)]"
                            : "border border-white/[.09] bg-[#090e12]/65 opacity-70 hover:opacity-100 hover:bg-[#10181f]/85 hover:border-white/[.2]"
                        }`}
                      >
                        <div className="relative h-12 w-8 sm:h-[52px] sm:w-9 overflow-hidden rounded-[7px] bg-black/50 flex-shrink-0 ring-1 ring-white/15">
                          <img
                            src={slide.poster || slide.backdrop}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>

                        <div className="hidden sm:flex flex-col min-w-[88px] max-w-[126px] gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                              isActive ? "text-[hsl(var(--primary))]" : "text-slate-400 group-hover:text-slate-300"
                            }`}>
                              {slide.type}
                            </span>
                            {isActive && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))] shadow-[0_0_6px_hsl(var(--primary))] shrink-0" />
                            )}
                          </div>
                          <span className="text-[12.5px] font-bold text-white truncate leading-tight">
                            {slide.title}
                          </span>
                          <span className="font-mono-ui text-[11px] text-slate-400 flex items-center gap-1">
                            <Star size={10} fill="#acd986" stroke="#acd986" className="shrink-0" />
                            <span className="text-slate-300 font-semibold">{displayScore}</span>
                            {slide.year && <span className="text-slate-500">· {slide.year}</span>}
                          </span>
                        </div>

                        {/* Razor-thin inset bottom progress bar on active card */}
                        {isActive && (
                          <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-white/[.08]">
                            <div
                              className="h-full bg-gradient-to-r from-[hsl(var(--primary))] to-[#8cf0d6] shadow-[0_0_8px_hsl(var(--primary))]"
                              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Sleek Initial Hero Skeleton */
        <div className="w-full -mt-[76px] pt-[80px] min-h-[580px] h-[100dvh] max-h-[860px] bg-white/[.03] animate-pulse flex flex-col justify-end px-6 sm:px-10 lg:px-12 pb-6 sm:pb-8 lg:pb-10 mx-auto max-w-[1600px]">
          <div className="h-6 w-48 rounded-xl bg-white/[.08] mb-3" />
          <div className="h-12 sm:h-16 w-3/4 max-w-[550px] rounded-2xl bg-white/[.08] mb-4" />
          <div className="h-5 w-full max-w-[620px] rounded-lg bg-white/[.05] mb-6" />
          <div className="flex gap-3">
            <div className="h-12 w-36 rounded-xl bg-white/[.1]" />
            <div className="h-12 w-36 rounded-xl bg-white/[.05]" />
          </div>
        </div>
      )}

      {/* Main Rails Container with Optimized Spacing */}
      <div className="relative z-10 mx-auto max-w-[1600px] w-full px-6 sm:px-10 lg:px-12 space-y-16 mt-8 sm:mt-12 lg:mt-16 pb-28">
        {feed?.trendingMovies && feed.trendingMovies.length > 0 ? (
          <MediaRail
            title="Trending Movies"
            items={feed.trendingMovies}
          />
        ) : loading ? (
          <div className="space-y-3">
            <div className="h-5 w-48 rounded-md bg-white/[.04] animate-pulse" />
            <div className="flex gap-5 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-72 w-48 shrink-0 rounded-2xl bg-white/[.03] animate-pulse" />
              ))}
            </div>
          </div>
        ) : null}

        {feed?.trendingShows && feed.trendingShows.length > 0 ? (
          <MediaRail
            title="Trending TV Series"
            items={feed.trendingShows}
          />
        ) : loading ? (
          <div className="space-y-3">
            <div className="h-5 w-48 rounded-md bg-white/[.04] animate-pulse" />
            <div className="flex gap-5 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-72 w-48 shrink-0 rounded-2xl bg-white/[.03] animate-pulse" />
              ))}
            </div>
          </div>
        ) : null}

        {feed?.topAnime && feed.topAnime.length > 0 ? (
          <MediaRail
            title="Top Anime This Season"
            items={feed.topAnime}
          />
        ) : loading ? (
          <div className="space-y-3">
            <div className="h-5 w-48 rounded-md bg-white/[.04] animate-pulse" />
            <div className="flex gap-5 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-72 w-48 shrink-0 rounded-2xl bg-white/[.03] animate-pulse" />
              ))}
            </div>
          </div>
        ) : null}

        {feed?.popularGames && feed.popularGames.length > 0 ? (
          <MediaRail
            title="Popular Games"
            items={feed.popularGames}
          />
        ) : loading ? (
          <div className="space-y-3">
            <div className="h-5 w-48 rounded-md bg-white/[.04] animate-pulse" />
            <div className="flex gap-5 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-72 w-48 shrink-0 rounded-2xl bg-white/[.03] animate-pulse" />
              ))}
            </div>
          </div>
        ) : null}

        {feed?.weeklyDrop && feed.weeklyDrop.length > 0 ? (
          <MediaRail
            title="Curated Weekly Drop"
            items={feed.weeklyDrop}
          />
        ) : null}
      </div>
    </div>
  );
}
