import Image from "next/image";
import Link from "next/link";
import {
  Film, Tv, Gamepad2, BookOpen, Search, Sparkles,
  Star, Users, FolderHeart, ArrowRight, Bookmark, ChevronRight, Zap,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { BrowseResetLink } from "@/components/browse-reset-link";
import { getBrowseDiscoverySeed, getBrowseBootstrapCatalog } from "@/lib/browse-bootstrap";
import { browseAniListAnime } from "@/lib/sources/anilist";
import { fetchBooksPage } from "@/lib/books";
import { isFamilyFriendlyMediaItem } from "@/lib/media-safety";
import { MediaItem } from "@/lib/types";
import { BookSummary } from "@/lib/book-types";
import { prisma } from "@/lib/prisma";
import { optimizeMediaImageUrl } from "@/lib/media-image";
import { ResilientMediaImage } from "@/components/resilient-media-image";
import { HeroInteractiveShowcase } from "@/components/hero-interactive-showcase";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const seed = getBrowseDiscoverySeed();

  const [bootstrapResult, booksResult, session, animeExtra] = await Promise.all([
    getBrowseBootstrapCatalog(seed).catch(() => ({ catalog: [] as MediaItem[], surfacing: [] as MediaItem[] })),
    fetchBooksPage({ page: 1, query: "" }).catch(() => ({ items: [] as BookSummary[] })),
    auth().catch(() => null),
    // Supplemental anime — page 2 to increase variety
    browseAniListAnime({ page: 2, query: "", genre: "", sort: "rating", seed: seed + 77 }).catch(() => ({
      items: [] as MediaItem[], page: 2, totalPages: 1, totalResults: 0,
    })),
  ]);

  const realActivity = await prisma.watchedItem.findMany({
    take: 18,
    orderBy: { watchedAt: "desc" },
    where: { user: { watchedVisibility: "public" } },
    include: {
      user: { select: { name: true, image: true } },
      media: {
        select: { slug: true, title: true, type: true, coverUrl: true, backdropUrl: true, rating: true, source: true, sourceId: true }
      }
    }
  }).catch(() => []);

  const isSignedIn = Boolean(session?.user?.id);
  const userName   = session?.user?.name || "";

  const catalog = (bootstrapResult.catalog || []).filter(isFamilyFriendlyMediaItem);

  /* ── Media type buckets ──────────────────────────────── */
  const movies = catalog.filter((i) => i.type === "movie");
  const shows  = catalog.filter((i) => i.type === "show");
  const games  = catalog.filter((i) => i.type === "game");
  const books  = booksResult.items || [];

  // Anime: merge bootstrap + supplemental, dedup by sourceId
  const animeBase  = catalog.filter((i) => i.type === "anime");
  const animeSuppl = (animeExtra.items || [])
    .filter(isFamilyFriendlyMediaItem)
    .filter((i) => !animeBase.some((a) => a.sourceId === i.sourceId));
  const anime = [...animeBase, ...animeSuppl].slice(0, 24);

  /* ── Spotlight item ─────────────────────────────────── */
  const currentYear = new Date().getFullYear();
  const spotPool = catalog.filter(
    (i) => i.backdropUrl && i.overview && i.rating > 0 && i.year >= currentYear - 6
  );
  const spotlightItem: MediaItem | null =
    spotPool.length > 0 ? spotPool[Math.floor(Math.random() * spotPool.length)] : catalog[0] ?? null;
  const spotlightBackdrop   = spotlightItem?.backdropUrl || spotlightItem?.coverUrl || null;
  const spotlightRating     = spotlightItem?.rating ? spotlightItem.rating.toFixed(1) : null;
  const spotlightTypeLabel  = spotlightItem?.type === "show" ? "TV Show" : spotlightItem?.type;

  /* ── Hero poster strip — all types mixed ──────────────── */
  const stripItems = catalog
    .filter((i) => i.coverUrl)
    .sort(() => Math.random() - 0.5)
    .slice(0, 16);

  /* ── Search suggestions ──────────────────────────────── */
  const clean = (t: string) => t.split(/[;:]/)[0].trim().slice(0, 26);
  const sugMovie = movies.length ? clean(movies[Math.floor(Math.random() * movies.length)].title) : "Dune";
  const sugAnime = anime.length  ? clean(anime[Math.floor(Math.random() * anime.length)].title)   : "Jujutsu Kaisen";
  const sugGame  = games.length  ? clean(games[Math.floor(Math.random() * games.length)].title)   : "Elden Ring";
  const sugBook  = books.length  ? clean(books[Math.floor(Math.random() * books.length)].title)   : "Frankenstein";

  const topMovie = movies[0];
  const topShow  = shows[0];
  const topAnime = anime[0];
  const topGame  = games[0];
  const heroShowcaseItems = [topMovie, topShow, topAnime, topGame].filter(Boolean);

  return (
    <div className="nv-landing">
      <style dangerouslySetInnerHTML={{ __html: `
        /* Force motion overrides for all marquee rows on NerdVault landing page */
        .nv-landing .nv-strip-track,
        .nv-landing .nv-rail-track,
        .nv-landing .nv-activity-track,
        .nv-landing .nv-orb,
        .nv-landing .nv-logging-pill,
        .nv-landing .nv-logging-pill-dot,
        .performance-mode .nv-landing .nv-strip-track,
        .performance-mode .nv-landing .nv-rail-track,
        .performance-mode .nv-landing .nv-activity-track,
        .performance-mode .nv-landing .nv-orb,
        .performance-mode .nv-landing .nv-logging-pill,
        .performance-mode .nv-landing .nv-logging-pill-dot {
          animation-name: var(--override-name) !important;
          animation-duration: var(--override-duration) !important;
          animation-iteration-count: var(--override-iterations, infinite) !important;
          animation-timing-function: var(--override-timing, linear) !important;
          animation-play-state: running !important;
        }

        .nv-landing .nv-logging-pill,
        .performance-mode .nv-landing .nv-logging-pill {
          animation-direction: alternate !important;
        }

        .nv-landing .nv-strip-track,
        .performance-mode .nv-landing .nv-strip-track {
          --override-name: stripScroll;
          --override-duration: 32s;
          display: flex !important;
          width: max-content !important;
        }
        .nv-landing .nv-rail-track-movie,
        .performance-mode .nv-landing .nv-rail-track-movie {
          --override-name: railScroll;
          --override-duration: 50s;
          display: flex !important;
          width: max-content !important;
        }
        .nv-landing .nv-rail-track-show,
        .performance-mode .nv-landing .nv-rail-track-show {
          --override-name: railScroll;
          --override-duration: 42s;
          display: flex !important;
          width: max-content !important;
        }
        .nv-landing .nv-rail-track-anime,
        .performance-mode .nv-landing .nv-rail-track-anime {
          --override-name: railScroll;
          --override-duration: 46s;
          display: flex !important;
          width: max-content !important;
        }
        .nv-landing .nv-rail-track-game,
        .performance-mode .nv-landing .nv-rail-track-game {
          --override-name: railScroll;
          --override-duration: 38s;
          display: flex !important;
          width: max-content !important;
        }
        .nv-landing .nv-rail-track-book,
        .performance-mode .nv-landing .nv-rail-track-book {
          --override-name: railScroll;
          --override-duration: 54s;
          display: flex !important;
          width: max-content !important;
        }
        .nv-landing .nv-activity-track,
        .performance-mode .nv-landing .nv-activity-track {
          --override-name: activityTicker;
          --override-duration: 55s;
          display: flex !important;
          width: max-content !important;
        }
        .nv-landing .nv-orb,
        .performance-mode .nv-landing .nv-orb {
          --override-name: orbPulse;
          --override-duration: 14s;
          --override-timing: ease-in-out;
        }
        .nv-landing .nv-logging-pill,
        .performance-mode .nv-landing .nv-logging-pill {
          --override-name: pillBob;
          --override-duration: 4s;
          --override-timing: ease-in-out;
        }
        .nv-landing .nv-logging-pill-dot,
        .performance-mode .nv-landing .nv-logging-pill-dot {
          --override-name: dotBlink;
          --override-duration: 2s;
          --override-timing: ease-in-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .nv-landing .nv-strip-track,
          .nv-landing .nv-rail-track,
          .nv-landing .nv-activity-track,
          .nv-landing .nv-orb,
          .nv-landing .nv-logging-pill,
          .nv-landing .nv-logging-pill-dot,
          .performance-mode .nv-landing .nv-strip-track,
          .performance-mode .nv-landing .nv-rail-track,
          .performance-mode .nv-landing .nv-activity-track,
          .performance-mode .nv-landing .nv-orb,
          .performance-mode .nv-landing .nv-logging-pill,
          .performance-mode .nv-landing .nv-logging-pill-dot {
            animation-name: var(--override-name) !important;
            animation-duration: var(--override-duration) !important;
            animation-iteration-count: var(--override-iterations, infinite) !important;
            animation-timing-function: var(--override-timing, linear) !important;
            animation-play-state: running !important;
          }
        }

        /* Prevent the hero section from capturing vertical scroll */
        .nv-landing .nv-hero {
          overflow: visible !important;
        }
      ` }} />

      {/* Ambient orbs */}
      <div className="nv-orb-canvas" aria-hidden>
        <div className="nv-orb nv-orb-1" />
        <div className="nv-orb nv-orb-2" />
        <div className="nv-orb nv-orb-3" />
      </div>

      <SiteHeader />

      <main>
        {/* ══ §1 HERO ════════════════════════════════════════ */}
        <section className="nv-hero nv-hero-split" aria-label="Introduction to NerdVault" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 4%', gap: '60px', minHeight: '80vh', flexWrap: 'wrap' }}>

          {/* Left Column: Text & CTAs */}
          <div className="nv-hero-content" style={{ flex: '1 1 400px', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div className="nv-logging-pill" style={{ margin: '0 0 24px 0' }}>
              <span className="nv-logging-pill-dot" />
              A media logging &amp; tracking platform — not a streaming service
            </div>

            <div className="nv-hero-eyebrow" style={{ justifyContent: 'flex-start', marginBottom: '16px' }}>
              Track Everything You Love
              <span className="nv-hero-eyebrow-line" style={{ width: '30px' }} />
            </div>

            <h1 className="nv-hero-headline" style={{ textAlign: 'left', fontSize: 'clamp(2.8rem, 6vw, 4.5rem)', lineHeight: '1.05', margin: '0 0 24px 0' }}>
              Your ultimate<br />
              <span className="grad-text">entertainment</span><br />
              platform.
            </h1>

            <p className="nv-hero-sub" style={{ textAlign: 'left', margin: '0 0 32px 0', fontSize: '1.1rem', color: 'var(--text-sec)' }}>
              Log movies, TV shows, anime, games &amp; books. Build custom folders, discover new media, and share what you love — all in one beautifully crafted space.
            </p>

            <div className="nv-hero-search" style={{ margin: '0 0 32px 0', width: '100%' }}>
              <form action="/browse" method="GET" className="nv-search-form" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <input type="hidden" name="focus" value="results" />
                <input
                  type="search" name="query"
                  className="nv-search-input"
                  placeholder="Search movies, anime, games, books..."
                  required
                />
                <button type="submit" className="nv-search-submit">
                  <Search size={14} /> Search
                </button>
              </form>
              <div className="nv-search-chips" style={{ justifyContent: 'flex-start' }}>
                <span>Try:</span>
                <Link href={`/browse?focus=results&query=${encodeURIComponent(sugMovie)}`} className="nv-chip">{sugMovie}</Link>
                <Link href={`/browse?focus=results&query=${encodeURIComponent(sugAnime)}`} className="nv-chip">{sugAnime}</Link>
                <Link href={`/browse?focus=results&query=${encodeURIComponent(sugGame)}`}  className="nv-chip">{sugGame}</Link>
                <Link href={`/books?query=${encodeURIComponent(sugBook)}`}                 className="nv-chip">{sugBook}</Link>
              </div>
            </div>

            <div className="nv-hero-cta" style={{ justifyContent: 'flex-start' }}>
              {isSignedIn ? (
                <>
                  <BrowseResetLink className="nv-btn nv-btn-primary">
                    <Search size={14} /> Browse Catalog
                  </BrowseResetLink>
                  <Link href="/home" className="nv-btn nv-btn-secondary">
                    <Zap size={14} /> Open My Vault
                  </Link>
                </>
              ) : (
                <>
                  <BrowseResetLink className="nv-btn nv-btn-primary">
                    <Search size={14} /> Browse Catalog
                  </BrowseResetLink>
                  <Link href="/sign-in" className="nv-btn nv-btn-secondary">
                    Sign In / Register
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right Column: 4 Simple Static Cards */}
          <div className="nv-hero-art-wrapper" style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', marginTop: '30px', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Trending Now
            </h2>
            <div className="nv-hero-art" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              {heroShowcaseItems.map((item, i) => (
                <PosterCard key={`hero-card-${item.id}-${i}`} item={item} isHero={true} />
              ))}
            </div>
          </div>

        </section>

        {/* ══ §2 MEDIA TYPE SHORTCUTS ════════════════════════ */}
        <section className="nv-types" aria-label="Browse by media type">
          <div className="nv-types-grid">
            <Link href="/browse?focus=results&mediaType=movie" className="nv-type-card nv-type-movie">
              <div className="nv-type-icon"><Film size={18} /></div>
              <h3 className="nv-type-label">Movies</h3>
              <p className="nv-type-hint">Rate, review &amp; log films</p>
              <div className="nv-type-arrow"><ChevronRight size={14} /></div>
            </Link>
            <Link href="/browse?focus=results&mediaType=show" className="nv-type-card nv-type-show">
              <div className="nv-type-icon"><Tv size={18} /></div>
              <h3 className="nv-type-label">TV Shows</h3>
              <p className="nv-type-hint">Track seasons &amp; episodes</p>
              <div className="nv-type-arrow"><ChevronRight size={14} /></div>
            </Link>
            <Link href="/browse?focus=results&mediaType=anime" className="nv-type-card nv-type-anime">
              <div className="nv-type-icon"><Sparkles size={18} /></div>
              <h3 className="nv-type-label">Anime</h3>
              <p className="nv-type-hint">Sub &amp; dub, seasonal &amp; classic</p>
              <div className="nv-type-arrow"><ChevronRight size={14} /></div>
            </Link>
            <Link href="/browse?focus=results&mediaType=game" className="nv-type-card nv-type-game">
              <div className="nv-type-icon"><Gamepad2 size={18} /></div>
              <h3 className="nv-type-label">Video Games</h3>
              <p className="nv-type-hint">Manage your backlog</p>
              <div className="nv-type-arrow"><ChevronRight size={14} /></div>
            </Link>
            <Link href="/books" className="nv-type-card nv-type-book">
              <div className="nv-type-icon"><BookOpen size={18} /></div>
              <h3 className="nv-type-label">Books</h3>
              <p className="nv-type-hint">Classic literature, free in-app</p>
              <div className="nv-type-arrow"><ChevronRight size={14} /></div>
            </Link>
          </div>
        </section>

        {/* ══ §3 MEDIA RAILS — auto-scrolling tickers ════════ */}
        <section className="nv-rails" aria-label="Trending media">

          {movies.length > 0 && (
            <div className="nv-rail">
              <div className="nv-rail-header">
                <div className="nv-rail-title-group">
                  <h2 className="nv-rail-label">
                    <span className="nv-rail-label-icon"><Film size={18} color="#fb7185" /></span>
                    Trending Movies
                  </h2>
                  <p className="nv-rail-sub">Log, rate &amp; build your film archive</p>
                </div>
                <Link href="/browse?mediaType=movie" className="nv-rail-more">All Movies <ArrowRight size={13} /></Link>
              </div>
              <div className="nv-rail-scroll">
                {/* Duplicated items for seamless CSS animation loop */}
                <div className="nv-rail-track nv-rail-track-movie">
                  {[...movies, ...movies].map((item, i) => (
                    <PosterCard key={`m-${item.id}-${i}`} item={item} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {shows.length > 0 && (
            <div className="nv-rail">
              <div className="nv-rail-header">
                <div className="nv-rail-title-group">
                  <h2 className="nv-rail-label">
                    <span className="nv-rail-label-icon"><Tv size={18} color="#fbbf24" /></span>
                    Trending TV Shows
                  </h2>
                  <p className="nv-rail-sub">Track seasons, episodes &amp; airing status</p>
                </div>
                <Link href="/browse?mediaType=show" className="nv-rail-more">All Shows <ArrowRight size={13} /></Link>
              </div>
              <div className="nv-rail-scroll">
                <div className="nv-rail-track nv-rail-track-show">
                  {[...shows, ...shows].map((item, i) => (
                    <PosterCard key={`s-${item.id}-${i}`} item={item} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {anime.length > 0 && (
            <div className="nv-rail">
              <div className="nv-rail-header">
                <div className="nv-rail-title-group">
                  <h2 className="nv-rail-label">
                    <span className="nv-rail-label-icon"><Sparkles size={18} color="#69C5AC" /></span>
                    Trending Anime
                  </h2>
                  <p className="nv-rail-sub">Classics to currently airing seasonal series</p>
                </div>
                <Link href="/browse?mediaType=anime" className="nv-rail-more">All Anime <ArrowRight size={13} /></Link>
              </div>
              <div className="nv-rail-scroll">
                <div className="nv-rail-track nv-rail-track-anime">
                  {[...anime, ...anime].map((item, i) => (
                    <PosterCard key={`a-${item.id}-${i}`} item={item} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {games.length > 0 && (
            <div className="nv-rail">
              <div className="nv-rail-header">
                <div className="nv-rail-title-group">
                  <h2 className="nv-rail-label">
                    <span className="nv-rail-label-icon"><Gamepad2 size={18} color="#60a5fa" /></span>
                    Trending Video Games
                  </h2>
                  <p className="nv-rail-sub">Manage your backlog &amp; platform library</p>
                </div>
                <Link href="/browse?mediaType=game" className="nv-rail-more">All Games <ArrowRight size={13} /></Link>
              </div>
              <div className="nv-rail-scroll">
                <div className="nv-rail-track nv-rail-track-game">
                  {[...games, ...games].map((item, i) => (
                    <PosterCard key={`g-${item.id}-${i}`} item={item} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {books.length > 0 && (
            <div className="nv-rail">
              <div className="nv-rail-header">
                <div className="nv-rail-title-group">
                  <h2 className="nv-rail-label">
                    <span className="nv-rail-label-icon"><BookOpen size={18} color="#1EBDC2" /></span>
                    Classic Reading Room
                  </h2>
                  <p className="nv-rail-sub">Project Gutenberg — free classics, read in-app</p>
                </div>
                <Link href="/books" className="nv-rail-more">Open Library <ArrowRight size={13} /></Link>
              </div>
              <div className="nv-rail-scroll">
                <div className="nv-rail-track nv-rail-track-book">
                  {[...books, ...books].map((book, i) => (
                    <BookPosterCard key={`b-${book.id}-${i}`} book={book} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ══ §4 COMMUNITY ACTIVITY TICKER ═══════════════════ */}
        {realActivity.length > 0 && (
          <section className="nv-activity" aria-label="Community activity">
            <div className="nv-activity-header">
              <div className="nv-rail-title-group">
                <h2 className="nv-rail-label">
                  <span className="nv-rail-label-icon"><Users size={18} color="#1EBDC2" /></span>
                  Community Pulse
                </h2>
                <p className="nv-rail-sub">What NerdVault members are logging right now</p>
              </div>
              <Link href={isSignedIn ? "/activity" : "/sign-in"} className="nv-rail-more">
                {isSignedIn ? "See Friend Activity" : "Join & Connect"} <ArrowRight size={13} />
              </Link>
            </div>

            <div className="nv-activity-ticker">
              <div className="nv-activity-track">
                {[...realActivity, ...realActivity].map((entry, i) => {
                  const name = entry.user.name || "Vault Member";
                  const avatarInitial = name.charAt(0).toUpperCase();
                  const avatarColor = ["#7c3aed", "#0891b2", "#b91c1c", "#15803d", "#b45309", "#6d28d9", "#be185d", "#0f766e", "#1d4ed8", "#4338ca", "#065f46"][(name.charCodeAt(0) || 0) % 11];
                  const actionText = entry.rating ? `logged · ★ ${entry.rating.toFixed(1)}` : "logged";
                  const imageUrl = optimizeMediaImageUrl(entry.media.backdropUrl || entry.media.coverUrl || "/fallback-poster.jpg", "cover");
                  
                  return (
                    <Link key={`act-${entry.userId}-${entry.mediaId}-${i}`} href={`/media/${entry.media.slug}?source=${entry.media.source}&sourceId=${entry.media.sourceId}&type=${entry.media.type}`} className="nv-act-card">
                      <div className="nv-act-cover">
                        <img
                          src={imageUrl}
                          alt={entry.media.title}
                          loading="lazy"
                        />
                      </div>
                      <div className="nv-act-body">
                        <div className="nv-act-user">
                          <div className="nv-act-avatar" style={{ background: avatarColor, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {entry.user.image ? (
                              <img src={entry.user.image} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }} />
                            ) : (
                              avatarInitial
                            )}
                          </div>
                          <span className="nv-act-name">{name}</span>
                        </div>
                        <span className="nv-act-action">{actionText}</span>
                        <p className="nv-act-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.media.title}
                        </p>
                      </div>
                    </Link>
                  );
                })}
                {/* Join CTA at end */}
                <Link href={isSignedIn ? "/activity" : "/sign-in"} className="nv-act-cta">
                  <div className="nv-act-cta-icon"><Users size={18} /></div>
                  <p className="nv-act-cta-title">
                    {isSignedIn ? "View friend activity" : "Join to track with friends"}
                  </p>
                  <span className="nv-act-cta-sub">
                    {isSignedIn
                      ? "See your full activity feed"
                      : "Connect, share what you're watching & build lists together"}
                  </span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ══ §5 BENTO FEATURE GRID ══════════════════════════ */}
        <section className="nv-bento" aria-label="NerdVault features">
          <div className="nv-bento-header">
            <p className="nv-bento-eyebrow">Why NerdVault?</p>
            <h2 className="nv-bento-title">Five platforms.<br />One beautiful vault.</h2>
            <p className="nv-bento-sub">
              Stop switching between Letterboxd, Backloggd, AniList, Goodreads, and Serializd. NerdVault is your single unified space for every form of entertainment.
            </p>
          </div>

          <div className="nv-bento-grid">
            <div className="nv-bento-cell nv-bento-a">
              <div className="nv-bento-cell-icon"><Star size={20} /></div>
              <h3 className="nv-bento-cell-title">All Media Types</h3>
              <p className="nv-bento-cell-desc">One platform replaces five niche trackers. Movies, shows, anime, games &amp; books — finally together.</p>
              <div className="nv-site-comparison">
                <div className="nv-comparison-row"><span className="nv-comparison-row-label">🎬 Letterboxd</span><span className="nv-comparison-row-val">Movies only</span></div>
                <div className="nv-comparison-row"><span className="nv-comparison-row-label">🎮 Backloggd</span><span className="nv-comparison-row-val">Games only</span></div>
                <div className="nv-comparison-row"><span className="nv-comparison-row-label">✨ AniList</span><span className="nv-comparison-row-val">Anime only</span></div>
                <div className="nv-comparison-row"><span className="nv-comparison-row-label">📺 Serializd</span><span className="nv-comparison-row-val">TV only</span></div>
                <div className="nv-comparison-row nv-vault-row"><span className="nv-comparison-row-label">⚡ NerdVault</span><span className="nv-comparison-row-val">Everything ✓</span></div>
              </div>
            </div>

            <div className="nv-bento-cell nv-bento-b">
              <div className="nv-bento-cell-icon" style={{ background: "rgba(30,189,194,0.1)", borderColor: "rgba(30,189,194,0.2)", color: "#1EBDC2" }}><FolderHeart size={20} /></div>
              <h3 className="nv-bento-cell-title">Smart Folders</h3>
              <p className="nv-bento-cell-desc">Cross-media playlists. Create "Sci-Fi Faves" with films, games &amp; anime side by side.</p>
              <div className="nv-bento-tags"><span className="nv-bento-tag">Custom Lists</span><span className="nv-bento-tag">Cross-Media</span><span className="nv-bento-tag">Private</span></div>
            </div>

            <div className="nv-bento-cell nv-bento-c" style={{ justifyContent: "center" }}>
              <div className="nv-stat-row">
                <div className="nv-stat-number">5+</div>
                <div className="nv-stat-label">Media categories in one vault</div>
              </div>
            </div>

            <div className="nv-bento-cell nv-bento-d">
              <div className="nv-bento-cell-icon" style={{ background: "rgba(251,191,36,0.1)", borderColor: "rgba(251,191,36,0.2)", color: "#fbbf24" }}><Star size={20} /></div>
              <h3 className="nv-bento-cell-title">Rate &amp; Review</h3>
              <p className="nv-bento-cell-desc">Star ratings, rich reviews, and watch-status labels for every item in your vault.</p>
              <div className="nv-bento-tags"><span className="nv-bento-tag">Star Ratings</span><span className="nv-bento-tag">Reviews</span></div>
            </div>

            <div className="nv-bento-cell nv-bento-e">
              <div className="nv-bento-cell-icon" style={{ background: "rgba(251,113,133,0.1)", borderColor: "rgba(251,113,133,0.2)", color: "#fb7185" }}><Users size={20} /></div>
              <h3 className="nv-bento-cell-title">Social Activity</h3>
              <p className="nv-bento-cell-desc">Follow friends, see what they're watching &amp; share discoveries.</p>
              <div className="nv-bento-tags"><span className="nv-bento-tag">Friends</span><span className="nv-bento-tag">Activity Feed</span></div>
            </div>

            <div className="nv-bento-cell nv-bento-f">
              <div className="nv-bento-cell-icon"><Sparkles size={20} /></div>
              <h3 className="nv-bento-cell-title">Smart Discovery</h3>
              <p className="nv-bento-cell-desc">Browse trending, top-rated, and curated catalogs updated daily from TMDB, AniList, IGDB &amp; Gutenberg.</p>
              <div className="nv-bento-tags"><span className="nv-bento-tag">TMDB</span><span className="nv-bento-tag">AniList</span><span className="nv-bento-tag">IGDB</span><span className="nv-bento-tag">Gutenberg</span></div>
            </div>

            <div className="nv-bento-cell nv-bento-g">
              <div className="nv-bento-cell-icon" style={{ background: "rgba(99,179,237,0.1)", borderColor: "rgba(99,179,237,0.2)", color: "#60a5fa" }}><Bookmark size={20} /></div>
              <h3 className="nv-bento-cell-title">Backlog &amp; Wishlist Management</h3>
              <p className="nv-bento-cell-desc">Move items from wishlist → watching/playing → completed. Filter by platform, season, or status. Your entire media life, organized.</p>
              <div className="nv-bento-tags"><span className="nv-bento-tag">Watching</span><span className="nv-bento-tag">Completed</span><span className="nv-bento-tag">Wishlist</span><span className="nv-bento-tag">Dropped</span><span className="nv-bento-tag">On Hold</span></div>
            </div>
          </div>
        </section>

        {/* ══ §6 FINAL CTA ═══════════════════════════════════ */}
        <section className="nv-cta" aria-label="Get started">
          <div className="nv-cta-inner">
            <div className="nv-cta-glow-bg" />
            <div className="nv-cta-label"><Zap size={11} /> Free to Join</div>
            <h2 className="nv-cta-title">Build your vault<br /><span className="grad-text">starting today.</span></h2>
            <p className="nv-cta-sub">
              {isSignedIn
                ? `Welcome back, ${userName}! Pick up where you left off or discover something new.`
                : "Join NerdVault for free. Log every movie, show, anime, game & book you love in one beautifully designed space."}
            </p>
            <div className="nv-cta-actions">
              {isSignedIn ? (
                <>
                  <Link href="/home" className="nv-btn nv-btn-primary">Open My Vault</Link>
                  <BrowseResetLink className="nv-btn nv-btn-secondary">Browse Catalog</BrowseResetLink>
                </>
              ) : (
                <>
                  <Link href="/sign-in" className="nv-btn nv-btn-primary">Create Free Account</Link>
                  <BrowseResetLink className="nv-btn nv-btn-secondary">Explore First</BrowseResetLink>
                </>
              )}
            </div>
            <div className="nv-cta-notes">
              <span>No credit card needed</span>
              <span>Works on any device</span>
              <span>Connect with friends</span>
            </div>
          </div>
        </section>

        {/* ══ FOOTER ═════════════════════════════════════════ */}
        <footer className="nv-footer">
          <div className="nv-footer-inner">
            <div className="nv-footer-brand">
              <Image src="/brand/logo-mark-clean.svg" alt="NerdVault logo" width={22} height={22} />
              <span className="nv-footer-brand-name">NerdVault</span>
            </div>
            <nav className="nv-footer-links">
              <BrowseResetLink className="nv-footer-link">Browse</BrowseResetLink>
              <Link href="/books"   className="nv-footer-link">Books</Link>
              <Link href="/support" className="nv-footer-link">Support</Link>
              {isSignedIn
                ? <Link href="/home"    className="nv-footer-link">My Vault</Link>
                : <Link href="/sign-in" className="nv-footer-link">Sign In</Link>}
            </nav>
            <p className="nv-footer-copy">
              © {new Date().getFullYear()} NerdVault · Built for enthusiasts. Not a streaming platform.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════════ */

function PosterCard({ item, isHero = false }: { item: MediaItem; isHero?: boolean }) {
  const rating = item.rating ? item.rating.toFixed(1) : null;
  const typeLabel = item.type === "show" ? "TV" : item.type;
  return (
    <Link href={`/media/${item.slug}?source=${item.source}&sourceId=${item.sourceId}&type=${item.type}`} className="nv-poster-card" prefetch={true}>
      <div className="nv-poster-frame">
        {rating && <span className="nv-poster-rating">★ {rating}</span>}
        <span className="nv-poster-type">{typeLabel}</span>
        <img 
          src={optimizeMediaImageUrl(item.coverUrl, "cover") || "/fallback-poster.jpg"} 
          alt={item.title} 
          loading={isHero ? "eager" : "lazy"} 
          {...(isHero ? { fetchPriority: "high" } : {})}
        />
        <div className="nv-poster-overlay"><span className="nv-poster-view">View Details →</span></div>
      </div>
      <h3 className="nv-poster-title">{item.title}</h3>
      {item.year && <span className="nv-poster-year">{item.year}</span>}
    </Link>
  );
}

function BookPosterCard({ book }: { book: BookSummary }) {
  const author = book.authors[0] || "Unknown Author";
  return (
    <Link href={`/books/${book.id}`} className="nv-poster-card">
      <div className="nv-poster-frame">
        <span className="nv-poster-type">Book</span>
        <ResilientMediaImage
          item={{
            type: "book",
            title: book.title,
            coverUrl: book.coverUrl,
            backdropUrl: undefined,
          } as any}
          displayIntent="thumb"
          upgradeIntent="thumb"
          loading="lazy"
        />
        <div className="nv-poster-overlay"><span className="nv-poster-view">Read Now →</span></div>
      </div>
      <h3 className="nv-poster-title">{book.title}</h3>
      <span className="nv-poster-year" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: "100%" }}>{author}</span>
    </Link>
  );
}
