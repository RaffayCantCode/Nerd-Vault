import Image from "next/image";
import Link from "next/link";
import { 
  Film, 
  Tv, 
  Gamepad2, 
  BookOpen, 
  Search, 
  Sparkles, 
  Star, 
  Play, 
  Users, 
  FolderHeart, 
  ArrowRight, 
  LogIn, 
  Laptop,
  Info
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { BrowseResetLink } from "@/components/browse-reset-link";
import { getBrowseDiscoverySeed, getBrowseBootstrapCatalog } from "@/lib/browse-bootstrap";
import { fetchBooksPage } from "@/lib/books";
import { isFamilyFriendlyMediaItem } from "@/lib/media-safety";
import { MediaItem } from "@/lib/types";
import { BookSummary } from "@/lib/book-types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const seed = getBrowseDiscoverySeed();
  
  // Concurrently fetch bootstrap catalog (movies, shows, anime, games) and Gutenberg books
  const [bootstrapResult, booksResult, session] = await Promise.all([
    getBrowseBootstrapCatalog(seed).catch((e) => {
      console.error("Failed to fetch bootstrap catalog:", e);
      return { catalog: [] as MediaItem[], surfacing: [] as MediaItem[] };
    }),
    fetchBooksPage({ page: 1, query: "" }).catch((e) => {
      console.error("Failed to fetch books:", e);
      return { items: [] as BookSummary[] };
    }),
    auth().catch(() => null),
  ]);

  const isSignedIn = Boolean(session?.user?.id);
  const userName = session?.user?.name || "";
  
  // Exclude non-family-friendly titles from the home page
  const catalog = (bootstrapResult.catalog || []).filter(isFamilyFriendlyMediaItem);
  
  // Categorize media items
  const movies = catalog.filter((item) => item.type === "movie");
  const shows = catalog.filter((item) => item.type === "show");
  const anime = catalog.filter((item) => item.type === "anime");
  const games = catalog.filter((item) => item.type === "game");
  const books = booksResult.items || [];

  // 1. SELECT AN IMPRESSIVE TRENDING SPOTLIGHT HERO ITEM
  // Prioritize modern/recent media (last 6 years) to show trending content rather than retro classics
  const currentYear = new Date().getFullYear();
  const trendingYearThreshold = currentYear - 6; // 2020

  let spotlightCandidates = catalog.filter(
    (item) => item.backdropUrl && item.overview && item.rating > 0 && item.year >= trendingYearThreshold
  );

  // Fall back to any visual items if no recent ones are available
  if (spotlightCandidates.length === 0) {
    spotlightCandidates = catalog.filter(
      (item) => item.backdropUrl && item.overview && item.rating > 0
    );
  }
  
  const spotlightItem: MediaItem | null = spotlightCandidates.length > 0
    ? spotlightCandidates[Math.floor(Math.random() * spotlightCandidates.length)]
    : catalog.length > 0 ? catalog[Math.floor(Math.random() * catalog.length)] : null;

  const spotlightBackdrop = spotlightItem?.backdropUrl || spotlightItem?.coverUrl || "/brand/hero-bg.jpg";
  const spotlightRating = spotlightItem?.rating ? spotlightItem.rating.toFixed(1) : null;
  const spotlightGenres = spotlightItem?.genres?.slice(0, 3) || [];
  const spotlightTypeLabel = spotlightItem?.type === "show" ? "TV Show" : spotlightItem?.type;

  // Helper to extract a clean, short suggestion title
  const cleanSuggestion = (title: string) => {
    if (!title) return "";
    return title.split(/[;:]/)[0].trim().slice(0, 30);
  };

  const suggestedMovie = movies.length > 0 ? cleanSuggestion(movies[Math.floor(Math.random() * movies.length)].title) : "Dune";
  const suggestedShow = shows.length > 0 ? cleanSuggestion(shows[Math.floor(Math.random() * shows.length)].title) : "Breaking Bad";
  const suggestedAnime = anime.length > 0 ? cleanSuggestion(anime[Math.floor(Math.random() * anime.length)].title) : "Spirited Away";
  const suggestedGame = games.length > 0 ? cleanSuggestion(games[Math.floor(Math.random() * games.length)].title) : "Elden Ring";
  const suggestedBook = books.length > 0 ? cleanSuggestion(books[Math.floor(Math.random() * books.length)].title) : "Frankenstein";

  return (
    <div className="landing-rehaul">
      {/* Site Header */}
      <SiteHeader />

      <main>
        {/* 1. SPOTLIGHT HERO SECTION */}
        <section className="landing-rehaul-hero">
          <div className="landing-rehaul-hero-backdrop">
            <img 
              src={spotlightBackdrop} 
              alt="Hero Backdrop" 
              className="landing-rehaul-hero-img" 
            />
            <div className="landing-rehaul-hero-gradient" />
          </div>

          <div className="landing-rehaul-hero-content">
            <div className="hero-disclaimer-tip">
              <Info size={16} className="disclaimer-icon" />
              <span>
                <strong>NerdVault is a catalog diary & logging site</strong> — a place to track and review what you watch or play. We do not offer streaming or video play services.
              </span>
            </div>

            {spotlightItem ? (
              <>
                <div className="spotlight-badge">
                  Spotlight {spotlightTypeLabel}
                </div>
                
                <h1 className="landing-rehaul-hero-title">
                  {spotlightItem.title}
                </h1>

                <div className="landing-rehaul-hero-meta">
                  {spotlightRating && (
                    <span className="meta-rating">
                      <Star size={16} fill="currentColor" /> {spotlightRating}
                    </span>
                  )}
                  {spotlightItem.year && (
                    <span className="meta-year">{spotlightItem.year}</span>
                  )}
                  {spotlightGenres.length > 0 && (
                    <div className="meta-genres">
                      {spotlightGenres.map((genre, idx) => (
                        <span key={genre} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          {idx > 0 && <span className="genre-dot" />}
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className="landing-rehaul-hero-desc">
                  {spotlightItem.overview}
                </p>

                <div className="landing-rehaul-hero-actions">
                  <Link 
                    href={`/media/${spotlightItem.slug}`} 
                    className="rehaul-btn rehaul-btn-primary"
                  >
                    <Play size={18} fill="currentColor" /> View Details
                  </Link>
                  {spotlightItem.details?.trailerUrl && (
                    <Link 
                      href={`/media/${spotlightItem.slug}?autoplay=true`}
                      className="rehaul-btn rehaul-btn-secondary"
                    >
                      Watch Trailer
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <h1 className="landing-rehaul-hero-title">
                  Your Universe of <span>Entertainment</span>
                </h1>
                <p className="landing-rehaul-hero-desc" style={{ color: '#8a94ad' }}>
                  The ultimate hub for tracking, discovering, and logging everything you love. Movies, TV shows, anime, games, and books - all in one unified, beautifully designed vault.
                </p>
              </>
            )}

            {/* Quick Search Box */}
            <div className="landing-rehaul-search-box">
              <form action="/browse" method="GET" className="rehaul-search-form">
                <input type="hidden" name="focus" value="results" />
                <input 
                  type="search" 
                  name="query" 
                  className="rehaul-search-input"
                  placeholder="Search movies, anime, games, shows..." 
                  required
                />
                <button type="submit" className="rehaul-search-btn">
                  <Search size={18} /> Search
                </button>
              </form>
              
              <div className="rehaul-search-suggestions">
                <span>Try:</span>
                <Link href={`/browse?focus=results&query=${encodeURIComponent(suggestedMovie)}`} className="suggestion-link">{suggestedMovie}</Link>
                <Link href={`/browse?focus=results&query=${encodeURIComponent(suggestedGame)}`} className="suggestion-link">{suggestedGame}</Link>
                <Link href={`/browse?focus=results&query=${encodeURIComponent(suggestedAnime)}`} className="suggestion-link">{suggestedAnime}</Link>
                <Link href={`/books?query=${encodeURIComponent(suggestedBook)}`} className="suggestion-link">{suggestedBook}</Link>
              </div>
            </div>
          </div>
        </section>

        {/* 2. DYNAMIC QUICK SHORTCUTS GRID */}
        <section className="landing-rehaul-shortcuts">
          <div className="shortcuts-grid">
            <Link href="/browse?focus=results&mediaType=movie" className="shortcut-card movie-card">
              <div className="shortcut-icon-shell">
                <Film size={20} />
              </div>
              <div className="shortcut-text">
                <h4 className="shortcut-title">Movies</h4>
                <span className="shortcut-desc">Log ratings & review films</span>
              </div>
            </Link>

            <Link href="/browse?focus=results&mediaType=show" className="shortcut-card show-card">
              <div className="shortcut-icon-shell">
                <Tv size={20} />
              </div>
              <div className="shortcut-text">
                <h4 className="shortcut-title">TV Shows</h4>
                <span className="shortcut-desc">Track season progress & episodes</span>
              </div>
            </Link>

            <Link href="/browse?focus=results&mediaType=anime" className="shortcut-card anime-card">
              <div className="shortcut-icon-shell">
                <Sparkles size={20} />
              </div>
              <div className="shortcut-text">
                <h4 className="shortcut-title">Anime</h4>
                <span className="shortcut-desc">Follow sub/dub airing seasons</span>
              </div>
            </Link>

            <Link href="/browse?focus=results&mediaType=game" className="shortcut-card game-card">
              <div className="shortcut-icon-shell">
                <Gamepad2 size={20} />
              </div>
              <div className="shortcut-text">
                <h4 className="shortcut-title">Video Games</h4>
                <span className="shortcut-desc">Manage backlogs & systems</span>
              </div>
            </Link>

            <Link href="/books" className="shortcut-card book-card">
              <div className="shortcut-icon-shell">
                <BookOpen size={20} />
              </div>
              <div className="shortcut-text">
                <h4 className="shortcut-title">Books</h4>
                <span className="shortcut-desc">Read classic literature free</span>
              </div>
            </Link>
          </div>
        </section>

        {/* 3. DYNAMIC MEDIA TRACKS / HORIZONTAL SCROLL CAROUSELS */}
        <section className="landing-rehaul-sections">
          
          {/* TRACK 1: TRENDING MOVIES */}
          {movies.length > 0 && (
            <div className="media-section">
              <div className="media-section-header">
                <div className="media-section-title-group">
                  <h2 className="media-section-title">
                    <Film size={22} className="text-accent" /> Trending Movies
                  </h2>
                  <p className="media-section-subtitle">
                    Log and review what you watch. Add top movies to your custom folders.
                  </p>
                </div>
                <Link href="/browse?mediaType=movie" className="media-section-view-all">
                  Browse Movies <ArrowRight size={16} />
                </Link>
              </div>

              <div className="media-rail-viewport">
                <div className="media-rail-track">
                  {movies.map((item) => (
                    <MediaCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TRACK 2: POPULAR TV SHOWS */}
          {shows.length > 0 && (
            <div className="media-section">
              <div className="media-section-header">
                <div className="media-section-title-group">
                  <h2 className="media-section-title">
                    <Tv size={22} className="text-accent" /> Popular TV Shows
                  </h2>
                  <p className="media-section-subtitle">
                    Track airing statuses, seasonal episode progress, and never lose your spot.
                  </p>
                </div>
                <Link href="/browse?mediaType=show" className="media-section-view-all">
                  Browse Shows <ArrowRight size={16} />
                </Link>
              </div>

              <div className="media-rail-viewport">
                <div className="media-rail-track">
                  {shows.map((item) => (
                    <MediaCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TRACK 3: TRENDING ANIME */}
          {anime.length > 0 && (
            <div className="media-section">
              <div className="media-section-header">
                <div className="media-section-title-group">
                  <h2 className="media-section-title">
                    <Sparkles size={22} className="text-accent" /> Top Anime
                  </h2>
                  <p className="media-section-subtitle">
                    From classics to currently airing seasonal series, log your favorites.
                  </p>
                </div>
                <Link href="/browse?mediaType=anime" className="media-section-view-all">
                  Browse Anime <ArrowRight size={16} />
                </Link>
              </div>

              <div className="media-rail-viewport">
                <div className="media-rail-track">
                  {anime.map((item) => (
                    <MediaCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TRACK 4: FEATURED VIDEO GAMES */}
          {games.length > 0 && (
            <div className="media-section">
              <div className="media-section-header">
                <div className="media-section-title-group">
                  <h2 className="media-section-title">
                    <Gamepad2 size={22} className="text-accent" /> Top Video Games
                  </h2>
                  <p className="media-section-subtitle">
                    Manage your backlog, track played hours, and filter games across all devices.
                  </p>
                </div>
                <Link href="/browse?mediaType=game" className="media-section-view-all">
                  Browse Games <ArrowRight size={16} />
                </Link>
              </div>

              <div className="media-rail-viewport">
                <div className="media-rail-track">
                  {games.map((item) => (
                    <MediaCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TRACK 5: LIT CLASSICS (BOOKS) */}
          {books.length > 0 && (
            <div className="media-section">
              <div className="media-section-header">
                <div className="media-section-title-group">
                  <h2 className="media-section-title">
                    <BookOpen size={22} className="text-accent" /> Classic Reading Room
                  </h2>
                  <p className="media-section-subtitle">
                    Project Gutenberg classics: read in-app with progress saving, no distractions.
                  </p>
                </div>
                <Link href="/books" className="media-section-view-all">
                  Open Library <ArrowRight size={16} />
                </Link>
              </div>

              <div className="media-rail-viewport">
                <div className="media-rail-track">
                  {books.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 4. THE UNIFIED EXPERIENCE CONCEPT SHOWCASE */}
        <section className="landing-rehaul-showcase">
          <div className="showcase-header">
            <span className="showcase-eyebrow">All-In-One Vault</span>
            <h2 className="showcase-title">Why Track on Five Niche Sites?</h2>
            <p className="showcase-subtitle">
              NerdVault merges the features of specialized tracking sites into one unified space, customized with high-end statistics and custom folders.
            </p>
          </div>

          <div className="showcase-features-grid">
            <div className="showcase-feature-card">
              <div className="showcase-feature-icon-box">
                <Film size={24} />
              </div>
              <div className="showcase-feature-info">
                <h3 className="showcase-feature-title">Movies & TV (Letterboxd Style)</h3>
                <p className="showcase-feature-desc">
                  Rate what you watch, add reviews, and save titles. Access release dates, cast credits, and trailers immediately.
                </p>
              </div>
              <div className="showcase-feature-footer">
                <span className="showcase-badge">Ratings</span>
                <span className="showcase-badge">Reviews</span>
                <span className="showcase-badge">Watchlists</span>
              </div>
            </div>

            <div className="showcase-feature-card">
              <div className="showcase-feature-icon-box">
                <Gamepad2 size={24} />
              </div>
              <div className="showcase-feature-info">
                <h3 className="showcase-feature-title">Games (Backloggd Style)</h3>
                <p className="showcase-feature-desc">
                  Move games from backlog to wishlist or completed. Filter by platforms, studios, and log played stats.
                </p>
              </div>
              <div className="showcase-feature-footer">
                <span className="showcase-badge">Backlog</span>
                <span className="showcase-badge">Play Status</span>
                <span className="showcase-badge">Platforms</span>
              </div>
            </div>

            <div className="showcase-feature-card">
              <div className="showcase-feature-icon-box">
                <FolderHeart size={24} />
              </div>
              <div className="showcase-feature-info">
                <h3 className="showcase-feature-title">Smart Folders & Playlists</h3>
                <p className="showcase-feature-desc">
                  Organize cross-media items together. Make a folder for &quot;Sci-Fi Favorites&quot; with films, books, and games side-by-side.
                </p>
              </div>
              <div className="showcase-feature-footer">
                <span className="showcase-badge">Custom Folders</span>
                <span className="showcase-badge">Cross-Media</span>
                <span className="showcase-badge">Private Lists</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. GUEST / MEMBER CTA CALL */}
        <section className="landing-rehaul-cta">
          <div className="cta-box-glow">
            {isSignedIn ? (
              <>
                <h2 className="cta-box-title">Welcome Back, {userName}!</h2>
                <p className="cta-box-subtitle">
                  Ready to manage your archives? Pick up where you left off or search for new additions to log.
                </p>
                <div className="cta-box-actions">
                  <Link href="/home" className="rehaul-btn rehaul-btn-primary">
                    Open Your Vault
                  </Link>
                  <BrowseResetLink className="rehaul-btn rehaul-btn-secondary">
                    Browse Catalog
                  </BrowseResetLink>
                </div>
              </>
            ) : (
              <>
                <h2 className="cta-box-title">Ready to build your vault?</h2>
                <p className="cta-box-subtitle">
                  Join NerdVault for free to organize your movies, shows, anime, games, and books. Connect with friends and review lists.
                </p>
                <div className="cta-box-actions">
                  <Link href="/sign-in" className="rehaul-btn rehaul-btn-primary">
                    Start Your Collection
                  </Link>
                  <BrowseResetLink className="rehaul-btn rehaul-btn-secondary">
                    Try Demo
                  </BrowseResetLink>
                </div>
              </>
            )}

            <div className="cta-bullets-note">
              <span>No credit cards</span>
              <span>Fully responsive</span>
              <span>Connect with friends</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-rehaul-footer">
          <div className="footer-rehaul-container">
            <div className="footer-rehaul-logo-row">
              <Image 
                src="/brand/logo-mark-clean.svg" 
                alt="NerdVault logo" 
                width={28} 
                height={28} 
              />
              <span className="footer-rehaul-logo-text">NerdVault</span>
            </div>
            
            <p className="footer-rehaul-tagline">
              Your universe of entertainment. Log what hit. Queue what calls next.
            </p>

            <div className="footer-rehaul-links">
              <BrowseResetLink className="footer-rehaul-link">Browse</BrowseResetLink>
              <Link href="/support" className="footer-rehaul-link">Support</Link>
              <Link href="/books" className="footer-rehaul-link">Books Room</Link>
              {isSignedIn ? (
                <Link href="/home" className="footer-rehaul-link">Vault</Link>
              ) : (
                <Link href="/sign-in" className="footer-rehaul-link">Sign In</Link>
              )}
            </div>

            <p className="footer-rehaul-copy">
              &copy; {new Date().getFullYear()} NerdVault. Built with passion for enthusiasts.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

// Sub-components to keep code clean and maintainable

function MediaCard({ item }: { item: MediaItem }) {
  const ratingVal = item.rating ? item.rating.toFixed(1) : null;
  const yearVal = item.year || null;
  const isShow = item.type === "show";
  const displayType = isShow ? "TV" : item.type;

  return (
    <Link href={`/media/${item.slug}`} className="rehaul-media-card">
      <div className="rehaul-media-poster-wrapper">
        {ratingVal && (
          <span className="card-floating-badge">
            ★ {ratingVal}
          </span>
        )}
        <span className="card-floating-badge badge-type">
          {displayType}
        </span>
        <img 
          src={item.coverUrl || "/fallback-poster.jpg"} 
          alt={item.title} 
          className="rehaul-media-poster"
          loading="lazy"
        />
        <div className="rehaul-media-poster-overlay">
          <span className="overlay-quick-view">View Details &rarr;</span>
        </div>
      </div>
      <h3 className="rehaul-media-card-title">{item.title}</h3>
      <div className="rehaul-media-card-meta">
        {yearVal && <span className="rehaul-media-card-year">{yearVal}</span>}
      </div>
    </Link>
  );
}

function BookCard({ book }: { book: BookSummary }) {
  const authorName = book.authors[0] || "Unknown Author";

  return (
    <Link href={`/books/${book.id}`} className="rehaul-media-card book-card-item">
      <div className="rehaul-media-poster-wrapper">
        <span className="card-floating-badge badge-type">
          Book
        </span>
        <img 
          src={book.coverUrl || "/fallback-book-cover.jpg"} 
          alt={book.title} 
          className="rehaul-media-poster"
          loading="lazy"
        />
        <div className="rehaul-media-poster-overlay">
          <span className="overlay-quick-view">Read Book &rarr;</span>
        </div>
      </div>
      <h3 className="rehaul-media-card-title">{book.title}</h3>
      <div className="rehaul-media-card-meta">
        <span className="rehaul-media-card-year" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
          {authorName}
        </span>
      </div>
    </Link>
  );
}
