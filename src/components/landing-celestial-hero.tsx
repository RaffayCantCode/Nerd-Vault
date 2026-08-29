"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Film, Tv, Sparkles, Gamepad2, Search,
  ArrowRight, Compass, Star, Layers,
} from "lucide-react";
import { LandingUniverseCanvas, RealmTheme } from "@/components/landing-universe-canvas";
import { BrowseResetLink } from "@/components/browse-reset-link";
import { MediaItem } from "@/lib/types";
import { optimizeMediaImageUrl } from "@/lib/media-image";

type CelestialHeroProps = {
  heroMovie?: MediaItem | null;
  heroShow?: MediaItem | null;
  heroAnime?: MediaItem | null;
  heroGame?: MediaItem | null;
};

const REALM_PILLS: Array<{
  id: RealmTheme;
  label: string;
  icon: React.ReactNode;
  accent: string;
}> = [
  { id: "all", label: "All Universes", icon: <Layers size={14} />, accent: "#69c5ac" },
  { id: "movie", label: "Cinema", icon: <Film size={14} />, accent: "#f59e0b" },
  { id: "show", label: "Series", icon: <Tv size={14} />, accent: "#a855f7" },
  { id: "anime", label: "Anime", icon: <Sparkles size={14} />, accent: "#ec4899" },
  { id: "game", label: "Games", icon: <Gamepad2 size={14} />, accent: "#10b981" },
];

function formatOverview(overview?: string, fallback = ""): string {
  if (!overview || !overview.trim()) return fallback;
  const clean = overview.replace(/\r?\n/g, " ").trim();
  if (clean.length <= 110) return clean;
  return clean.slice(0, 107).trim() + "...";
}

