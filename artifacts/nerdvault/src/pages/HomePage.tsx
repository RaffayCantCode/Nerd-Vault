import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Play, BookmarkPlus, Check, CircleDot, ChevronLeft, ChevronRight, Sparkles, Star } from "lucide-react";
import { api, HomeFeedData, UnifiedMedia } from "../lib/api";
import { mediaCache } from "../lib/mediaCache";
import { MediaRail } from "../components/media/MediaRail";
import { useVault } from "../context/VaultContext";
import { useAuth } from "../context/AuthContext";

const SLIDE_DURATION_MS = 8000; // 8 seconds per slide for a punchier, dynamic rhythm

let cachedHomeFeed: HomeFeedData | null = null;

export default function HomePage() {
  const { user, openAuthModal } = useAuth();
  const { trackMedia, isInVault, notify } = useVault();

  const [feed, setFeed] = useState<HomeFeedData | null>(cachedHomeFeed);
  const [loading, setLoading] = useState(!cachedHomeFeed);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100%
  const [isPaused, setIsPaused] = useState(false);

  const progressRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const loadFeed = useCallback((forceFresh: boolean = false) => {
    if (!forceFresh && cachedHomeFeed) {
      setFeed(cachedHomeFeed);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getHomeFeed()
      .then((data) => {
        if (data) {
          cachedHomeFeed = data;
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

  // Extract dynamic slides from backend aggregator (supports 6 to 8 varied slides)
  const slides: UnifiedMedia[] = [];
  if (feed) {
    if (feed.featuredSlides && feed.featuredSlides.length > 0) {
      slides.push(...feed.featuredSlides);
    } else {
      const candidates: UnifiedMedia[] = [
        ...(feed.trendingMovies || []),
        ...(feed.topAnime || []),
        ...(feed.popularGames || []),
        ...(feed.trendingShows || []),
      ].filter((m) => m && m.backdrop && m.backdrop !== m.poster);
      slides.push(...candidates.slice(0, 6));
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
      {/* Full-Page Dynamic Ambient Atmosphere (Smooth crossfade between slide color washes) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {slides.map((slide, idx) => (
          <img
            key={`ambient-${slide.id}`}
            src={slide.backdrop || slide.poster}
            alt=""
            aria-hidden="true"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover scale-125 filter blur-[90px] sm:blur-[110px] saturate-[140%] transition-opacity duration-1000 ease-in-out ${
              idx === currentSlide ? "opacity-60 sm:opacity-75" : "opacity-0"
            }`}
          />
        ))}
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
          {/* Feathered Hero Artwork Container with Dynamic Crossfade */}
          <div className="absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)]">
            {slides.map((slide, idx) => (
              <img
                key={`hero-art-${slide.id}`}
                src={slide.backdrop || slide.poster}
                alt={slide.title}
                fetchPriority={idx === currentSlide ? "high" : "auto"}
                decoding="async"
                className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 ease-in-out ${
                  idx === currentSlide ? "opacity-95" : "opacity-0 pointer-events-none"
                }`}
              />
            ))}
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
                  {/* Dynamic Highlight Tag from Backend */}
                  <span className="font-mono-ui text-[10.5px] sm:text-[11.5px] uppercase font-black tracking-[.2em] text-[hsl(var(--primary))] bg-black/70 px-3 py-1.5 rounded-xl border border-[hsl(var(--primary))]/40 backdrop-blur-md shadow-[0_0_15px_rgba(55,218,178,0.25)] flex items-center gap-1.5">
                    <Sparkles size={13} className="text-[hsl(var(--primary))]" />
                    <span>{activeMedia.highlightTag || `Spotlight · ${activeMedia.type}`}</span>
                  </span>

                  <span className="text-slate-400 font-bold">·</span>
                  <span className="font-mono-ui text-[10.5px] sm:text-[11.5px] font-extrabold text-[#acd986] bg-black/65 px-3 py-1.5 rounded-xl border border-white/[.15] backdrop-blur-md shadow-sm flex items-center gap-1">
                    <Star size={12} fill="#acd986" stroke="#acd986" />
                    <span>{activeMedia.rating} / 5</span>
                  </span>

                  {activeMedia.year && (
                    <>
                      <span className="text-slate-400 font-bold">·</span>
                      <span className="font-mono-ui text-[10.5px] sm:text-[11.5px] font-bold text-slate-200 bg-black/65 px-2.5 py-1.5 rounded-xl border border-white/[.15] backdrop-blur-md">
                        {activeMedia.year}
                      </span>
                    </>
                  )}

                  {activeMedia.genre && (
                    <span className="hidden sm:inline-block font-mono-ui text-[10.5px] sm:text-[11.5px] text-slate-300 bg-black/65 px-2.5 py-1.5 rounded-xl border border-white/[.15] backdrop-blur-md">
                      {activeMedia.genre}
                    </span>
                  )}
                </div>

                <h2 className="font-display mt-3 sm:mt-4 text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-[-.05em] text-white line-clamp-2 drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
                  {activeMedia.title}
                </h2>

                <p className="mt-2.5 sm:mt-3.5 max-w-[680px] text-[13px] sm:text-[14.5px] leading-5 sm:leading-6 text-slate-200 line-clamp-2 sm:line-clamp-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  {activeMedia.overview}
                </p>

                {/* Primary Action Buttons */}
                <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/media/${activeMedia.id}`}
                    onClick={() => mediaCache.set(activeMedia)}
                    data-testid="link-hero-details"
                    className="nv-button flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 sm:px-6 sm:py-3 text-[12px] sm:text-[13px] font-extrabold text-[#08211c] hover:bg-[#73e4c7] shadow-[0_0_28px_rgba(55,218,178,.45)] active:scale-95 transition"
                  >
                    <Play size={15} fill="currentColor" />
                    View details
                  </Link>

                  <button
                    onClick={handleHeroTrack}
                    data-testid="button-hero-vault"
                    className="nv-button flex items-center gap-2 rounded-xl border border-white/[.2] bg-black/60 px-4.5 py-2.5 sm:px-5 sm:py-3 text-[12px] sm:text-[13px] font-bold text-white backdrop-blur-md hover:bg-white/[.15] active:scale-95 transition"
                  >
                    {isSaved ? <Check size={15} /> : <BookmarkPlus size={15} />}
                    {isSaved ? "In your vault" : "Add to vault"}
                  </button>

                  <button
                    onClick={handleShuffleHero}
                    data-testid="button-hero-shuffle"
                    title="Shuffle featured titles"
                    className="nv-button flex items-center gap-1.5 rounded-xl border border-white/[.15] bg-black/40 px-3.5 py-2.5 text-[11.5px] font-bold text-slate-300 backdrop-blur-md hover:text-[hsl(var(--primary))] hover:border-[hsl(var(--primary))]/50 active:scale-95 transition cursor-pointer"
                  >
                    <Sparkles size={14} className="text-[hsl(var(--primary))]" />
                    <span className="hidden sm:inline">Shuffle spotlight</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Interactive Slides Strip with Mini Thumbnails */}
              <div className="flex flex-col items-start lg:items-end flex-shrink-0 gap-3">
                {/* Carousel Controls Bar */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handlePrevSlide}
                    aria-label="Previous slide"
                    className="nv-button flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/[.2] bg-black/70 text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/40 active:scale-95 shadow-md cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  {/* Slide Counter */}
                  <div className="flex items-center gap-1.5 text-[11px] font-mono-ui font-extrabold text-slate-200 bg-black/70 px-3 py-2 rounded-xl border border-white/[.15] backdrop-blur-md shadow-lg">
                    <CircleDot size={12} className="text-[hsl(var(--primary))]" />
                    <span>0{currentSlide + 1} / 0{slides.length}</span>
                  </div>

                  <button
                    onClick={handleNextSlide}
                    aria-label="Next slide"
                    className="nv-button flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/[.2] bg-black/70 text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/40 active:scale-95 shadow-md cursor-pointer"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Interactive Mini-Thumbnail Cards Carousel Strip */}
                <div className="flex items-center gap-2 overflow-x-auto max-w-[90vw] lg:max-w-[480px] xl:max-w-[560px] pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {slides.map((slide, idx) => {
                    const isActive = currentSlide === idx;
                    return (
                      <button
                        key={`hero-thumb-${slide.id || idx}`}
                        onClick={() => handleSelectSlide(idx)}
                        aria-label={`Jump to slide: ${slide.title}`}
                        className={`group relative flex items-center gap-2 rounded-xl p-1.5 transition-all duration-300 text-left cursor-pointer flex-shrink-0 ${
                          isActive
                            ? "border border-[hsl(var(--primary))] bg-black/85 shadow-[0_0_20px_rgba(55,218,178,0.3)] scale-[1.03]"
                            : "border border-white/10 bg-black/45 hover:border-white/30 hover:bg-black/65 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <div className="relative h-11 w-8 sm:h-12 sm:w-9 overflow-hidden rounded-lg bg-black/50 flex-shrink-0">
                          <img
                            src={slide.poster || slide.backdrop}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>

                        <div className="hidden sm:flex flex-col min-w-[70px] max-w-[95px] pr-1.5">
                          <span className="font-mono-ui text-[9px] uppercase font-bold text-[hsl(var(--primary))] truncate">
                            {slide.type}
                          </span>
                          <span className="text-[11px] font-bold text-white truncate">
                            {slide.title}
                          </span>
                          <span className="font-mono-ui text-[9.5px] text-slate-300 flex items-center gap-0.5">
                            ★ {slide.rating}
                          </span>
                        </div>

                        {/* Active Slide Progress Line */}
                        {isActive && (
                          <div className="absolute bottom-0 inset-x-1.5 h-0.5 bg-white/20 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[hsl(var(--primary))] shadow-[0_0_8px_hsl(var(--primary))]"
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
            title="Trending movies this week"
            eyebrow="Cinema spotlight"
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
            title="Trending television series"
            eyebrow="Small screen drops"
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
            title="Top anime this season"
            eyebrow="AniList charts"
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
            title="Popular video games"
            eyebrow="IGDB rankings"
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
            title="Curated multi-media drop"
            eyebrow="The weekly batch"
            items={feed.weeklyDrop}
          />
        ) : null}
      </div>
    </div>
  );
}
