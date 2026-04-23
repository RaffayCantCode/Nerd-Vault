"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CatalogCard } from "@/components/catalog-card";
import { HomeFeed } from "@/lib/home-feed";
import { NVLoader } from "@/components/nv-loader";
import { writeDetailReturnTarget } from "@/lib/detail-return";
import { ResilientMediaImage } from "@/components/resilient-media-image";

const HOME_SECTION_PAGE_SIZE = 8;

const SECTION_ORDER = [
  { key: "movie", label: "Movies" },
  { key: "anime", label: "Anime" },
  { key: "game", label: "Games" },
] as const;

const SECTION_ITEM_LABEL = {
  movie: "movie",
  anime: "anime",
  game: "game",
} as const;

const WATCHED_PROMPTS = {
  show: {
    title: "Add a TV show to watched first.",
    copy: "Mark any series as watched and we will start shaping TV recommendations around that taste.",
  },
  movie: {
    title: "Add a movie to watched first.",
    copy: "Mark any movie as watched and we will recommend more films that fit what you actually like.",
  },
  anime: {
    title: "Add an anime to watched first.",
    copy: "Mark any anime as watched and we will recommend more anime according to that signal.",
  },
  game: {
    title: "Add a game to watched first.",
    copy: "Mark any game as watched and we will start building game picks around it.",
  },
} as const;

// Loading state component
function HomeWorkspaceLoading() {
  return (
    <main className="workspace">
      <section className="workspace-hero glass home-hero">
        <div className="home-hero-backdrop" aria-hidden="true" />
        <div className="workspace-hero-grid">
          <div className="workspace-copy">
            <div className="skeleton" style={{ width: '120px', height: '24px', marginBottom: '16px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ width: '300px', height: '48px', marginBottom: '16px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ width: '100%', maxWidth: '600px', height: '20px', marginBottom: '12px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '100%', maxWidth: '500px', height: '20px', marginBottom: '24px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ width: '400px', height: '40px', borderRadius: '8px' }} />
          </div>
          <aside className="info-panel glass home-hero-panel">
            <div className="skeleton" style={{ width: '100%', height: '200px', borderRadius: '12px' }} />
          </aside>
        </div>
      </section>
      
      <div className="section-stack">
        <div className="section-header">
          <div className="skeleton" style={{ width: '120px', height: '24px', marginBottom: '8px', borderRadius: '8px' }} />
          <div className="skeleton" style={{ width: '300px', height: '36px', borderRadius: '8px' }} />
        </div>
        <div className="catalog-grid">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="skeleton" style={{ aspectRatio: '2/3', borderRadius: '12px' }} />
          ))}
        </div>
      </div>
    </main>
  );
}