export function LandingCelestialHero({
  heroMovie,
  heroShow,
  heroAnime,
  heroGame,
}: CelestialHeroProps) {
  const [activeRealm, setActiveRealm] = useState<RealmTheme>("all");

  const spotlights = [
    {
      realm: "movie" as const,
      label: "Cinema Spotlight",
      item: heroMovie ?? null,
      defaultTitle: "Interstellar",
      defaultYear: 2014,
      defaultRating: 8.7,
      defaultCover: "https://image.tmdb.org/t/p/w780/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
      defaultOverview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
      accent: "#f59e0b",
      browseHref: "/browse?mediaType=movie",
    },
    {
      realm: "show" as const,
      label: "Series Spotlight",
      item: heroShow ?? null,
      defaultTitle: "Arcane",
      defaultYear: 2021,
      defaultRating: 9.0,
      defaultCover: "https://image.tmdb.org/t/p/w780/abPQHGCO10m5m56s94bU7491QO7.jpg",
      defaultOverview: "Set in the utopian region of Piltover and the oppressed underground of Zaun, two sisters fight on rival sides.",
      accent: "#a855f7",
      browseHref: "/browse?mediaType=show",
    },
    {
      realm: "anime" as const,
      label: "Anime Spotlight",
      item: heroAnime ?? null,
      defaultTitle: "Frieren: Beyond Journey's End",
      defaultYear: 2023,
      defaultRating: 9.1,
      defaultCover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-n2bBGbtgNtzy.jpg",
      defaultOverview: "An elf mage embarks on a quiet journey across the realm to understand humanity after defeating the Demon King.",
      accent: "#ec4899",
      browseHref: "/browse?mediaType=anime",
    },
    {
      realm: "game" as const,
      label: "Gaming Spotlight",
      item: heroGame ?? null,
      defaultTitle: "Elden Ring",
      defaultYear: 2022,
      defaultRating: 9.6,
      defaultCover: "https://images.igdb.com/igdb/image/upload/t_720p/co4jni.jpg",
      defaultOverview: "Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring in the Lands Between.",
      accent: "#10b981",
      browseHref: "/browse?mediaType=game",
    },
  ];

  return (
    <section className={`nv-celestial-hero realm-${activeRealm}`}>
      {/* 3D WebGL Universe Canvas Background */}
      <LandingUniverseCanvas activeRealm={activeRealm} />

      {/* Atmospheric Horizon & Radial Glow Layers */}
      <div className="nv-celestial-aurora" aria-hidden="true" />
      <div className="nv-celestial-vignette" aria-hidden="true" />

      <div className="nv-celestial-container">
        {/* 1. Luminous Eyebrow Badge */}
        <div className="nv-celestial-pill-group">
          <span className="nv-pill-dot" />
          <span className="nv-pill-tag">THE UNIFIED ENTERTAINMENT VAULT</span>
          <span className="nv-pill-sep">·</span>
          <span className="nv-pill-counter">500,000+ TITLES</span>
        </div>

        {/* 2. Headline with Ethereal Lighting Blend */}
        <div className="nv-celestial-title-wrap">
          <h1 className="nv-celestial-display-title">
            EVERY UNIVERSE<br />
            <span className="nv-celestial-gradient-text">YOU’VE EVER LIVED.</span>
          </h1>
          <p className="nv-celestial-subtext">
            Cinema. TV Series. Anime. Video Games.<br />
            A quiet, celestial sanctuary to track, organize, and chronicle everything you watch &amp; play.
          </p>
        </div>

        {/* 3. Interactive Realm Filter Tabs (Changes 3D Universe Atmosphere in Real-Time) */}
        <div className="nv-realm-tabs-bar" role="tablist" aria-label="Select universe realm">
          {REALM_PILLS.map((pill) => {
            const isActive = activeRealm === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveRealm(pill.id)}
                className={`nv-realm-tab-btn ${isActive ? "is-active" : ""}`}
                style={{ ["--realm-accent" as string]: pill.accent }}
              >
                <span className="nv-realm-icon">{pill.icon}</span>
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>

        {/* 4. Cosmic Instant Search & Primary Action Bar */}
        <div className="nv-celestial-action-row">
          <form action="/browse" method="GET" className="nv-celestial-search-box">
            <input type="hidden" name="focus" value="results" />
            {activeRealm !== "all" ? (
              <input type="hidden" name="mediaType" value={activeRealm} />
            ) : null}
            <Search size={17} className="nv-search-icon" aria-hidden="true" />
            <input
              type="search"
              name="query"
              className="nv-celestial-search-input"
              placeholder={`Search ${activeRealm === "all" ? "500,000+ films, anime, series, & games" : `in ${REALM_PILLS.find(p => p.id === activeRealm)?.label}...`}`}
              required
            />
            <button type="submit" className="nv-celestial-search-btn">
              Explore
            </button>
          </form>

          <div className="nv-celestial-cta-group">
            <Link href="/home" className="nv-celestial-primary-cta">
              <span>Open Your Vault</span>
              <ArrowRight size={16} />
            </Link>
            <BrowseResetLink className="nv-celestial-secondary-cta">
              <Compass size={16} />
              <span>Browse All</span>
            </BrowseResetLink>
          </div>
        </div>

        {/* 5. 3D Holographic Constellation Cards Showcase (Real-Time Trending Media) */}
        <div className="nv-celestial-showcase-grid">
          {spotlights.map((spotlight) => {
            const isMatch = activeRealm === "all" || activeRealm === spotlight.realm;
            const item = spotlight.item;

            const title = item?.title || spotlight.defaultTitle;
            const year = item?.year || spotlight.defaultYear;
            const rating = (item?.rating && item.rating > 0) ? item.rating : spotlight.defaultRating;
            const overview = formatOverview(item?.overview, spotlight.defaultOverview);
            
            const rawImageUrl = item?.backdropUrl || item?.coverUrl || spotlight.defaultCover;
            const imageUrl = optimizeMediaImageUrl(rawImageUrl, "cover") || rawImageUrl;

            const href = item
              ? `/media/${item.slug}?source=${item.source}&sourceId=${item.sourceId}&type=${item.type}`
              : spotlight.browseHref;

            return (
              <Link
                key={spotlight.realm}
                href={href}
                className={`nv-celestial-card glass ${isMatch ? "is-spotlight" : "is-dimmed"}`}
                style={{ ["--card-accent" as string]: spotlight.accent }}
              >
                <div className="nv-celestial-card-poster">
                  <img
                    src={imageUrl}
                    alt={title}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      if (e.currentTarget.src !== spotlight.defaultCover) {
                        e.currentTarget.src = spotlight.defaultCover;
                      }
                    }}
                  />
                  <div className="nv-card-poster-scrim" />
                  <span className="nv-card-badge" style={{ borderColor: spotlight.accent, color: spotlight.accent }}>
                    {spotlight.label}
                  </span>
                </div>

                <div className="nv-celestial-card-body">
                  <div className="nv-card-head-row">
                    <h3 className="nv-card-title" title={title}>{title}</h3>
                    <span className="nv-card-rating">
                      <Star size={12} className="star-fill" />
                      {rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="nv-card-year">{year}</span>
                  <p className="nv-card-quote">“{overview}”</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
