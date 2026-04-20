import Link from "next/link";
import { CatalogCard } from "@/components/catalog-card";
import { HomeFeed } from "@/lib/home-feed";

const SECTION_ORDER = [
  { key: "movie", label: "Movies" },
  { key: "show", label: "Shows" },
  { key: "anime", label: "Anime" },
  { key: "game", label: "Games" },
] as const;

export function HomeWorkspace({
  viewerName,
  feed,
}: {
  viewerName: string;
  feed: HomeFeed;
}) {
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
            <div className="profile-jump-row home-jump-row">
              <a href="#home-upcoming" className="button button-secondary profile-jump-button">
                Coming soon
              </a>
              <a href="#home-tv-shows" className="button button-secondary profile-jump-button">
                TV Shows
              </a>
              {SECTION_ORDER.map((section) => (
                <a key={section.key} href={`#home-${section.key}`} className="button button-secondary profile-jump-button">
                  {section.label}
                </a>
              ))}
            </div>
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
      </section>

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
              >
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

      {/* Dedicated TV Shows Section */}
      {feed.sections.show?.length > 0 && (
        <section id="home-tv-shows" className="section-stack" style={{ paddingTop: 0 }}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Featured</p>
              <h2 className="headline">TV Shows you'll love</h2>
              <p className="copy" style={{ marginTop: 8, maxWidth: 760 }}>
                Handpicked TV series based on your viewing history and preferences. From ongoing favorites to hidden gems waiting to be discovered.
              </p>
            </div>
          </div>
          <div className="catalog-grid">
            {feed.sections.show.slice(0, 12).map((item, index) => (
              <CatalogCard key={item.id} item={item} priority={index < 6} />
            ))}
          </div>
          {feed.sections.show.length > 12 && (
            <div className="section-actions" style={{ marginTop: 24, textAlign: 'center' }}>
              <a href="#home-show" className="button button-secondary">
                View all TV shows
              </a>
            </div>
          )}
        </section>
      )}

      {SECTION_ORDER.map((section) => {
        const items = feed.sections[section.key];
        if (!items.length) return null;

        return (
          <section key={section.key} id={`home-${section.key}`} className="section-stack" style={{ paddingTop: 0 }}>
            <div className="section-header">
              <div>
                <p className="eyebrow">For you</p>
                <h2 className="headline">{section.label} you'll probably like</h2>
              </div>
            </div>
            <div className="catalog-grid">
              {items.map((item, index) => (
                <CatalogCard key={item.id} item={item} priority={index < 8} />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
