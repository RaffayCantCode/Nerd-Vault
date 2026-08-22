import { BrandLogo } from "@/components/brand-logo";

type RouteLoaderProps = {
  label?: string;
  type?: "browse" | "media" | "vault" | "general";
  className?: string;
};

export function RouteLoader({
  label = "Loading page...",
  type = "general",
  className = "",
}: RouteLoaderProps) {
  const isMedia = type === "media" || label.toLowerCase().includes("detail") || label.toLowerCase().includes("media");

  return (
    <div className={`nv-skeleton-page-container ${className}`.trim()} role="status" aria-live="polite">
      {/* 1. Center Floating Glowing Logo Hero */}
      <div className="nv-skeleton-center-hero">
        <div className="nv-skeleton-emblem-wrap">
          <div className="nv-skeleton-glow-ambient" />
          <div className="nv-skeleton-emblem">
            <BrandLogo className="nv-skeleton-logo-img" priority />
          </div>
        </div>
        <p className="nv-skeleton-label">{label}</p>
      </div>

      {/* 2. Full Background Shimmer Wireframe */}
      <div className="nv-skeleton-layout-wireframe" aria-hidden="true">
        {isMedia ? (
          <div className="nv-skeleton-media-view">
            <div className="nv-skeleton-banner nv-shimmer-box" />
            <div className="nv-skeleton-media-content">
              <div className="nv-skeleton-poster nv-shimmer-box" />
              <div className="nv-skeleton-details">
                <div className="nv-skeleton-line nv-skeleton-title nv-shimmer-box" />
                <div className="nv-skeleton-pill-row">
                  <div className="nv-skeleton-pill nv-shimmer-box" />
                  <div className="nv-skeleton-pill nv-shimmer-box" />
                  <div className="nv-skeleton-pill nv-shimmer-box" />
                </div>
                <div className="nv-skeleton-line nv-skeleton-desc nv-shimmer-box" />
                <div className="nv-skeleton-line nv-skeleton-desc-short nv-shimmer-box" />
              </div>
            </div>
          </div>
        ) : (
          <div className="nv-skeleton-grid-view">
            <div className="nv-skeleton-header-row">
              <div className="nv-skeleton-pill nv-shimmer-box" style={{ width: 140, height: 38 }} />
              <div className="nv-skeleton-pill nv-shimmer-box" style={{ width: 220, height: 38 }} />
            </div>
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
      </div>
    </div>
  );
}
