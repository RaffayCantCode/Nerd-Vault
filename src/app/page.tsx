import Image from "next/image";
import Link from "next/link";
import {
  Film, Tv, Gamepad2, BookOpen, Search, Sparkles,
  Star, Users, ArrowRight, Bookmark,
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

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const seed = getBrowseDiscoverySeed();

  const [bootstrapResult, booksResult, session, animeExtra] = await Promise.all([
    getBrowseBootstrapCatalog(seed).catch(() => ({ catalog: [] as MediaItem[], surfacing: [] as MediaItem[] })),
    fetchBooksPage({ page: 1, query: "" }).catch(() => ({ items: [] as BookSummary[] })),
    auth().catch(() => null),
    browseAniListAnime({ page: 2, query: "", genre: "", sort: "rating", seed: seed + 77 }).catch(() => ({
      items: [] as MediaItem[], page: 2, totalPages: 1, totalResults: 0,
    })),
  ]);

  const realActivity = await prisma.watchedItem.findMany({
    take: 6,
    orderBy: { watchedAt: "desc" },
    where: { user: { watchedVisibility: "public" } },
    include: {
      user: { select: { name: true, image: true } },
      media: {
        select: { slug: true, title: true, type: true, coverUrl: true, backdropUrl: true, rating: true, source: true, sourceId: true },
      },
    },
  }).catch(() => []);

  const isSignedIn = Boolean(session?.user?.id);

  const catalog = (bootstrapResult.catalog || []).filter(isFamilyFriendlyMediaItem);

  const movies = catalog.filter((i) => i.type === "movie");
  const shows = catalog.filter((i) => i.type === "show");
  const games = catalog.filter((i) => i.type === "game");
  const books = booksResult.items || [];

  const animeBase = catalog.filter((i) => i.type === "anime");
  const animeSuppl = (animeExtra.items || [])
    .filter(isFamilyFriendlyMediaItem)
    .filter((i) => !animeBase.some((a) => a.sourceId === i.sourceId));
  const anime = [...animeBase, ...animeSuppl].slice(0, 24);

  const featured = catalog.filter((i) => i.backdropUrl && i.overview && i.rating > 0).slice(0, 4);

  return (
    <div className="nv-landing">
      <SiteHeader />

      <main>
        {/* HERO */}
        <section className="nv-hero-section">
          <div className="nv-hero-inner">
            <h1 className="nv-hero-title">
              Track everything<br />
              you watch &amp; play.
            </h1>
            <p className="nv-hero-subtitle">
              One vault for films, shows, anime, and games. Rate, review, and discover your next favorite — all in one place.
            </p>

            <form action="/browse" method="GET" className="nv-hero-search-form">
              <input type="hidden" name="focus" value="results" />
              <Search size={18} className="nv-search-icon" />
              <input
                type="search"
                name="query"
                className="nv-hero-search-input"
                placeholder="Search for movies, shows, anime, games..."
                required
              />
              <button type="submit" className="nv-hero-search-btn">Search</button>
            </form>

            <div className="nv-hero-actions">
              {isSignedIn ? (
                <>
                  <Link href="/home" className="nv-btn-primary">Open My Vault</Link>
                  <BrowseResetLink className="nv-btn-ghost">Browse Catalog</BrowseResetLink>
                </>
              ) : (
                <>
                  <Link href="/sign-in" className="nv-btn-primary">Create Free Account</Link>
                  <BrowseResetLink className="nv-btn-ghost">Explore First</BrowseResetLink>
                </>
              )}
            </div>
          </div>

          {featured.length > 0 && (
            <div className="nv-hero-posters">
              {featured.slice(0, 4).map((item, i) => (
                <Link
                  key={`hero-${item.id}-${i}`}
                  href={`/media/${item.slug}?source=${item.source}&sourceId=${item.sourceId}&type=${item.type}`}
                  className={`nv-hero-poster nv-hero-poster-${i}`}
                >
                  <ResilientMediaImage
                    item={item}
                    displayIntent="cover"
                    upgradeIntent="cover"
                    loading="eager"
                    decoding="async"
                    {...(i === 0 ? { fetchPriority: "high" as const } : {})}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* MEDIA TYPES */}
        <section className="nv-section nv-types-section">
          <div className="nv-section-inner">
            <div className="nv-types-grid">
              <Link href="/browse?focus=results&mediaType=movie" className="nv-type-card">
                <Film size={22} />
                <span className="nv-type-name">Movies</span>
              </Link>
              <Link href="/browse?focus=results&mediaType=show" className="nv-type-card">
                <Tv size={22} />
                <span className="nv-type-name">TV Shows</span>
              </Link>
              <Link href="/browse?focus=results&mediaType=anime" className="nv-type-card">
                <Sparkles size={22} />
                <span className="nv-type-name">Anime</span>
              </Link>
              <Link href="/browse?focus=results&mediaType=game" className="nv-type-card">
                <Gamepad2 size={22} />
                <span className="nv-type-name">Games</span>
              </Link>
              <Link href="/books" className="nv-type-card">
                <BookOpen size={22} />
                <span className="nv-type-name">Books</span>
              </Link>
            </div>
          </div>
        </section>

        {/* CATALOG RAILS */}
        {movies.length > 0 && (
          <RailRow label="Trending Movies" icon={<Film size={16} />} items={movies} href="/browse?mediaType=movie" />
        )}
        {shows.length > 0 && (
          <RailRow label="Popular Shows" icon={<Tv size={16} />} items={shows} href="/browse?mediaType=show" />
        )}
        {anime.length > 0 && (
          <RailRow label="Top Anime" icon={<Sparkles size={16} />} items={anime} href="/browse?mediaType=anime" />
        )}
        {games.length > 0 && (
          <RailRow label="Top Games" icon={<Gamepad2 size={16} />} items={games} href="/browse?mediaType=game" />
        )}
        {books.length > 0 && (
          <RailRow
            label="Classic Books"
            icon={<BookOpen size={16} />}
            items={books.map((b) => ({
              id: `book-${b.id}`,
              slug: String(b.id),
              source: "local" as const,
              sourceId: String(b.id),
              title: b.title,
              type: "game" as const,
              year: 0,
              rating: 0,
              language: "en",
              genres: b.genres,
              coverUrl: b.coverUrl || "",
              backdropUrl: b.coverUrl || "",
              overview: b.summary,
              credits: [],
              details: {},
            })) as MediaItem[]}
            href="/books"
          />
        )}

        {/* COMMUNITY */}
        {realActivity.length > 0 && (
          <section className="nv-section nv-community-section">
            <div className="nv-section-inner">
              <div className="nv-section-head">
                <h2 className="nv-section-title">
                  <Users size={18} /> Community Activity
                </h2>
                <Link href={isSignedIn ? "/activity" : "/sign-in"} className="nv-section-link">
                  {isSignedIn ? "View all" : "Join in"} <ArrowRight size={13} />
                </Link>
              </div>
              <div className="nv-community-grid">
                {realActivity.slice(0, 6).map((entry, i) => {
                  const name = entry.user.name || "Member";
                  const imageUrl = optimizeMediaImageUrl(entry.media.backdropUrl || entry.media.coverUrl || "/fallback-poster.jpg", "cover");
                  return (
                    <Link
                      key={`act-${entry.userId}-${entry.mediaId}-${i}`}
                      href={`/media/${entry.media.slug}?source=${entry.media.source}&sourceId=${entry.media.sourceId}&type=${entry.media.type}`}
                      className="nv-community-card"
                    >
                      <img src={imageUrl} alt={entry.media.title} loading="lazy" />
                      <div className="nv-community-body">
                        <span className="nv-community-user">{name}</span>
                        <span className="nv-community-action">
                          {entry.rating ? `rated ★ ${entry.rating.toFixed(1)}` : "logged"}
                        </span>
                        <strong className="nv-community-title">{entry.media.title}</strong>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* FEATURES */}
        <section className="nv-section nv-features-section">
          <div className="nv-section-inner">
            <div className="nv-features-grid">
              <div className="nv-feature">
                <div className="nv-feature-icon"><Star size={20} /></div>
                <h3>Rate &amp; Review</h3>
                <p>Star ratings and written reviews for everything in your vault.</p>
              </div>
              <div className="nv-feature">
                <div className="nv-feature-icon"><Bookmark size={20} /></div>
                <h3>Track &amp; Organize</h3>
                <p>Mark what you&apos;ve watched, what you&apos;re watching, and what&apos;s next on your list.</p>
              </div>
              <div className="nv-feature">
                <div className="nv-feature-icon"><Users size={20} /></div>
                <h3>Share with Friends</h3>
                <p>See what your friends are watching and recommend your favorites.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="nv-section nv-cta-section">
          <div className="nv-section-inner">
            <div className="nv-cta-content">
              <h2 className="nv-cta-title">
                Start building<br />your vault today.
              </h2>
              <p className="nv-cta-sub">
                {isSignedIn
                  ? "Pick up where you left off or discover something new."
                  : "Free to join. Log every movie, show, anime, and game you love."}
              </p>
              <div className="nv-cta-actions">
                {isSignedIn ? (
                  <>
                    <Link href="/home" className="nv-btn-primary">Open My Vault</Link>
                    <BrowseResetLink className="nv-btn-ghost">Browse Catalog</BrowseResetLink>
                  </>
                ) : (
                  <>
                    <Link href="/sign-in" className="nv-btn-primary">Create Free Account</Link>
                    <BrowseResetLink className="nv-btn-ghost">Explore First</BrowseResetLink>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="nv-landing-footer">
          <div className="nv-section-inner nv-footer-inner">
            <div className="nv-footer-brand">
              <Image src="/brand/logo-mark-clean.svg" alt="NerdVault" width={20} height={20} />
              <span>NerdVault</span>
            </div>
            <nav className="nv-footer-links">
              <BrowseResetLink>Browse</BrowseResetLink>
              <Link href="/books">Books</Link>
              <Link href="/support">Support</Link>
              {isSignedIn
                ? <Link href="/home">My Vault</Link>
                : <Link href="/sign-in">Sign In</Link>}
            </nav>
            <p className="nv-footer-copy">© {new Date().getFullYear()} NerdVault</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

function RailRow({ label, icon, items, href }: { label: string; icon: React.ReactNode; items: MediaItem[]; href: string }) {
  if (!items.length) return null;
  return (
    <section className="nv-section nv-rail-section">
      <div className="nv-section-inner">
        <div className="nv-section-head">
          <h2 className="nv-section-title">{icon} {label}</h2>
          <Link href={href} className="nv-section-link">View all <ArrowRight size={13} /></Link>
        </div>
        <div className="nv-rail">
          {items.slice(0, 12).map((item, i) => (
            <Link
              key={`rail-${item.id}-${i}`}
              href={`/media/${item.slug}?source=${item.source}&sourceId=${item.sourceId}&type=${item.type}`}
              className="nv-rail-card"
            >
              <div className="nv-rail-poster">
                {item.rating > 0 && <span className="nv-rail-rating">★ {item.rating.toFixed(1)}</span>}
                <img
                  src={optimizeMediaImageUrl(item.coverUrl, "cover") || "/fallback-poster.jpg"}
                  alt={item.title}
                  loading={i < 4 ? "eager" : "lazy"}
                  decoding="async"
                />
              </div>
              <h3 className="nv-rail-title">{item.title}</h3>
              {item.year > 0 && <span className="nv-rail-year">{item.year}</span>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
