"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NVLoader } from "@/components/nv-loader";
import { ResilientMediaImage } from "@/components/resilient-media-image";
import { writeBrowseReturnContext, writeDetailReturnTarget } from "@/lib/detail-return";
import { optimizeMediaImageUrl } from "@/lib/media-image";
import { MediaItem } from "@/lib/types";

const BROWSE_LAST_URL_KEY = "nerdvault-browse-last-url";

function renderUserStars(rating?: number | null) {
  if (!rating) {
    return null;
  }
  return `${"\u2605".repeat(rating)}${"\u2606".repeat(Math.max(0, 5 - rating))}`;
}

export function CatalogCard({
  item,
  priority = false,
  onBeforeNavigate,
  showUserRatingBelow = true,
}: {
  item: MediaItem;
  priority?: boolean;
  onBeforeNavigate?: () => void;
  showUserRatingBelow?: boolean;
}) {
  const router = useRouter();
  const cardRef = useRef<HTMLAnchorElement>(null);
  const warmedRef = useRef(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const browseCardId = useMemo(() => `browse-card-${item.source}-${item.sourceId}`, [item.source, item.sourceId]);
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
    if (warmedRef.current || typeof window === "undefined") {
      return;
    }

    warmedRef.current = true;
    const cover = new Image();
    cover.decoding = "async";
    cover.src = optimizeMediaImageUrl(item.coverUrl, priority ? "cover" : "thumb") ?? item.coverUrl;

    if (priority) {
      const backdrop = new Image();
      backdrop.decoding = "async";
      backdrop.src = optimizeMediaImageUrl(item.backdropUrl, "backdrop") ?? item.backdropUrl;
    }
  }

  function handleNavigate(event: React.MouseEvent) {
    event.preventDefault();
    if (isNavigating) {
      return;
    }

    setIsNavigating(true);
    onBeforeNavigate?.();

    const currentHref =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(BROWSE_LAST_URL_KEY) || `${window.location.pathname}${window.location.search}`
        : undefined;

    writeDetailReturnTarget({ href: currentHref });

    if (typeof window !== "undefined") {
      writeBrowseReturnContext({
        href: currentHref || `${window.location.pathname}${window.location.search}`,
        scrollY: window.scrollY,
        cardId: browseCardId,
        cardTop: cardRef.current?.getBoundingClientRect().top ?? 0,
      });
    }

    warmRoute();
    router.push(routeHref, { scroll: false });
  }

  useEffect(() => {
    if (!priority) {
      return;
    }

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

  useEffect(() => {
    if (isVisible) {
      return;
    }

    const element = cardRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "80px", threshold: 0.05 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (priority) {
      setIsVisible(true);
    }
  }, [priority]);

  return (
    <Link
      ref={cardRef}
      href={href}
      title={`Open ${item.title}`}
      id={browseCardId}
      data-browse-card-id={browseCardId}
      className={`catalog-card hover-lift hover-bounce ${showUserRatingBelow && item.userRating ? "has-user-rating" : ""} ${isNavigating ? "is-navigating" : ""} ${isVisible ? "is-visible" : ""} ${isImageLoaded ? "has-media-loaded" : ""}`}
      prefetch={true}
      onClick={handleNavigate}
      onMouseEnter={warmRoute}
      onFocus={warmRoute}
      style={{ willChange: "transform, opacity" }}
    >
      <div className="catalog-card-media">
        <ResilientMediaImage
          item={item}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onLoadStateChange={setIsImageLoaded}
        />
        <div className="catalog-card-gradient" />
        <div className="catalog-sheen" />
        <div className="catalog-card-hover-overlay">
          <span className="catalog-card-hover-text">View Details</span>
        </div>
        {isNavigating ? (
          <div className="catalog-card-loader" aria-hidden="true">
            <NVLoader compact label="Opening..." />
          </div>
        ) : null}
      </div>

      <div className="catalog-copy">
        <div className="meta-row">
          <span className="pill">{item.type}</span>
          <span className="pill">{item.year}</span>
          <span className="pill rating">{item.rating.toFixed(1)}</span>
        </div>
        <h3 className="catalog-title">{item.title}</h3>
        {item.userRating && showUserRatingBelow ? (
          <div className="catalog-user-rating-row" aria-label={`Your rating: ${item.userRating} out of 5`}>
            <span className="catalog-user-rating-label">Your rating</span>
            <span className="catalog-user-rating-stars">{renderUserStars(item.userRating)}</span>
          </div>
        ) : null}
        {item.userReview ? (
          <p className="copy" style={{ marginTop: 10, fontSize: "0.88rem", lineHeight: 1.45, opacity: 0.84 }}>
            {item.userReview.length > 96 ? `${item.userReview.slice(0, 93).trimEnd()}...` : item.userReview}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
