import Link from "next/link";

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
  if (entries.length < 2 && secondaryEntries.length < 1) {
    return null;
  }

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
            {entries.map((entry, index) => (
              <Link
                key={entry.id}
                href={entry.href}
                className={`glass franchise-card ${entry.isActive ? "is-active" : ""}`}
                aria-current={entry.isActive ? "page" : undefined}
              >
                <div className="franchise-card-topline">
                  <span className="eyebrow">Entry {index + 1}</span>
                  <span className="franchise-badge">{entry.isActive ? "You are here" : entry.badge ?? "Open"}</span>
                </div>
                <h3 className="headline franchise-card-title">{entry.title}</h3>
                <p className="copy franchise-card-meta">{entry.meta}</p>
              </Link>
            ))}
          </div>
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
            {secondaryEntries.map((entry, index) => (
              <Link
                key={entry.id}
                href={entry.href}
                className={`glass franchise-card ${entry.isActive ? "is-active" : ""}`}
                aria-current={entry.isActive ? "page" : undefined}
              >
                <div className="franchise-card-topline">
                  <span className="eyebrow">Movie {index + 1}</span>
                  <span className="franchise-badge">{entry.isActive ? "You are here" : entry.badge ?? "Open"}</span>
                </div>
                <h3 className="headline franchise-card-title">{entry.title}</h3>
                <p className="copy franchise-card-meta">{entry.meta}</p>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
