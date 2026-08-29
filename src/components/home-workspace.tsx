"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { CatalogCard } from "@/components/catalog-card";
import { HomeFeed } from "@/lib/home-feed";
import { writeDetailReturnTarget } from "@/lib/detail-return";
import { ResilientMediaImage } from "@/components/resilient-media-image";
import { Sparkles, Film, Tv, Gamepad2, Compass, Clock } from "lucide-react";

const HOME_SECTION_PAGE_SIZE = 10;

const SECTIONS = [
  { key: "show" as const, label: "TV Series for You", icon: <Tv size={15} style={{ color: "#a855f7" }} /> },
  { key: "movie" as const, label: "Films for You", icon: <Film size={15} style={{ color: "#f59e0b" }} /> },
  { key: "anime" as const, label: "Anime for You", icon: <Sparkles size={15} style={{ color: "#ec4899" }} /> },
  { key: "game" as const, label: "Games for You", icon: <Gamepad2 size={15} style={{ color: "#10b981" }} /> },
];

export function HomeWorkspace({
  viewerName,
  feed,
}: {
  viewerName: string;
  feed: HomeFeed;
}) {
  const [sectionPages, setSectionPages] = useState<Record<string, number>>({
    show: 1,
    movie: 1,
    anime: 1,
    game: 1,
  });

  const setSectionPage = useCallback((sectionKey: string, nextPage: number) => {
    setSectionPages((current) => ({
      ...current,
      [sectionKey]: nextPage,
    }));
  }, []);

  function renderShelfPager(sectionKey: string, totalItems: number) {
    const totalPages = Math.max(1, Math.ceil(totalItems / HOME_SECTION_PAGE_SIZE));
    const currentPage = sectionPages[sectionKey] ?? 1;

    if (totalPages <= 1) return null;

    return (
      <div className="bottom-pager glass home-section-pager" style={{ marginTop: "1rem" }}>
        <div className="pager-copy">
          <p className="copy">
            Page {currentPage} of {totalPages}
          </p>
        </div>
        <div className="pager-actions">
          <button
            type="button"
            className="chip"
            disabled={currentPage <= 1}
            onClick={() => setSectionPage(sectionKey, Math.max(1, currentPage - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="chip is-active"
            disabled={currentPage >= totalPages}
            onClick={() => setSectionPage(sectionKey, Math.min(totalPages, currentPage + 1))}
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  function pagedItems(sectionKey: keyof HomeFeed["sections"]) {
    const items = feed.sections[sectionKey] || [];
    const currentPage = sectionPages[sectionKey] ?? 1;
    return items.slice((currentPage - 1) * HOME_SECTION_PAGE_SIZE, currentPage * HOME_SECTION_PAGE_SIZE);
  }

  const totalWatched =
    (feed.watchedCounts.movie || 0) +
    (feed.watchedCounts.show || 0) +
    (feed.watchedCounts.anime || 0) +
    (feed.watchedCounts.game || 0);

  const hasAnyRecommendations =
    feed.upcoming.length > 0 ||
    feed.sections.show.length > 0 ||
    feed.sections.movie.length > 0 ||
    feed.sections.anime.length > 0 ||
    feed.sections.game.length > 0;

  if (totalWatched === 0 && !hasAnyRecommendations) {
    return (
      <div className="nv-lb-empty-box" style={{ padding: "3.5rem 1.5rem", gap: "1rem" }}>
        <Sparkles size={32} style={{ color: "#5eead4" }} />
        <h3 style={{ fontSize: "1.15rem", fontWeight: 750, color: "#ffffff", margin: 0 }}>
          Your Personal Recommendations
        </h3>
        <p className="nv-lb-empty-text" style={{ maxWidth: "42ch", lineHeight: 1.5 }}>
          As you log movies, TV shows, anime, and games into your vault, your personalized discovery feed will appear here.
        </p>
        <Link
          href="/browse"
          className="button button-primary"
          style={{ fontSize: "0.85rem", padding: "0.5rem 1.5rem" }}
        >
          <Compass size={16} />
          <span>Browse Catalog</span>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.25rem" }}>
      {/* 1. UPCOMING CONTINUATIONS (IF ANY) */}
      {feed.upcoming.length > 0 && (
        <section>
          <div className="nv-lb-section-head">
            <h2 className="nv-lb-section-title">
              <Clock size={15} style={{ color: "#38bdf8" }} />
              <span>Coming Soon</span>
            </h2>
          </div>

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
                  <ResilientMediaImage
                    item={entry.continuation}
                    displayIntent="thumb"
                    upgradeIntent="cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="home-upcoming-copy-stack">
                  <span className="nv-pill-tag" style={{ fontSize: "0.7rem", color: "#38bdf8" }}>
                    {entry.label}
                  </span>
                  <h3 className="headline home-upcoming-title" style={{ fontSize: "0.95rem" }}>
                    {entry.continuation.title}
                  </h3>
                  <div className="home-upcoming-meta">
                    <span className="detail-pill">{entry.dateLabel}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 2. MEDIA CATEGORY RECOMMENDATIONS */}
      {SECTIONS.map((section) => {
        const items = feed.sections[section.key] || [];
        if (!items.length) return null;

        return (
          <section key={section.key}>
            <div className="nv-lb-section-head">
              <h2 className="nv-lb-section-title">
                {section.icon}
                <span>{section.label}</span>
              </h2>
            </div>

            <div className="catalog-grid home-media-grid">
              {pagedItems(section.key).map((item, index) => (
                <CatalogCard key={item.id} item={item} priority={index < 6} />
              ))}
            </div>

            {renderShelfPager(section.key, items.length)}
          </section>
        );
      })}
    </div>
  );
}
