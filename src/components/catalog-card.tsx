"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NVLoader } from "@/components/nv-loader";
import { ResilientMediaImage } from "@/components/resilient-media-image";
import { writeBrowseReturnContext, writeDetailReturnTarget } from "@/lib/detail-return";
import { optimizeMediaImageUrl } from "@/lib/media-image";
import { observeCard } from "@/lib/shared-observer";
import { MediaItem } from "@/lib/types";

const BROWSE_LAST_URL_KEY = "nerdvault-browse-last-url";
const warmedCardThumbs = new Set<string>();

function warmImage(url: string) {
  if (warmedCardThumbs.has(url)) {
    return;
  }

  warmedCardThumbs.add(url);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
}

function getDetailRouteType(item: Pick<MediaItem, "source" | "type">) {
  if (item.source !== "tmdb") {
    return item.type;
  }

  if (item.type === "anime_movie") {
    return "movie";
  }

  if (item.type === "anime") {
    return "show";
  }

  return item.type;
}

function formatMediaTypeLabel(type: string) {
  if (type === "anime_movie") return "Anime Movie";
  if (type === "anime") return "Anime";
  if (type === "game") return "Game";
  if (type === "show") return "Show";
  return "Movie";
}

function renderUserStars(rating?: number | null) {
  if (!rating) {
    return null;
  }
  return `${"\u2605".repeat(rating)}${"\u2606".repeat(Math.max(0, 5 - rating))}`;
}

export const CatalogCard = memo(function CatalogCard({
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
  const [isNavigating, setIsNavigating] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const browseCardId = useMemo(() => `browse-card-${item.source}-${item.sourceId}`, [item.source, item.sourceId]);
  const detailRouteType = useMemo(() => getDetailRouteType(item), [item]);
  const href = useMemo(
    () => ({
      pathname: `/media/${item.slug}`,
      query: {
        source: item.source,
        sourceId: item.sourceId,
        type: detailRouteType,
      },
    }),
    [detailRouteType, item.slug, item.source, item.sourceId],
  );
  const routeHref = useMemo(
    () => `/media/${item.slug}?source=${item.source}&sourceId=${item.sourceId}&type=${detailRouteType}`,
    [detailRouteType, item.slug, item.source, item.sourceId],
  );

  const warmRoute = useCallback(function warmRoute() {
    if (warmedCardThumbs.has(item.coverUrl || "")) return;
    if (item.coverUrl) warmedCardThumbs.add(item.coverUrl);

    const coverUrl = optimizeMediaImageUrl(item.coverUrl, "cover");
    if (coverUrl) warmImage(coverUrl);
    const backdropUrl = optimizeMediaImageUrl(item.backdropUrl, "cover");
    if (backdropUrl) warmImage(backdropUrl);
  }, [item.coverUrl, item.backdropUrl]);

  const handleNavigate = useCallback(function handleNavigate(event: React.MouseEvent) {
    if (isNavigating) {
      return;
    }
    
    setIsNavigating(true);
    onBeforeNavigate?.();

    const currentPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}${window.location.hash}`
        : undefined;
    const isBrowseRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/browse");
    const currentHref =
      typeof window !== "undefined"
        ? isBrowseRoute
          ? window.sessionStorage.getItem(BROWSE_LAST_URL_KEY) || currentPath
          : currentPath
        : undefined;

    writeDetailReturnTarget({ href: currentHref });

    if (typeof window !== "undefined" && isBrowseRoute) {
      writeBrowseReturnContext({
        href: currentHref || currentPath || `${window.location.pathname}${window.location.search}`,
        scrollY: window.scrollY,
        cardId: browseCardId,
        cardTop: cardRef.current?.getBoundingClientRect().top ?? 0,
      });
    }

    warmRoute();
  }, [isNavigating, onBeforeNavigate, browseCardId, routeHref, router, warmRoute]);

  useEffect(() => {
    if (isVisible) return;
    if (priority) {
      setIsVisible(true);
      return;
    }

    const element = cardRef.current;
    if (!element) return;

    return observeCard(element, (intersecting) => {
      if (intersecting) {
        setIsVisible(true);
      }
    });
  }, [isVisible, priority]);

  return (
    <Link
      ref={cardRef}
      href={href}
      title={`Open ${item.title}`}
      id={browseCardId}
      data-browse-card-id={browseCardId}
      data-media-type={item.type}
      data-media-source={item.source}
      className={`catalog-card nv-poster-card ${showUserRatingBelow && item.userRating ? "has-user-rating" : ""} ${isNavigating ? "is-navigating" : ""} ${isVisible ? "is-visible" : ""} ${isImageLoaded ? "has-media-loaded" : "is-media-pending"}`}
      prefetch={false}
      onClick={handleNavigate}
      onMouseEnter={warmRoute}
      onFocus={warmRoute}
    >
      <div className="catalog-card-media">
        {!isImageLoaded && (
          <div className="catalog-card-skeleton" aria-hidden="true">
            <div className="skeleton-shimmer" />
          </div>
        )}
        {isVisible && (
          <ResilientMediaImage
            item={item}
            displayIntent="thumb"
            upgradeIntent="cover"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            onLoadStateChange={setIsImageLoaded}
          />
        )}

        {/* Top Badges Overlaid on Poster */}
        <div className="catalog-poster-topbar">
          <span className="catalog-type-pill-minimal">
            {formatMediaTypeLabel(item.type)}
          </span>
          {item.rating > 0 && (
            <span className="catalog-rating-pill-minimal">
              <span className="star-icon">★</span>
              <span>{item.rating.toFixed(1)}</span>
            </span>
          )}
        </div>

        {/* Smooth contrast vignette for text legibility */}
        <div className="catalog-poster-scrim" />

        {/* Bottom Details Overlaid on Poster */}
        <div className="catalog-poster-bottom">
          <h3 className="catalog-poster-title" title={item.title}>
            {item.title}
          </h3>
          <div className="catalog-poster-meta">
            <span className="catalog-poster-year">{item.year || "TBD"}</span>
            {item.genres.length > 0 && (
              <>
                <span className="catalog-poster-dot">•</span>
                <span className="catalog-poster-genre">{item.genres[0]}</span>
              </>
            )}
          </div>

          {item.userRating && showUserRatingBelow ? (
            <div className="catalog-poster-user-rating" aria-label={`Your rating: ${item.userRating} out of 5`}>
              <span className="user-rating-label">You</span>
              <span className="user-rating-stars">{renderUserStars(item.userRating)}</span>
            </div>
          ) : null}

          {item.userReview ? (
            <p className="catalog-poster-review">
              {item.userReview.length > 70 ? `${item.userReview.slice(0, 67).trimEnd()}...` : item.userReview}
            </p>
          ) : null}
        </div>

        {isNavigating ? (
          <div className="catalog-card-nav-indicator" aria-hidden="true">
            <div className="catalog-nav-bar-progress" />
          </div>
        ) : null}
      </div>
    </Link>
  );
});

