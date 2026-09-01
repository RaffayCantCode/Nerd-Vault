import React, { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { Play, BookmarkPlus, Check, CircleDot, ChevronLeft, ChevronRight } from "lucide-react";
import { api, HomeFeedData, UnifiedMedia } from "../lib/api";
import { MediaRail } from "../components/media/MediaRail";
import { useVault } from "../context/VaultContext";
import { useAuth } from "../context/AuthContext";

const SLIDE_DURATION_MS = 10000; // 10 seconds per slide

export default function HomePage() {
  const { user, openAuthModal } = useAuth();
  const { trackMedia, isInVault } = useVault();

  const [feed, setFeed] = useState<HomeFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100%
  const [isPaused, setIsPaused] = useState(false);

  const progressRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.getHomeFeed()
      .then((data) => {
        if (data && isMounted) {
          setFeed(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load home feed:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Build the 4 slides: 1 Movie, 1 Show, 1 Anime, 1 Game (Prioritize genuine widescreen 16:9 backdrops)
  const slides: UnifiedMedia[] = [];
  if (feed) {
    const movie = feed.trendingMovies?.find((m) => m.backdrop && m.backdrop.length > 5 && m.backdrop !== m.poster) || feed.trendingMovies?.[0];
    if (movie) slides.push(movie);

    const show = feed.trendingShows?.find((s) => s.backdrop && s.backdrop.length > 5 && s.backdrop !== s.poster) || feed.trendingShows?.[0];
    if (show) slides.push(show);

    const anime = feed.topAnime?.find((a) => a.backdrop && a.backdrop.length > 5 && a.backdrop !== a.poster) || feed.topAnime?.[0];
    if (anime) slides.push(anime);

    const game = feed.popularGames?.find((g) => g.backdrop && g.backdrop.length > 5 && g.backdrop !== g.poster) || feed.popularGames?.[0];
    if (game) slides.push(game);
  }

  if (slides.length === 0 && feed?.featured) {
    slides.push(feed.featured);
  }

  // High-precision, hardware-synced requestAnimationFrame loop for the 10-second fill
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
      {/* Full-Page Dynamic Ambient Atmosphere (Smoothly projects the banner's natural blurred color wash down the entire page) */}
      {activeMedia && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <img
            key={`ambient-${activeMedia.id}`}
            src={activeMedia.backdrop || activeMedia.poster}
            alt=""
            className="h-full w-full object-cover scale-125 transition-all duration-1000 filter blur-[90px] sm:blur-[110px] opacity-60 sm:opacity-70 saturate-[140%]"
          />
          {/* Subtle natural vignette that maintains crisp readability across all media cards */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/40 to-[#070b0e]/80" />
        </div>
      )}

      {/* Full-Bleed Immersive Hero with Feathered Bottom Fade (Melt seamlessly into ambient background) */}
      {activeMedia ? (
        <section
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => {
            lastTimeRef.current = null;
            setIsPaused(false);
          }}
          className="nv-reveal relative z-10 w-full -mt-[76px] pt-[96px] min-h-[640px] sm:min-h-[720px] lg:min-h-[780px] flex flex-col justify-end"
        >
          {/* Feathered Hero Artwork Container (Gradually dissolves into the ambient glow with zero hard cuts) */}
          <div className="absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,black_55%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_55%,transparent_100%)]">
            <img
              key={activeMedia.id}
              src={activeMedia.backdrop || activeMedia.poster}
              alt=""
              className="h-full w-full object-cover object-center opacity-95 transition-opacity duration-700"
            />
            {/* Directional left shadow for text clarity */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/40 to-transparent sm:max-w-[70%]" />
          </div>

          {/* Hero Content Container aligned with media rails */}
          <div className="relative z-10 mx-auto max-w-[1600px] w-full px-6 sm:px-10 lg:px-12 pb-14 flex flex-col justify-end drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono-ui text-[11px] uppercase font-extrabold tracking-[.22em] text-[hsl(var(--primary))] bg-black/60 px-3 py-1 rounded-xl border border-[hsl(var(--primary))]/30 backdrop-blur-md shadow-sm">
                Featured tonight · {activeMedia.type}
              </span>
              <span className="text-slate-400">·</span>
              <span className="font-mono-ui text-[11px] font-bold text-[#acd986] bg-black/60 px-3 py-1 rounded-xl border border-white/[.1] backdrop-blur-md shadow-sm">
                ★ {activeMedia.rating} / 5
              </span>
            </div>

            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-[-.05em] text-white sm:text-5xl lg:text-6xl line-clamp-2 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
              {activeMedia.title}
            </h2>

            <p className="mt-3.5 max-w-[640px] text-[13px] sm:text-[14px] leading-6 sm:leading-7 text-slate-200 line-clamp-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {activeMedia.overview}
            </p>

            {/* Bottom Controls Row: Action Buttons + 4 Progress Bar Capsules & Arrows */}
            <div className="mt-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/media/${activeMedia.id}`}
                  data-testid="link-hero-details"
                  className="nv-button flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-3 text-[12.5px] font-extrabold text-[#08211c] hover:bg-[#73e4c7] shadow-[0_0_28px_rgba(55,218,178,.35)] active:scale-95 transition"
                >
                  <Play size={14} fill="currentColor" />
                  View details
                </Link>
                <button
                  onClick={handleHeroTrack}
                  data-testid="button-hero-vault"
                  className="nv-button flex items-center gap-2 rounded-xl border border-white/[.2] bg-black/50 px-5 py-3 text-[12.5px] font-bold text-white backdrop-blur-md hover:bg-white/[.15] active:scale-95 transition"
                >
                  {isSaved ? <Check size={14} /> : <BookmarkPlus size={14} />}
                  {isSaved ? "In your vault" : "Add to vault"}
                </button>
              </div>

              {/* Carousel Arrows + 4 Animated Progress Bar Capsules */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Back / Prev Button */}
                <button
                  onClick={handlePrevSlide}
                  aria-label="Previous slide"
                  className="nv-button flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/[.18] bg-black/60 text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/30 active:scale-95 shadow-md cursor-pointer"
                >
                  <ChevronLeft size={17} />
                </button>

                {/* 4 Animated Progress Bar Capsules (10 seconds smooth continuous fill) */}
                <div className="flex items-center gap-2 px-3 py-2 bg-black/60 rounded-xl border border-white/[.15] backdrop-blur-md shadow-lg">
                  {slides.map((s, idx) => {
                    const isActive = currentSlide === idx;
                    return (
                      <button
                        key={s.id || idx}
                        onClick={() => handleSelectSlide(idx)}
                        aria-label={`Go to slide ${idx + 1}`}
                        className="group relative h-2.5 rounded-full overflow-hidden transition-all duration-300 focus:outline-none cursor-pointer flex items-center"
                        style={{
                          width: isActive ? "46px" : "10px",
                          backgroundColor: isActive ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.45)",
                        }}
                      >
                        {isActive ? (
                          <div
                            className="h-full bg-[hsl(var(--primary))] shadow-[0_0_10px_hsl(var(--primary))] rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, progress))}%`,
                            }}
                          />
                        ) : (
                          <div className="h-full w-full opacity-0 group-hover:opacity-100 bg-white/40 rounded-full transition" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Slide Counter */}
                <div className="flex items-center gap-1.5 text-[11px] font-mono-ui font-bold text-slate-300 bg-black/60 px-3 py-2 rounded-xl border border-white/[.1] backdrop-blur-md">
                  <CircleDot size={12} className="text-[hsl(var(--primary))]" />
                  <span>0{currentSlide + 1} / 0{slides.length || 4}</span>
                </div>

                {/* Front / Next Button */}
                <button
                  onClick={handleNextSlide}
                  aria-label="Next slide"
                  className="nv-button flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/[.18] bg-black/60 text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/30 active:scale-95 shadow-md cursor-pointer"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Sleek Initial Hero Skeleton */
        <div className="w-full -mt-[76px] pt-[96px] min-h-[640px] sm:min-h-[720px] lg:min-h-[780px] bg-white/[.03] animate-pulse flex flex-col justify-end p-8 sm:p-14 mx-auto max-w-[1600px]">
          <div className="h-6 w-40 rounded-md bg-white/[.06] mb-4" />
          <div className="h-14 w-3/4 max-w-[500px] rounded-xl bg-white/[.06] mb-3" />
          <div className="h-4 w-full max-w-[580px] rounded-md bg-white/[.04] mb-7" />
          <div className="h-12 w-52 rounded-xl bg-white/[.08]" />
        </div>
      )}

      {/* Main Rails Container (Cinema Spotlight moved down generously) */}
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
