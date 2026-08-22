"use client";

import Link from "next/link";
import { useRef, useCallback } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ResilientMediaImage } from "@/components/resilient-media-image";
import { MediaItem } from "@/lib/types";

function formatMediaTypeLabel(type: string) {
  if (type === "anime_movie") return "Anime Movie";
  if (type === "anime") return "Anime";
  if (type === "game") return "Game";
  if (type === "show") return "Show";
  return "Movie";
}

export function LandingMediaRail({
  label,
  eyebrow,
  icon,
  items,
  viewAllHref,
  accentColor,
}: {
  label: string;
  eyebrow: string;
  icon: React.ReactNode;
  items: MediaItem[];
  viewAllHref: string;
  accentColor?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollLeft = useCallback(() => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: -480, behavior: "smooth" });
  }, []);

  const scrollRight = useCallback(() => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: 480, behavior: "smooth" });
  }, []);

  if (!items.length) return null;

  return (
    <section className="nv-section nv-rail-section">
      <div className="nv-section-inner">
        <div className="nv-section-head">
          <div>
            <p className="eyebrow" style={accentColor ? { color: accentColor } : undefined}>
              {eyebrow}
            </p>
            <h2 className="nv-section-title">
              {icon} {label}
            </h2>
          </div>

          <div className="nv-rail-head-actions">
            <div className="nv-rail-scroll-btns">
              <button
                type="button"
                onClick={scrollLeft}
                className="nv-rail-arrow-btn"
                aria-label={`Scroll ${label} left`}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={scrollRight}
                className="nv-rail-arrow-btn"
                aria-label={`Scroll ${label} right`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <Link href={viewAllHref} className="nv-section-link">
              View more <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="nv-rail-track-container">
          <div ref={trackRef} className="nv-rail-track">
            {items.map((item, i) => (
              <Link
                key={`rail-${item.id}-${i}`}
                href={`/media/${item.slug}?source=${item.source}&sourceId=${item.sourceId}&type=${item.type}`}
                className="nv-rail-card"
              >
                <div className="nv-rail-poster-wrap">
                  <ResilientMediaImage
                    item={item}
                    displayIntent="thumb"
                    upgradeIntent="cover"
                    loading={i < 5 ? "eager" : "lazy"}
                    decoding="async"
                  />
                  
                  {/* Top Minimalist Badges */}
                  <div className="nv-rail-topbar">
                    <span className="nv-rail-type-pill">
                      {formatMediaTypeLabel(item.type)}
                    </span>
                    {item.rating > 0 && (
                      <span className="nv-rail-rating">
                        <span className="star-icon">★</span>
                        <span>{item.rating.toFixed(1)}</span>
                      </span>
                    )}
                  </div>

                  {/* Contrast Scrim */}
                  <div className="nv-rail-scrim" />

                  {/* Bottom Metadata */}
                  <div className="nv-rail-bottom-info">
                    <h3 className="nv-rail-title" title={item.title}>
                      {item.title}
                    </h3>
                    <div className="nv-rail-meta">
                      <span className="nv-rail-year">{item.year || "TBD"}</span>
                      {item.genres.length > 0 && (
                        <>
                          <span className="nv-rail-dot">•</span>
                          <span className="nv-rail-genres">{item.genres[0]}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
