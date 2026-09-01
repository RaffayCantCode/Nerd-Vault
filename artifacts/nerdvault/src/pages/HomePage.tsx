import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { Play, BookmarkPlus, Check, CircleDot, ChevronLeft, ChevronRight } from "lucide-react";
import { api, HomeFeedData, UnifiedMedia } from "../lib/api";
import { MediaRail } from "../components/media/MediaRail";
import { useVault } from "../context/VaultContext";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { user, openAuthModal } = useAuth();
  const { trackMedia, isInVault } = useVault();

  const [feed, setFeed] = useState<HomeFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

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

  // Build the 4 slides: 1 Movie, 1 Show, 1 Anime, 1 Game
  const slides: UnifiedMedia[] = [];
  if (feed) {
    if (feed.trendingMovies && feed.trendingMovies[0]) slides.push(feed.trendingMovies[0]);
    if (feed.trendingShows && feed.trendingShows[0]) slides.push(feed.trendingShows[0]);
    if (feed.topAnime && feed.topAnime[0]) slides.push(feed.topAnime[0]);
    if (feed.popularGames && feed.popularGames[0]) slides.push(feed.popularGames[0]);
  }

  if (slides.length === 0 && feed?.featured) {
    slides.push(feed.featured);
  }

  const handlePrevSlide = () => {
    if (slides.length <= 1) return;
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNextSlide = () => {
    if (slides.length <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  // Auto-advance hero carousel every 6.5s unless hovered
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [slides.length, isPaused]);

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
    <div className="space-y-12 pb-16">
      {/* 4-Slide Hero Spotlight Banner — Bright, Vivid Artwork */}
      {activeMedia ? (
        <section
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="nv-reveal relative min-h-[460px] sm:min-h-[500px] overflow-hidden rounded-3xl border border-white/[.14] shadow-2xl transition-all duration-500 flex flex-col justify-end"
        >
          <img
            key={activeMedia.id}
            src={activeMedia.backdrop || activeMedia.poster}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center opacity-95 transition-opacity duration-700"
          />
          {/* Targeted left-weighted gradient for readability without darkening the main artwork */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b0e]/95 via-[#070b0e]/50 to-transparent sm:max-w-[70%]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#070b0e]/90 via-[#070b0e]/40 to-transparent" />

          {/* Hero Content */}
          <div className="relative z-10 flex flex-col justify-end p-6 sm:p-10 lg:p-12 max-w-[840px] drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono-ui text-[11px] uppercase font-extrabold tracking-[.22em] text-[hsl(var(--primary))] bg-black/60 px-2.5 py-1 rounded-lg border border-[hsl(var(--primary))]/30 backdrop-blur-md">
                Featured tonight · {activeMedia.type}
              </span>
              <span className="text-slate-400">·</span>
              <span className="font-mono-ui text-[11px] font-bold text-[#acd986] bg-black/60 px-2.5 py-1 rounded-lg border border-white/[.1] backdrop-blur-md">
                ★ {activeMedia.rating} / 5
              </span>
            </div>

            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-[-.05em] text-white sm:text-5xl lg:text-6xl line-clamp-2 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
              {activeMedia.title}
            </h2>

            <p className="mt-3 max-w-[580px] text-[12px] sm:text-[13px] leading-5 sm:leading-6 text-slate-200 line-clamp-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {activeMedia.overview}
            </p>

            {/* Bottom Controls Row: Action Buttons + Responsive Carousel Arrows & Dots */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  href={`/media/${activeMedia.id}`}
                  data-testid="link-hero-details"
                  className="nv-button flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-[12px] font-extrabold text-[#08211c] hover:bg-[#73e4c7] shadow-[0_0_24px_rgba(55,218,178,.3)]"
                >
                  <Play size={14} fill="currentColor" />
                  View details
                </Link>
                <button
                  onClick={handleHeroTrack}
                  data-testid="button-hero-vault"
                  className="nv-button flex items-center gap-2 rounded-xl border border-white/[.18] bg-black/50 px-4 py-2.5 text-[12px] font-bold text-white backdrop-blur-md hover:bg-white/[.15]"
                >
                  {isSaved ? <Check size={14} /> : <BookmarkPlus size={14} />}
                  {isSaved ? "In your vault" : "Add to vault"}
                </button>
              </div>

              {/* Carousel Arrows + Slide Indicators */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Back / Prev Button */}
                <button
                  onClick={handlePrevSlide}
                  aria-label="Previous slide"
                  className="nv-button flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/[.15] bg-black/60 text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/30 active:scale-95 shadow-md"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Dots */}
                <div className="flex items-center gap-1.5 px-1">
                  {slides.map((s, idx) => (
                    <button
                      key={s.id || idx}
                      onClick={() => setCurrentSlide(idx)}
                      aria-label={`Go to slide ${idx + 1}`}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentSlide === idx
                          ? "w-6 bg-[hsl(var(--primary))]"
                          : "w-2 bg-white/30 hover:bg-white/60"
                      }`}
                    />
                  ))}
                </div>

                {/* Slide Counter */}
                <div className="flex items-center gap-1 text-[10px] font-mono-ui font-bold text-slate-300 bg-black/60 px-2.5 py-1.5 rounded-xl border border-white/[.1] backdrop-blur-md">
                  <CircleDot size={11} className="text-[hsl(var(--primary))]" />
                  <span>0{currentSlide + 1} / 0{slides.length || 4}</span>
                </div>

                {/* Front / Next Button */}
                <button
                  onClick={handleNextSlide}
                  aria-label="Next slide"
                  className="nv-button flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/[.15] bg-black/60 text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/30 active:scale-95 shadow-md"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Sleek Initial Hero Skeleton */
        <div className="min-h-[460px] sm:min-h-[500px] rounded-3xl bg-white/[.03] border border-white/[.08] animate-pulse flex flex-col justify-end p-8 sm:p-12">
          <div className="h-6 w-36 rounded-md bg-white/[.06] mb-4" />
          <div className="h-12 w-3/4 max-w-[480px] rounded-xl bg-white/[.06] mb-3" />
          <div className="h-4 w-full max-w-[560px] rounded-md bg-white/[.04] mb-6" />
          <div className="h-10 w-48 rounded-xl bg-white/[.08]" />
        </div>
      )}

      {/* Main Rails with Clean Single Loading State */}
      {feed?.trendingMovies && feed.trendingMovies.length > 0 ? (
        <MediaRail
          title="Trending movies this week"
          eyebrow="Cinema spotlight"
          items={feed.trendingMovies}
        />
      ) : loading ? (
        <div className="space-y-3">
          <div className="h-5 w-48 rounded-md bg-white/[.04] animate-pulse" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-56 w-36 shrink-0 rounded-2xl bg-white/[.03] animate-pulse" />
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
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-56 w-36 shrink-0 rounded-2xl bg-white/[.03] animate-pulse" />
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
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-56 w-36 shrink-0 rounded-2xl bg-white/[.03] animate-pulse" />
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
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-56 w-36 shrink-0 rounded-2xl bg-white/[.03] animate-pulse" />
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
  );
}
