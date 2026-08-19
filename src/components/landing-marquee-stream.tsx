"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ResilientMediaImage } from "@/components/resilient-media-image";
import { MediaItem } from "@/lib/types";

function formatMediaTypeLabel(type: string) {
  if (type === "anime_movie") return "Anime Movie";
  if (type === "anime") return "Anime";
  if (type === "game") return "Game";
  if (type === "show") return "Show";
  return "Movie";
}

function StreamCard({ item }: { item: MediaItem }) {
  return (
    <Link
      href={`/media/${item.slug}?source=${item.source}&sourceId=${item.sourceId}&type=${item.type}`}
      className="nv-stream-card"
      title={`Open ${item.title}`}
    >
      <div className="nv-stream-poster-wrap">
        <ResilientMediaImage
          item={item}
          displayIntent="thumb"
          upgradeIntent="cover"
          loading="lazy"
          decoding="async"
        />

        {/* Top Badges */}
        <div className="nv-stream-topbar">
          <span className="nv-stream-type-pill">
            {formatMediaTypeLabel(item.type)}
          </span>
          {item.rating > 0 && (
            <span className="nv-stream-rating-pill">
              <span className="star-icon">★</span>
              <span>{item.rating.toFixed(1)}</span>
            </span>
          )}
        </div>

        {/* Cinematic Vignette Overlay */}
        <div className="nv-stream-scrim" />

        {/* Bottom Details Overlaid */}
        <div className="nv-stream-bottom">
          <h4 className="nv-stream-title" title={item.title}>
            {item.title}
          </h4>
          <div className="nv-stream-meta">
            <span className="nv-stream-year">{item.year || "TBD"}</span>
            {item.genres.length > 0 && (
              <>
                <span className="nv-stream-dot">•</span>
                <span className="nv-stream-genre">{item.genres[0]}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function LandingMarqueeStream({
  lane1Items,
  lane2Items,
}: {
  lane1Items: MediaItem[];
  lane2Items: MediaItem[];
}) {
  const [isPaused, setIsPaused] = useState(false);
  const lane1Ref = useRef<HTMLDivElement>(null);
  const lane2Ref = useRef<HTMLDivElement>(null);
  const pos1Ref = useRef(0);
  const pos2Ref = useRef(0);

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const speed = 42; // pixels per second

    function step(now: number) {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (!isPaused) {
        // Update Lane 1 (moves left)
        if (lane1Ref.current) {
          const trackWidth = lane1Ref.current.scrollWidth / 2;
          if (trackWidth > 0) {
            pos1Ref.current += speed * delta;
            if (pos1Ref.current >= trackWidth) {
              pos1Ref.current = pos1Ref.current % trackWidth;
            }
            lane1Ref.current.style.transform = `translate3d(${-pos1Ref.current}px, 0, 0)`;
          }
        }

        // Update Lane 2 (moves right)
        if (lane2Ref.current) {
          const trackWidth = lane2Ref.current.scrollWidth / 2;
          if (trackWidth > 0) {
            pos2Ref.current -= speed * delta;
            if (pos2Ref.current <= -trackWidth) {
              pos2Ref.current = pos2Ref.current % trackWidth;
            }
            lane2Ref.current.style.transform = `translate3d(${pos2Ref.current}px, 0, 0)`;
          }
        }
      }

      animId = requestAnimationFrame(step);
    }

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isPaused]);

  // Duplicate items to make the track seamlessly infinite
  const duplicatedLane1 = [...lane1Items, ...lane1Items];
  const duplicatedLane2 = [...lane2Items, ...lane2Items];

  return (
    <section
      className="nv-marquee-showcase-section"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="nv-marquee-header-strip">
        <div className="nv-marquee-live-indicator">
          <span className="nv-live-pulse-dot" />
          <span className="eyebrow" style={{ color: "var(--accent)", margin: 0 }}>
            Trending Media Streams · Hover to Pause &amp; Inspect
          </span>
        </div>
      </div>

      {/* Lane 1: Moving Left (Movies & Anime) */}
      <div className="nv-marquee-lane-shell">
        <div className="nv-marquee-fade-left" aria-hidden="true" />
        <div className="nv-marquee-fade-right" aria-hidden="true" />

        <div ref={lane1Ref} className="nv-marquee-js-track">
          {duplicatedLane1.map((item, index) => (
            <StreamCard key={`mq1-${item.id}-${index}`} item={item} />
          ))}
        </div>
      </div>

      {/* Lane 2: Moving Right (TV Shows & Games) */}
      <div className="nv-marquee-lane-shell" style={{ marginTop: "1rem" }}>
        <div className="nv-marquee-fade-left" aria-hidden="true" />
        <div className="nv-marquee-fade-right" aria-hidden="true" />

        <div ref={lane2Ref} className="nv-marquee-js-track">
          {duplicatedLane2.map((item, index) => (
            <StreamCard key={`mq2-${item.id}-${index}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