export function HomeWorkspace({
  viewerName,
  feed,
}: {
  viewerName: string;
  feed: HomeFeed;
}) {
  useEffect(() => {
    // Safety reset: if a mobile overlay previously left overflow locked,
    // Home should always restore normal page scrolling.
    document.body.style.removeProperty("overflow");
  }, []);

  // Show loading state if feed is empty or still loading
  if (!feed) {
    return <HomeWorkspaceLoading />;
  }

  const [sectionPages, setSectionPages] = useState<Record<string, number>>({
    show: 1,
    movie: 1,
    anime: 1,
    game: 1,
  });

  function setSectionPage(sectionKey: string, nextPage: number) {
    setSectionPages((current) => ({
      ...current,
      [sectionKey]: nextPage,
    }));
  }

  function renderShelfPager(sectionKey: string, totalItems: number) {
    const totalPages = Math.max(1, Math.ceil(totalItems / HOME_SECTION_PAGE_SIZE));
    const currentPage = sectionPages[sectionKey] ?? 1;

    if (totalPages <= 1) {
      return null;
    }

    return (
      <div className="bottom-pager glass home-section-pager">
        <div className="pager-copy">
          <p className="eyebrow">Shelf pages</p>
          <p className="copy">
            Page {currentPage} of {totalPages}
          </p>
        </div>
        <div className="pager-actions">
          <button type="button" className="chip" disabled={currentPage <= 1} onClick={() => setSectionPage(sectionKey, Math.max(1, currentPage - 1))}>
            Previous
          </button>
          <div className="page-indicator">
            <span>{currentPage}</span>
            <span>/</span>
            <span>{totalPages}</span>
          </div>
          <button type="button" className="chip is-active" disabled={currentPage >= totalPages} onClick={() => setSectionPage(sectionKey, Math.min(totalPages, currentPage + 1))}>
            Next
          </button>
        </div>
      </div>
    );
  }

  function pagedItems(sectionKey: keyof HomeFeed["sections"]) {
    const items = feed.sections[sectionKey];
    const currentPage = sectionPages[sectionKey] ?? 1;
    return items.slice((currentPage - 1) * HOME_SECTION_PAGE_SIZE, currentPage * HOME_SECTION_PAGE_SIZE);
  }

  return (
    <main className="workspace">
      <section className="workspace-hero glass home-hero">
        <div className="home-hero-backdrop" aria-hidden="true" />
        <div className="workspace-hero-grid">
          <div className="workspace-copy">
            <p className="eyebrow">Home hub</p>
            <h1 className="display home-display">{viewerName.split(" ")[0] || "Vault"} home</h1>
            <p className="detail-lead">{feed.greeting}</p>
            <p className="copy">
              This page watches your vault for returning series and builds a fresh recommendation lane around the stuff you actually save, finish, and organize.
            </p>
          </div>

          <aside className="info-panel glass home-hero-panel">
            <div className="home-panel-header">
              <div className="home-panel-icon">
                <div className="home-panel-icon-bg" />
                <span className="home-panel-icon-text">NV</span>
              </div>
              <div className="home-panel-title">
                <p className="eyebrow">Taste read</p>
                <h3 className="headline">Your vault insights</h3>
              </div>
            </div>
            <div className="home-panel-stats">
              <div className="home-stat-card">
                <div className="home-stat-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="home-stat-content">
                  <span className="home-stat-label">Upcoming</span>
                  <strong className="home-stat-value">{feed.upcoming.length}</strong>
                </div>
              </div>
              <div className="home-stat-card">
                <div className="home-stat-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M9 9h6v6H9z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="home-stat-content">
                  <span className="home-stat-label">Categories</span>
                  <strong className="home-stat-value">{SECTION_ORDER.filter((section) => feed.sections[section.key].length).length}</strong>
                </div>
              </div>
              <div className="home-stat-card">
                <div className="home-stat-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="home-stat-content">
                  <span className="home-stat-label">Built from</span>
                  <strong className="home-stat-value">Your data</strong>
                </div>
              </div>
            </div>
            <div className="home-panel-footer">
              <p className="copy home-panel-copy">
                Personalized recommendations based on your watched list, wishlist, and folder organization
              </p>
            </div>
          </aside>
        </div>
        <div className="profile-section-nav glass home-section-nav">
          <a href="#home-upcoming" className="profile-section-nav-link">Coming soon</a>
          <a href="#home-tv-shows" className="profile-section-nav-link">Series</a>
          {SECTION_ORDER.map((section) => (
            <a key={section.key} href={`#home-${section.key}`} className="profile-section-nav-link">
              {section.label}
            </a>
          ))}
        </div>
      </section>

      <section className="section-stack home-board" style={{ paddingTop: 0 }}>
        <div className="home-board-main">
          <section id="home-upcoming" className="section-stack" style={{ paddingTop: 0 }}>
            <div className="section-header">
              <div>
                <p className="eyebrow">Coming soon</p>
                <h2 className="headline">You watched this. More of it is on the way.</h2>
              </div>
            </div>

            {feed.upcoming.length ? (
              <div className="home-upcoming-grid">
                {feed.upcoming.map((entry) => (
                  <Link
                    key={`${entry.base.id}-${entry.continuation.id}-${entry.label}`}
                    href={{
                      pathname: `/media/${entry.continuation.slug}`,
                      query: {
                        source: entry.continuation.source,
                        sourceId: entry.continuation.sourceId,
                        type: entry.continuation.type,
                      },
                    }}
                    className="glass home-upcoming-card"
                    onClick={() => writeDetailReturnTarget({ href: "/home", label: "Back to home" })}
                  >
                    <div className="home-upcoming-poster" aria-hidden="true">
                      <ResilientMediaImage item={entry.continuation} loading="lazy" decoding="async" />
                    </div>
                    <div className="home-upcoming-copy-stack">
                    <p className="eyebrow">{entry.label}</p>
                    <h3 className="headline home-upcoming-title">{entry.continuation.title}</h3>
                    <p className="copy home-upcoming-copy">
                      {entry.base.id === entry.continuation.id ? (
                        <>You already added <strong>{entry.base.title}</strong>, and it still has episodes rolling out.</>
                      ) : (
                        <>Because you watched <strong>{entry.base.title}</strong>, this continuation stood out.</>
                      )}
                    </p>
                    <div className="home-upcoming-meta">
                      <span className="detail-pill">{entry.dateLabel}</span>
                      <span className="detail-pill">{entry.continuation.type}</span>
                    </div>
                    <p className="copy">{entry.reason}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="folder-empty glass">
                <p className="headline">No tracked continuations right now.</p>
                <p className="copy">
                  Once your watched list has series with upcoming seasons or connected anime entries, they'll show up here with the next date we can detect.
                </p>
              </div>
            )}
          </section>

          <section className="section-stack" style={{ paddingTop: 0 }}>
            <div className="section-header">
              <div>
                <p className="eyebrow">For you</p>
                <h2 className="headline">Series you'll probably like</h2>
                <p className="copy" style={{ marginTop: 8, maxWidth: 760 }}>
                  TV series picked from what you have actually marked as watched, so the lane gets better as you teach it your taste.
                </p>
              </div>
            </div>
            <div className="home-series-note glass">
              <p className="copy">
                Series picks live in the same shelf format as the other recommendation lanes below so covers and spacing stay consistent.
              </p>
            </div>
          </section>
        </div>
        <aside className="home-board-side">
          <div className="info-panel glass home-side-panel">
            <p className="eyebrow">At a glance</p>
            <div className="profile-stage-stats-grid home-side-stats">
              <div className="profile-stage-stat">
                <strong>{feed.upcoming.length}</strong>
                <span>Upcoming</span>
              </div>
              <div className="profile-stage-stat">
                <strong>{feed.watchedCounts.show}</strong>
                <span>Shows watched</span>
              </div>
              <div className="profile-stage-stat">
                <strong>{feed.sections.movie.length + feed.sections.anime.length + feed.sections.game.length}</strong>
                <span>Fresh picks</span>
              </div>
            </div>
            <p className="copy home-side-copy">
              The home hub now works more like a shelf wall than a tall feed, so you can scan sideways before you commit.
            </p>
          </div>
        </aside>
      </section>

      <section id="home-tv-shows" className="section-stack" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <div>
            <p className="eyebrow">For you</p>
            <h2 className="headline">Series you'll probably like</h2>
            <p className="copy" style={{ marginTop: 8, maxWidth: 760 }}>
              TV series picked from what you have actually marked as watched, so the lane gets better as you teach it your taste.
            </p>
          </div>
        </div>
        {feed.watchedCounts.show > 0 ? (
          feed.sections.show.length ? (
            <>
              <div className="catalog-grid home-media-grid">
                {pagedItems("show").map((item, index) => (
                  <CatalogCard key={item.id} item={item} priority={index < 8} />
                ))}
              </div>
              {renderShelfPager("show", feed.sections.show.length)}
            </>
          ) : (
            <div className="folder-empty glass">
              <p className="headline">We need a little more signal from your series history.</p>
              <p className="copy">Try adding another watched show and this lane should get much more useful.</p>
            </div>
          )
        ) : (
          <div className="folder-empty glass">
            <p className="headline">{WATCHED_PROMPTS.show.title}</p>
            <p className="copy">{WATCHED_PROMPTS.show.copy}</p>
          </div>
        )}
      </section>

      {SECTION_ORDER.map((section) => {
        const items = feed.sections[section.key];

        return (
          <section key={section.key} id={`home-${section.key}`} className="section-stack" style={{ paddingTop: 0 }}>
            <div className="section-header">
              <div>
                <p className="eyebrow">For you</p>
                <h2 className="headline">{section.label} you'll probably like</h2>
              </div>
            </div>
            {feed.watchedCounts[section.key] > 0 ? (
              items.length ? (
                <>
                  <div className="catalog-grid home-media-grid">
                  {pagedItems(section.key).map((item, index) => (
                    <CatalogCard key={item.id} item={item} priority={index < 8} />
                  ))}
                  </div>
                  {renderShelfPager(section.key, items.length)}
                </>
              ) : (
                <div className="folder-empty glass">
                  <p className="headline">We need a little more signal from your {section.label.toLowerCase()} history.</p>
                  <p className="copy">Add another watched {SECTION_ITEM_LABEL[section.key]} and we will have a better base for recommendations.</p>
                </div>
              )
            ) : (
              <div className="folder-empty glass">
                <p className="headline">{WATCHED_PROMPTS[section.key].title}</p>
                <p className="copy">{WATCHED_PROMPTS[section.key].copy}</p>
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
