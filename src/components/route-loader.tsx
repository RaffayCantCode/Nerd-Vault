import { BrandLogo } from "@/components/brand-logo";

type RouteLoaderProps = {
  label?: string;
  type?: "browse" | "media" | "vault" | "activity" | "friends" | "profile" | "support" | "general";
  className?: string;
};

export function RouteLoader({
  label = "Loading page...",
  type = "general",
  className = "",
}: RouteLoaderProps) {
  return (
    <div className={`nv-skeleton-page-container nv-skeleton-${type} ${className}`.trim()} role="status" aria-live="polite">
      {/* Center Floating Glowing Logo Hero */}
      <div className="nv-skeleton-center-hero">
        <div className="nv-skeleton-emblem-wrap">
          <div className="nv-skeleton-glow-ambient" />
          <div className="nv-skeleton-emblem">
            <BrandLogo className="nv-skeleton-logo-img" priority />
          </div>
        </div>
        <p className="nv-skeleton-label">{label}</p>
      </div>

      {/* Full Background Shimmer Wireframes */}
      <div className="nv-skeleton-layout-wireframe" aria-hidden="true">
        {type === "media" && (
          <div className="nv-skeleton-media-view">
            <div className="nv-skeleton-media-banner nv-shimmer-box" />
            <div className="nv-skeleton-media-content">
              <div className="nv-skeleton-media-poster nv-shimmer-box" />
              <div className="nv-skeleton-media-details">
                <div className="nv-skeleton-line nv-skeleton-title nv-shimmer-box" />
                <div className="nv-skeleton-pill-row">
                  <div className="nv-skeleton-pill nv-shimmer-box" style={{ width: 80, height: 32 }} />
                  <div className="nv-skeleton-pill nv-shimmer-box" style={{ width: 60, height: 32 }} />
                  <div className="nv-skeleton-pill nv-shimmer-box" style={{ width: 110, height: 32 }} />
                  <div className="nv-skeleton-pill nv-shimmer-box" style={{ width: 70, height: 32 }} />
                </div>
                <div className="nv-skeleton-action-bar nv-shimmer-box" style={{ width: 340, height: 44, borderRadius: 999 }} />
                <div className="nv-skeleton-line nv-skeleton-desc nv-shimmer-box" />
                <div className="nv-skeleton-line nv-skeleton-desc-short nv-shimmer-box" />
              </div>
            </div>
            <div className="nv-skeleton-sub-rail">
              <div className="nv-skeleton-line nv-shimmer-box" style={{ width: 180, height: 24, borderRadius: 6 }} />
              <div className="nv-skeleton-rail-row">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="nv-skeleton-rail-item nv-shimmer-box" />
                ))}
              </div>
            </div>
          </div>
        )}

        {type === "browse" && (
          <div className="nv-skeleton-browse-view">
            {/* Search & Filter bar outline */}
            <div className="nv-skeleton-search-bar nv-shimmer-box" />
            <div className="nv-skeleton-filter-pills">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="nv-skeleton-pill nv-shimmer-box" style={{ width: 95, height: 36 }} />
              ))}
            </div>
            {/* Featured spotlight card */}
            <div className="nv-skeleton-spotlight-card nv-shimmer-box">
              <div className="nv-skeleton-spotlight-info">
                <div className="nv-skeleton-line nv-shimmer-sub" style={{ width: "40%", height: 28 }} />
                <div className="nv-skeleton-line nv-shimmer-sub" style={{ width: "65%", height: 16 }} />
              </div>
            </div>
            {/* Media poster grid */}
            <div className="nv-skeleton-cards-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="nv-skeleton-card nv-shimmer-box">
                  <div className="nv-skeleton-card-topbar">
                    <span className="nv-skeleton-badge nv-shimmer-sub" />
                    <span className="nv-skeleton-badge nv-shimmer-sub" />
                  </div>
                  <div className="nv-skeleton-card-bottom">
                    <div className="nv-skeleton-card-line nv-shimmer-sub" />
                    <div className="nv-skeleton-card-line-sm nv-shimmer-sub" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {type === "vault" && (
          <div className="nv-skeleton-vault-view">
            <div className="nv-skeleton-stats-strip">
              <div className="nv-skeleton-stat-card nv-shimmer-box" />
              <div className="nv-skeleton-stat-card nv-shimmer-box" />
              <div className="nv-skeleton-stat-card nv-shimmer-box" />
            </div>
            <div className="nv-skeleton-tabs-row">
              <div className="nv-skeleton-pill nv-shimmer-box" style={{ width: 110, height: 40 }} />
              <div className="nv-skeleton-pill nv-shimmer-box" style={{ width: 120, height: 40 }} />
              <div className="nv-skeleton-pill nv-shimmer-box" style={{ width: 110, height: 40 }} />
            </div>
            <div className="nv-skeleton-cards-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="nv-skeleton-card nv-shimmer-box" />
              ))}
            </div>
          </div>
        )}

        {type === "activity" && (
          <div className="nv-skeleton-activity-view">
            <div className="nv-skeleton-activity-feed">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="nv-skeleton-feed-card nv-shimmer-box">
                  <div className="nv-skeleton-avatar nv-shimmer-sub" />
                  <div className="nv-skeleton-feed-body">
                    <div className="nv-skeleton-line nv-shimmer-sub" style={{ width: "35%", height: 16 }} />
                    <div className="nv-skeleton-line nv-shimmer-sub" style={{ width: "80%", height: 14 }} />
                  </div>
                  <div className="nv-skeleton-feed-thumb nv-shimmer-sub" />
                </div>
              ))}
            </div>
          </div>
        )}

        {type === "friends" && (
          <div className="nv-skeleton-friends-view">
            <div className="nv-skeleton-search-bar nv-shimmer-box" style={{ maxWidth: 460 }} />
            <div className="nv-skeleton-friends-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="nv-skeleton-friend-card nv-shimmer-box">
                  <div className="nv-skeleton-avatar-lg nv-shimmer-sub" />
                  <div className="nv-skeleton-line nv-shimmer-sub" style={{ width: "60%", height: 16 }} />
                  <div className="nv-skeleton-line nv-shimmer-sub" style={{ width: "40%", height: 12 }} />
                  <div className="nv-skeleton-pill nv-shimmer-sub" style={{ width: "80%", height: 32, marginTop: 8 }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {type === "profile" && (
          <div className="nv-skeleton-profile-view">
            <div className="nv-skeleton-profile-banner nv-shimmer-box">
              <div className="nv-skeleton-profile-avatar nv-shimmer-sub" />
            </div>
            <div className="nv-skeleton-profile-meta">
              <div className="nv-skeleton-line nv-shimmer-box" style={{ width: 180, height: 26 }} />
              <div className="nv-skeleton-line nv-shimmer-box" style={{ width: 280, height: 16 }} />
            </div>
            <div className="nv-skeleton-cards-grid" style={{ marginTop: "1.5rem" }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="nv-skeleton-card nv-shimmer-box" />
              ))}
            </div>
          </div>
        )}

        {(type === "support" || type === "general") && (
          <div className="nv-skeleton-general-view">
            <div className="nv-skeleton-hero-banner nv-shimmer-box" />
            <div className="nv-skeleton-cards-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="nv-skeleton-card nv-shimmer-box" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
