"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NVLoader } from "@/components/nv-loader";

type FranchiseEntry = {
  id: string;
  title: string;
  meta: string;
  href: {
    pathname: string;
    query: {
      source: string;
      sourceId: string;
      type: string;
    };
  };
  badge?: string;
  isActive?: boolean;
  canOpen?: boolean;
};

export function FranchiseRelatedSection({
  title,
  summary,
  entries,
  secondaryTitle,
  secondaryEntries = [],
}: {
  title: string;
  summary: string;
  entries: FranchiseEntry[];
  secondaryTitle?: string;
  secondaryEntries?: FranchiseEntry[];
}) {
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const primaryTrackRef = useRef<HTMLDivElement | null>(null);
  const secondaryTrackRef = useRef<HTMLDivElement | null>(null);

  if (entries.length < 2 && secondaryEntries.length < 1) {
    return null;
  }

  const handleLinkClick = (id: string) => {
    setNavigatingId(id);
  };

  const handleScroll = (trackRef: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (!trackRef.current) return;
    const scrollAmount = direction === "left" ? -320 : 320;
    trackRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const buildAvailabilityLine = (items: FranchiseEntry[]) => {
    const locked = items.filter((entry) => entry.canOpen === false);
    const parts: string[] = [];

    if (locked.length) {
      parts.push(
        `Informational only for now, these will not open yet: ${locked.map((entry) => entry.title).join(", ")}.`,
      );
    }

    return parts.join(" ");
  };

  const renderCard = (entry: FranchiseEntry, index: number, isSecondary = false) => {
    const cardClassName = `glass franchise-card ${entry.isActive ? "is-active" : ""} ${navigatingId === entry.id ? "is-loading" : ""} ${entry.canOpen === false ? "is-disabled" : ""}`;
    const content = (
      <>
        <div className="franchise-card-topline">
          <span className="franchise-entry-pill">{isSecondary ? "Movie" : `#${index + 1}`}</span>
          <span className={`franchise-badge ${entry.isActive ? "is-active" : ""}`}>
            {navigatingId === entry.id ? (
              <div className="franchise-loading-indicator">
                <NVLoader compact />
              </div>
            ) : entry.isActive ? (
              "You are here"
            ) : entry.canOpen === false ? (
              "Info only"
            ) : (
              entry.badge ?? "Opens"
            )}
          </span>
        </div>
        <h3 className="franchise-card-title">{entry.title}</h3>
        <p className="franchise-card-meta">{entry.meta}</p>
        <p className="franchise-card-state">
          {entry.isActive ? "Current page" : entry.canOpen === false ? "Shown for chronological franchise order" : "Click to view page →"}
        </p>
      </>
    );

    if (entry.canOpen === false) {
      return (
        <article key={entry.id} className={cardClassName} aria-disabled="true">
          {content}
        </article>
      );
    }

    return (
      <Link
        key={entry.id}
        href={entry.href}
        className={cardClassName}
        aria-current={entry.isActive ? "page" : undefined}
        onClick={() => !entry.isActive && handleLinkClick(entry.id)}
      >
        {content}
      </Link>
    );
  };

  return (
    <section className="section-stack franchise-section-root" style={{ paddingTop: 0 }}>
      <div className="section-header">
        <div>
          <p className="eyebrow">Franchise / Storyline</p>
          <h2 className="headline">{title}</h2>
          <p className="copy" style={{ maxWidth: 760, marginTop: 10 }}>
            {summary}
          </p>
        </div>
      </div>

      {entries.length ? (
        <div className="franchise-block">
          <div className="section-header franchise-subheader">
            <div>
              <p className="eyebrow">{secondaryEntries.length ? "Series / Main entries" : "Franchise order"}</p>
            </div>
            <div className="franchise-controls">
              <button
                type="button"
                className="franchise-mini-arrow"
                onClick={() => handleScroll(primaryTrackRef, "left")}
                title="Scroll left"
                aria-label="Scroll franchise left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="franchise-mini-arrow"
                onClick={() => handleScroll(primaryTrackRef, "right")}
                title="Scroll right"
                aria-label="Scroll franchise right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="franchise-scroll-shell">
            <div ref={primaryTrackRef} className="franchise-grid">
              {entries.map((entry, index) => renderCard(entry, index))}
            </div>
          </div>

          <p className="copy franchise-availability-note">{buildAvailabilityLine(entries)}</p>
        </div>
      ) : null}

      {secondaryEntries.length ? (
        <div className="franchise-block" style={{ marginTop: 24 }}>
          <div className="section-header franchise-subheader">
            <div>
              <p className="eyebrow">Movies / Specials</p>
              <h3 className="headline" style={{ margin: 0 }}>{secondaryTitle ?? "Franchise movies"}</h3>
            </div>
            <div className="franchise-controls">
              <button
                type="button"
                className="franchise-mini-arrow"
                onClick={() => handleScroll(secondaryTrackRef, "left")}
                title="Scroll left"
                aria-label="Scroll movies left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="franchise-mini-arrow"
                onClick={() => handleScroll(secondaryTrackRef, "right")}
                title="Scroll right"
                aria-label="Scroll movies right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="franchise-scroll-shell">
            <div ref={secondaryTrackRef} className="franchise-grid">
              {secondaryEntries.map((entry, index) => renderCard(entry, index, true))}
            </div>
          </div>

          <p className="copy franchise-availability-note">{buildAvailabilityLine(secondaryEntries)}</p>
        </div>
      ) : null}
    </section>
  );
}
