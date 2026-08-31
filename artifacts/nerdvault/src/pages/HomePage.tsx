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
    setLoading(true);
    api.getHomeFeed()
      .then((data) => {
        if (data) setFeed(data);
      })
      .catch((err) => {
        console.error("Failed to load home feed:", err);
      })
      .finally(() => setLoading(false));
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

  if (loading) {
    return (
      <div className="space-y-8 pb-12 animate-pulse">
        <div className="min-h-[440px] rounded-3xl bg-white/[.04] border border-white/[.08]" />
        <div className="h-64 rounded-2xl bg-white/[.03]" />
        <div className="h-64 rounded-2xl bg-white/[.03]" />
      </div>
    );
  }

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
      {/* 4-Slide Hero Spotlight Banner */}
      {activeMedia && (
        <section
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="nv-reveal relative min-h-[460px] sm:min-h-[500px] overflow-hidden rounded-3xl border border-white/[.12] shadow-2xl transition-all duration-500 flex flex-col justify-end"
        >
          <img
            key={activeMedia.id}
            src={activeMedia.backdrop || activeMedia.poster}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center opacity-70 transition-opacity duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f13] via-[#0a0f13]/85 to-[#0a0f13]/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f13] via-[#0a0f13]/60 to-transparent" />

          {/* Hero Content */}
          <div className="relative z-10 flex flex-col justify-end p-6 sm:p-10 lg:p-12 max-w-[840px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono-ui text-[11px] uppercase font-extrabold tracking-[.22em] text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 px-2.5 py-0.5 rounded-md border border-[hsl(var(--primary))]/20">
                Featured tonight · {activeMedia.type}
              </span>
              <span className="text-slate-500">·</span>
              <span className="font-mono-ui text-[11px] font-bold text-[#acd986]">
                ★ {activeMedia.rating} / 5
              </span>
            </div>

            <h2 className="font-display mt-3 text-3xl font-bold tracking-[-.06em] text-white sm:text-5xl lg:text-6xl line-clamp-2">
              {activeMedia.title}
            </h2>

            <p className="mt-3 max-w-[580px] text-[12px] sm:text-[13px] leading-5 sm:leading-6 text-slate-300/85 line-clamp-3">
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
                  className="nv-button flex items-center gap-2 rounded-xl border border-white/[.18] bg-black/40 px-4 py-2.5 text-[12px] font-bold text-white backdrop-blur-md hover:bg-white/[.12]"
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
                  className="nv-button flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/[.15] bg-black/50 text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/30 active:scale-95 shadow-md"
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
                  className="nv-button flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/[.15] bg-black/50 text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/30 active:scale-95 shadow-md"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Rails with Live APIs */}
      {feed?.trendingMovies && feed.trendingMovies.length > 0 && (
        <MediaRail
          title="Trending movies this week"
          eyebrow="Cinema spotlight"
          items={feed.trendingMovies}
        />
      )}

      {feed?.trendingShows && feed.trendingShows.length > 0 && (
        <MediaRail
          title="Trending television series"
          eyebrow="Small screen drops"
          items={feed.trendingShows}
        />
      )}

      {feed?.topAnime && feed.topAnime.length > 0 && (
        <MediaRail
          title="Top anime this season"
          eyebrow="AniList charts"
          items={feed.topAnime}
        />
      )}

      {feed?.popularGames && feed.popularGames.length > 0 && (
        <MediaRail
          title="Popular video games"
          eyebrow="IGDB rankings"
          items={feed.popularGames}
        />
      )}

      {feed?.weeklyDrop && feed.weeklyDrop.length > 0 && (
        <MediaRail
          title="Curated multi-media drop"
          eyebrow="The weekly batch"
          items={feed.weeklyDrop}
        />
      )}
    </div>
  );
}
