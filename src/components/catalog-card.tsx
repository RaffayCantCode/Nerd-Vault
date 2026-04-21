"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NVLoader } from "@/components/nv-loader";
import { ResilientMediaImage } from "@/components/resilient-media-image";
import { MediaItem } from "@/lib/types";

export function CatalogCard({
  item,
  priority = false,
  onBeforeNavigate,
}: {
  item: MediaItem;
  priority?: boolean;
  onBeforeNavigate?: () => void;
}) {
  const router = useRouter();
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const href = useMemo(
    () => ({
      pathname: `/media/${item.slug}`,
      query: {
        source: item.source,
        sourceId: item.sourceId,
        type: item.type,
      },
    }),
    [item.slug, item.source, item.sourceId, item.type],
  );
  const routeHref = useMemo(
    () => `/media/${item.slug}?source=${item.source}&sourceId=${item.sourceId}&type=${item.type}`,
    [item.slug, item.source, item.sourceId, item.type],
  );

  function warmRoute() {
    router.prefetch(routeHref);
    if (typeof window !== "undefined") {
      const cover = new Image();
      cover.decoding = "async";
      cover.src = item.coverUrl;

      const backdrop = new Image();
      backdrop.decoding = "async";
      backdrop.src = item.backdropUrl;
    }
  }

  function handleNavigate(e: React.MouseEvent) {
    e.preventDefault();
    if (isNavigating) return;
    
    setIsNavigating(true);
    onBeforeNavigate?.();
    warmRoute();

    try {
      router.push(routeHref);
    } catch (error) {
      console.error("Navigation failed:", error);
      setIsNavigating(false);
    }
  }

  // Prefetch route for priority cards
  useEffect(() => {
    if (!priority) return;

    const warm = () => warmRoute();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(warm, { timeout: 1200 });
    } else {
      timeoutId = globalThis.setTimeout(warm, 220);
    }

    return () => {
      if (typeof idleId === "number" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, [priority, routeHref]);

  // IntersectionObserver: trigger stagger animation when card enters viewport
  useEffect(() => {
    if (isVisible) return;
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "80px", threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isVisible]);

  // Priority cards: immediately mark visible on mount so above-fold cards
  // don't wait for an intersection event (they're already in view).
  useEffect(() => {
    if (priority) setIsVisible(true);
  }, [priority]);

  // Reset navigation state when component unmounts or route changes
  useEffect(() => {
    return () => {
      setIsNavigating(false);
    };
  }, []);

  return (
    <Link
      ref={cardRef}
      href={href}
      title={`Open ${item.title}`}
      className={`catalog-card ${isNavigating ? "is-navigating" : ""} ${isVisible ? "is-visible" : ""} ${isImageLoaded ? "has-media-loaded" : ""}`}
      prefetch={false}
      onClick={handleNavigate}
      onMouseEnter={warmRoute}
      onFocus={warmRoute}
    >
      <ResilientMediaImage
        item={item}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onLoadStateChange={setIsImageLoaded}
      />
      <div className="catalog-sheen" />
      {isNavigating ? (
        <div className="catalog-card-loader" aria-hidden="true">
          <NVLoader compact label="Opening..." />
        </div>
      ) : null}
      <div className="catalog-copy">
        <div className="meta-row">
          <span className="pill">{item.type}</span>
          <span className="pill">{item.year}</span>
          <span className="pill rating">{item.rating.toFixed(1)}</span>
        </div>
        <h3 className="catalog-title">{item.title}</h3>
        <p className="catalog-genres">
          {(item.genres.length ? item.genres : ["More details"]).slice(0, 3).join(" \u2022 ")}
        </p>
      </div>
    </Link>
  );
}
