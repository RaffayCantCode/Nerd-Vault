import Image from "next/image";
import Link from "next/link";
import {
  Film, Tv, Gamepad2, Search, Sparkles,
  Star, Users, ArrowRight, Compass, Flame,
  Layers, CheckCircle2, Bookmark, ArrowUpRight,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BrandLogo } from "@/components/brand-logo";
import { BrowseResetLink } from "@/components/browse-reset-link";
import { getBrowseDiscoverySeed, getBrowseBootstrapCatalog } from "@/lib/browse-bootstrap";
import { isFamilyFriendlyMediaItem } from "@/lib/media-safety";
import { MediaItem } from "@/lib/types";
import { optimizeMediaImageUrl } from "@/lib/media-image";
import { LandingMediaRail } from "@/components/landing-media-rail";
import { LandingMarqueeStream } from "@/components/landing-marquee-stream";
import { getPublicCommunityActivity } from "@/lib/vault-server";

export const revalidate = 3600;

function formatMediaTypeLabel(type: string) {
  if (type === "anime_movie") return "Anime Movie";
  if (type === "anime") return "Anime";
  if (type === "game") return "Game";
  if (type === "show") return "Show";
  return "Movie";
}

export default async function HomePage() {
  const seed = getBrowseDiscoverySeed();

  const [bootstrapResult, realActivity] = await Promise.all([
    getBrowseBootstrapCatalog(seed).catch(() => ({ catalog: [] as MediaItem[], surfacing: [] as MediaItem[] })),
    getPublicCommunityActivity(8).catch(() => []),
  ]);

  const catalog = (bootstrapResult.catalog || []).filter(isFamilyFriendlyMediaItem);

  const movies = catalog.filter((i) => i.type === "movie").slice(0, 16);
  const shows = catalog.filter((i) => i.type === "show").slice(0, 16);
  const games = catalog.filter((i) => i.type === "game").slice(0, 16);
  const anime = catalog.filter((i) => i.type === "anime" || i.type === "anime_movie").slice(0, 16);

  // Interleave trending media items across moving marquee lanes
  const marqueeLane1 = [
    ...movies.slice(0, 5),
    ...anime.slice(0, 5),
    ...shows.slice(0, 5),
    ...games.slice(0, 5),
  ];
  const marqueeLane2 = [
    ...games.slice(0, 5),
    ...shows.slice(0, 5),
    ...movies.slice(0, 5),
    ...anime.slice(0, 5),
  ];

  const heroMovie = movies[0] || null;
  const heroShow = shows[0] || null;
  const heroAnime = anime[0] || null;
  const heroGame = games[0] || null;

  return (
    <div className="nv-landing">
      <SiteHeader />

      <main className="nv-landing-main">
        {/* CALM EDITORIAL STORYTELLING HERO (INSPIRED BY NORVALE) */}
        <section className="nv-story-hero">
          {/* Subtle warm atmospheric glow */}
          <div className="nv-story-ambient-aura" aria-hidden="true" />

          <div className="nv-story-container">
            {/* 1. Quiet Top Navigation & Pretitle */}
            <div className="nv-story-pretitle-row">
              <span className="nv-story-eyebrow">A Timeless Personal Chronicle</span>
              <span className="nv-story-dot">·</span>
              <span className="nv-story-sublabel">Cinema × Series × Anime × Games</span>
            </div>

            {/* 2. Editorial Serif Title & Narrative Quote */}
            <div className="nv-story-heading-group">
              <h1 className="nv-story-display-title">
                EVERY STORY<br />
                <em>YOU’VE LIVED.</em>
              </h1>
              <p className="nv-story-manifesto">
                “Films that kept you up at 2 AM. Anime arcs that gave you chills. 100-hour game worlds you lived inside. A quiet, personal sanctuary for everything you watch &amp; play.”
              </p>
            </div>

            {/* 3. Restrained Editorial Actions */}
            <div className="nv-story-actions">
              <Link
                href="/home"
                className="nv-story-btn-primary"
              >
                <span>Open Your Vault</span>
                <ArrowRight size={16} />
              </Link>
              <BrowseResetLink className="nv-story-btn-secondary">
                <span>Explore Catalog</span>
                <Compass size={16} />
              </BrowseResetLink>
            </div>

            {/* 4. The Editorial Folio Canvas (Layered Story Cards) */}
            <div className="nv-story-folio-canvas">
              <div className="nv-folio-paper-frame">
                {/* Background Artwork */}
                <div className="nv-folio-scrim" />
                <div className="nv-folio-stars-layer" aria-hidden="true" />

                {/* Floating Story Card 01: Journal Log Entry */}
                <div className="nv-folio-artifact artifact-journal">
                  <div className="nv-artifact-head">
                    <span className="nv-artifact-tag">01 · RECENT LOG</span>
                    <span className="nv-artifact-time">2:45 AM</span>
                  </div>
                  <h4 className="nv-artifact-title">Interstellar (2014)</h4>
                  <div className="nv-artifact-stars">★★★★★</div>
                  <p className="nv-artifact-quote">
                    “We used to look up at the sky and wonder at our place in the stars.”
                  </p>
                </div>

                {/* Floating Story Card 02: Vault Chronicle Stats */}
                <div className="nv-folio-artifact artifact-stats">
                  <div className="nv-stats-num">482</div>
                  <div className="nv-stats-label">Stories Chronicled</div>
                  <div className="nv-stats-pills">
                    <span>94 Films</span>
                    <span>168 Shows</span>
                    <span>140 Anime</span>
                    <span>80 Games</span>
                  </div>
                </div>

                {/* Floating Story Card 03: Franchise Canon Thread */}
                <div className="nv-folio-artifact artifact-thread">
                  <div className="nv-thread-tag">SAGA THREAD · CANON ORDER</div>
                  <h5 className="nv-thread-title">Fate Series Chronology</h5>
                  <div className="nv-thread-steps">
                    <span className="step-done">✓ Fate/Zero</span>
                    <span className="step-arrow">→</span>
                    <span className="step-done">✓ Unlimited Blade Works</span>
                    <span className="step-arrow">→</span>
                    <span className="step-active">● Heaven’s Feel</span>
                  </div>
                </div>

                {/* Center Canvas Editorial Caption */}
                <div className="nv-folio-center-caption">
                  <p className="nv-caption-quote">
                    “Progress rarely arrives loudly. Most of the time, it happens quietly while you’re busy exploring new worlds.”
                  </p>
                  <span className="nv-caption-author">— from the member journals</span>
                </div>
              </div>
            </div>

            {/* 5. Minimalist Live Search */}
            <form action="/browse" method="GET" className="nv-story-search-bar">
              <input type="hidden" name="focus" value="results" />
              <Search size={16} className="nv-story-search-icon" aria-hidden="true" />
              <input
                type="search"
                name="query"
                className="nv-story-search-input"
                placeholder="Search across 500,000+ films, anime, series, and games..."
                required
              />
              <button type="submit" className="nv-story-search-submit">
                Search
              </button>
            </form>
          </div>
        </section>

        {/* CONTINUOUS MOVING MEDIA STREAMS (MARQUEES) */}
        <LandingMarqueeStream
          lane1Items={marqueeLane1}
          lane2Items={marqueeLane2}
        />

        {/* CURATED CATEGORY RAILS WITH SMOOTH BUTTON CONTROLS */}
        {movies.length > 0 && (
          <LandingMediaRail
            label="Trending Movies"
            eyebrow="Cinema Spotlight"
            icon={<Film size={18} />}
            items={movies}
            viewAllHref="/browse?mediaType=movie"
            accentColor="#f59e0b"
          />
        )}

        {shows.length > 0 && (
          <LandingMediaRail
            label="Popular TV Shows"
            eyebrow="Binge-Worthy Series"
            icon={<Tv size={18} />}
            items={shows}
            viewAllHref="/browse?mediaType=show"
            accentColor="#a855f7"
          />
        )}

        {anime.length > 0 && (
          <LandingMediaRail
            label="Top Airing Anime"
            eyebrow="AniList Highlights"
            icon={<Sparkles size={18} />}
            items={anime}
            viewAllHref="/browse?mediaType=anime"
            accentColor="#ec4899"
          />
        )}

        {games.length > 0 && (
          <LandingMediaRail
            label="Acclaimed Video Games"
            eyebrow="Player Favorites"
            icon={<Gamepad2 size={18} />}
            items={games}
            viewAllHref="/browse?mediaType=game"
            accentColor="#10b981"
          />
        )}

        {/* COMMUNITY PULSE */}
        {realActivity.length > 0 && (
          <section className="nv-section nv-community-section">
            <div className="nv-section-inner">
              <div className="nv-section-head">
                <div>
                  <p className="eyebrow">Community Pulse</p>
                  <h2 className="nv-section-title">
                    <Users size={20} /> Recent Member Activity
                  </h2>
                </div>
                <Link href="/activity" className="nv-section-link">
                  View full activity <ArrowRight size={14} />
                </Link>
              </div>

              <div className="nv-community-grid">
                {realActivity.slice(0, 8).map((entry, i) => {
                  const name = entry.user_name || "Member";
                  const imageUrl = optimizeMediaImageUrl(entry.media_backdrop_url || entry.media_cover_url || "/fallback-poster.jpg", "cover");
                  return (
                    <Link
                      key={`act-${entry.user_id}-${entry.media_id}-${i}`}
                      href={`/media/${entry.media_slug}?source=${entry.media_source}&sourceId=${entry.media_source_id}&type=${entry.media_type}`}
                      className="nv-community-card glass"
                    >
                      <div className="nv-community-img-wrap">
                        <img src={imageUrl || "/fallback-poster.jpg"} alt="" loading="lazy" />
                        <div className="nv-community-img-overlay" />
                      </div>
                      <div className="nv-community-card-body">
                        <div className="nv-community-user-row">
                          <div className="nv-community-avatar">{name.slice(0, 1).toUpperCase()}</div>
                          <span className="nv-community-username">{name}</span>
                        </div>
                        <p className="nv-community-action-text">
                          {entry.notes ? "Reviewed" : entry.rating ? "Rated" : "Logged"}{" "}
                          <strong>{entry.media_title}</strong>
                        </p>
                        {entry.rating ? (
                          <div className="nv-community-rating">
                            {"★".repeat(entry.rating)}{"☆".repeat(Math.max(0, 5 - entry.rating))}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* VALUE PILLARS */}
        <section className="nv-section nv-pillars-section">
          <div className="nv-section-inner">
            <div className="nv-pillars-grid">
              <div className="nv-pillar-card glass">
                <div className="nv-pillar-icon icon-teal"><Layers size={24} /></div>
                <h3>All 4 Media Worlds in One Place</h3>
                <p>No more fragmenting your tastes across multiple apps. Manage films, anime, TV shows, and video games inside a single elegant dashboard.</p>
              </div>

              <div className="nv-pillar-card glass">
                <div className="nv-pillar-icon icon-purple"><Bookmark size={24} /></div>
                <h3>Chronological Franchise Timelines</h3>
                <p>Never wonder which movie or OVA comes next. NerdVault automatically constructs sequential franchise viewing orders for major sagas.</p>
              </div>

              <div className="nv-pillar-card glass">
                <div className="nv-pillar-icon icon-amber"><Star size={24} /></div>
                <h3>Letterboxd-Grade Logging &amp; Reviews</h3>
                <p>Star ratings, in-depth written reviews, personal rewatch logs, and personalized backlog folders built for real media fans.</p>
              </div>
            </div>
          </div>
        </section>

        {/* STRUCTURED LUXURY FOOTER */}
        <footer className="nv-landing-footer">
          <div className="nv-section-inner nv-footer-inner">
            <div className="nv-footer-main-row">
              <div className="nv-footer-brand-col">
                <div className="nv-footer-brand-lockup">
                  <div className="nv-footer-mini-emblem">
                    <BrandLogo className="nv-footer-logo" />
                  </div>
                  <strong className="nv-footer-brand-name">Nerd<span className="nv-accent-gradient">Vault</span></strong>
                </div>
                <p className="nv-footer-brand-tagline">
                  The unified entertainment logbook for films, TV series, anime, and games.
                </p>
              </div>

              <div className="nv-footer-nav-cols">
                <div className="nv-footer-nav-group">
                  <h4>Catalog</h4>
                  <Link href="/browse?mediaType=movie">Movies</Link>
                  <Link href="/browse?mediaType=show">TV Shows</Link>
                  <Link href="/browse?mediaType=anime">Anime</Link>
                  <Link href="/browse?mediaType=game">Video Games</Link>
                </div>

                <div className="nv-footer-nav-group">
                  <h4>Features</h4>
                  <BrowseResetLink>Browse Discovery</BrowseResetLink>
                  <Link href="/activity">Community Feed</Link>
                  <Link href="/home?tab=media">Custom Backlogs</Link>
                  <Link href="/friends">Friends &amp; Social</Link>
                </div>

                <div className="nv-footer-nav-group">
                  <h4>Account</h4>
                  <Link href="/home">Personal Dashboard</Link>
                  <Link href="/profile">My Profile</Link>
                  <Link href="/home?tab=media">Vault Shelves</Link>
                  <Link href="/sign-in">Sign In</Link>
                  <Link href="/support">Help &amp; FAQ</Link>
                </div>
              </div>
            </div>

            <div className="nv-footer-bottom-bar">
              <p className="nv-footer-copy">© {new Date().getFullYear()} NerdVault. All rights reserved.</p>
              <div className="nv-footer-badge">
                <span>Handcrafted for true media lovers</span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
