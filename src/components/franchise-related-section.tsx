import Link from "next/link";
import { useState } from "react";
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

  if (entries.length < 2 && secondaryEntries.length < 1) {
    return null;
  }

  const handleLinkClick = (id: string) => {
    setNavigatingId(id);
  };

  const buildAvailabilityLine = (items: FranchiseEntry[]) => {
    const openable = items.filter((entry) => entry.canOpen !== false);
    const locked = items.filter((entry) => entry.canOpen === false);
    const parts: string[] = [];

    if (openable.length) {
      parts.push(
        `Open now: ${openable.map((entry) => entry.title).join(", ")}.`,
      );
    }

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
        <span className="eyebrow">{isSecondary ? "Movie" : "Entry"} {index + 1}</span>
        <span className="franchise-badge">
          {navigatingId === entry.id ? (
            <div className="franchise-loading-indicator">
              <NVLoader compact />
            </div>
          ) : entry.isActive ? (
            "You are here"
          ) : entry.canOpen === false ? (
            "Won't open yet"
          ) : (
            entry.badge ?? "Opens"
          )}
        </span>
      </div>
      <h3 className="headline franchise-card-title">{entry.title}</h3>
      <p className="copy franchise-card-meta">{entry.meta}</p>
      <p className="copy franchise-card-state">
        {entry.isActive ? "Current page." : entry.canOpen === false ? "This entry is shown for franchise order only and does not have its own page yet." : "This entry opens normally."}
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
    <section className="section-stack" style={{ paddingTop: 0 }}>
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
        <>
          <div className="section-header franchise-subheader">
            <div>
              <p className="eyebrow">{secondaryEntries.length ? "Series / Main entries" : "Franchise order"}</p>
            </div>
          </div>
          <div className="franchise-grid">
            {entries.map((entry, index) => renderCard(entry, index))}
          </div>
          <p className="copy franchise-availability-note">{buildAvailabilityLine(entries)}</p>
        </>
      ) : null}

      {secondaryEntries.length ? (
        <>
          <div className="section-header franchise-subheader" style={{ marginTop: 12 }}>
            <div>
              <p className="eyebrow">Movies / Specials</p>
              <h3 className="headline" style={{ margin: 0 }}>{secondaryTitle ?? "Franchise movies"}</h3>
            </div>
          </div>
          <div className="franchise-grid">
            {secondaryEntries.map((entry, index) => renderCard(entry, index, true))}
          </div>
          <p className="copy franchise-availability-note">{buildAvailabilityLine(secondaryEntries)}</p>
        </>
      ) : null}
    </section>
  );
}
