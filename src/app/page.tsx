import Image from "next/image";
import Link from "next/link";
import {
  Film, Tv, Gamepad2, Search, Sparkles,
  Star, Users, ArrowRight, Compass, Flame,
  Layers, CheckCircle2, Bookmark,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { BrandLogo } from "@/components/brand-logo";
import { BrowseResetLink } from "@/components/browse-reset-link";
import { getBrowseDiscoverySeed, getBrowseBootstrapCatalog } from "@/lib/browse-bootstrap";
import { browseAniListAnime } from "@/lib/sources/anilist";
import { isFamilyFriendlyMediaItem } from "@/lib/media-safety";
import { MediaItem } from "@/lib/types";
import { optimizeMediaImageUrl } from "@/lib/media-image";
import { ResilientMediaImage } from "@/components/resilient-media-image";
import { LandingMediaRail } from "@/components/landing-media-rail";
import { LandingMarqueeStream } from "@/components/landing-marquee-stream";
import { getPublicCommunityActivity } from "@/lib/vault-server";

export const dynamic = "force-dynamic";

function formatMediaTypeLabel(type: string) {
  if (type === "anime_movie") return "Anime Movie";
  if (type === "anime") return "Anime";
  if (type === "game") return "Game";
  if (type === "show") return "Show";
  return "Movie";
}

export default async function HomePage() {
  const seed = getBrowseDiscoverySeed();

  const [bootstrapResult, session, animeExtra] = await Promise.all([
    getBrowseBootstrapCatalog(seed).catch(() => ({ catalog: [] as MediaItem[], surfacing: [] as MediaItem[] })),
    auth().catch(() => null),
    browseAniListAnime({ page: 2, query: "", genre: "", sort: "rating", seed: seed + 77 }).catch(() => ({
      items: [] as MediaItem[], page: 2, totalPages: 1, totalResults: 0,
    })),
  ]);

  const realActivity = await getPublicCommunityActivity(8).catch(() => []);
  const isSignedIn = Boolean(session?.user?.id);

  const catalog = (bootstrapResult.catalog || []).filter(isFamilyFriendlyMediaItem);

  const movies = catalog.filter((i) => i.type === "movie").slice(0, 16);
  const shows = catalog.filter((i) => i.type === "show").slice(0, 16);
  const games = catalog.filter((i) => i.type === "game").slice(0, 16);
  const animeBase = catalog.filter((i) => i.type === "anime");
  const animeSuppl = (animeExtra.items || [])
    .filter(isFamilyFriendlyMediaItem)
    .filter((i) => !animeBase.some((a) => a.sourceId === i.sourceId));
  const anime = [...animeBase, ...animeSuppl].slice(0, 16);

  // Prepare moving marquee lanes (mixing types for rich variety)
  const marqueeLane1 = [...movies.slice(0, 10), ...anime.slice(0, 10)];
  const marqueeLane2 = [...shows.slice(0, 10), ...games.slice(0, 10)];

  return (
    <div className="nv-landing">
      <SiteHeader />

      <main className="nv-landing-main">
        {/* CENTERPIECE HERO STAGE */}
        <section className="nv-hero-centerpiece">
          <div className="nv-hero-ambient-glow" aria-hidden="true" />

          <div className="nv-hero-centerpiece-content">
            {/* 1. Center 3D Floating Brand Logo Emblem */}
            <div className="nv-hero-logo-stage">
              <div className="nv-hero-3d-ambient" aria-hidden="true" />
              <div className="nv-hero-3d-emblem">
                <div className="nv-3d-sheen" />
                <BrandLogo className="nv-hero-3d-logo-img" priority />
              </div>
            </div>

            {/* 2. Site Name & Description / Tagline */}
            <div className="nv-hero-title-group">
              <span className="nv-hero-pill-badge">
                <Sparkles size={13} />
                <span>Cinema · Shows · Anime · Games</span>
              </span>
              <h1 className="nv-hero-main-title">
                Nerd<span className="nv-accent-gradient">Vault</span>
              </h1>
              <p className="nv-hero-tagline">
                One unified vault for everything you watch &amp; play.
              </p>
              <p className="nv-hero-description">
                The ultimate personal logbook. Rate titles, organize custom backlogs, discover trending media, and follow your friends without algorithmic clutter.
              </p>
            </div>

            {/* 3. Primary Action Buttons */}
            <div className="nv-hero-cta-buttons">
              <Link
                href={isSignedIn ? "/home" : "/sign-in"}
                className="button button-primary nv-hero-cta-primary"
              >
                <span>{isSignedIn ? "Open Your Vault" : "Start Your Vault — Free"}</span>
                <ArrowRight size={17} />
              </Link>
              <BrowseResetLink className="button button-secondary nv-hero-cta-secondary">
                <span>Browse Full Catalog</span>
                <Compass size={17} />
              </BrowseResetLink>
            </div>

            {/* 4. Instant Live Search Bar */}
            <form action="/browse" method="GET" className="nv-hero-search-wrapper glass">
              <input type="hidden" name="focus" value="results" />
              <Search size={18} className="nv-hero-search-icon" aria-hidden="true" />
              <input
                type="search"
                name="query"
                className="nv-hero-search-field"
                placeholder="Search across movies, anime, series, and video games..."
                required
              />
              <button type="submit" className="nv-hero-search-submit">
                Search
              </button>
            </form>

            {/* 5. Fast Category Navigation Pills */}
            <div className="nv-hero-category-pills">
              <Link href="/browse?focus=results&mediaType=movie" className="nv-category-chip chip-movie">
                <Film size={15} />
                <span>Movies</span>
              </Link>
              <Link href="/browse?focus=results&mediaType=show" className="nv-category-chip chip-show">
                <Tv size={15} />
                <span>TV Shows</span>
              </Link>
              <Link href="/browse?focus=results&mediaType=anime" className="nv-category-chip chip-anime">
                <Sparkles size={15} />
                <span>Anime</span>
              </Link>
              <Link href="/browse?focus=results&mediaType=game" className="nv-category-chip chip-game">
                <Gamepad2 size={15} />
                <span>Games</span>
              </Link>
            </div>
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
                <Link href={isSignedIn ? "/activity" : "/sign-in"} className="nv-section-link">
                  {isSignedIn ? "View full activity" : "Join community"} <ArrowRight size={14} />
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
                  <Link href={isSignedIn ? "/vault" : "/sign-in"}>Custom Backlogs</Link>
                  <Link href={isSignedIn ? "/friends" : "/sign-in"}>Friends &amp; Social</Link>
                </div>

                <div className="nv-footer-nav-group">
                  <h4>Account</h4>
                  {isSignedIn ? (
                    <>
                      <Link href="/profile">My Profile</Link>
                      <Link href="/home">Personal Dashboard</Link>
                      <Link href="/vault">Vault Shelves</Link>
                    </>
                  ) : (
                    <>
                      <Link href="/sign-in">Sign In</Link>
                      <Link href="/sign-in?mode=register">Create Account</Link>
                      <Link href="/support">Help &amp; FAQ</Link>
                    </>
                  )}
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
