"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  const [isNavigating, setIsNavigating] = useState(false);
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
  }

  function handleNavigate() {
    setIsNavigating(true);
    onBeforeNavigate?.();
    warmRoute();
  }

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

  return (
    <Link
      href={href}
      className={`catalog-card ${isNavigating ? "is-navigating" : ""}`}
      prefetch
      onClick={handleNavigate}
      onMouseEnter={warmRoute}
      onFocus={warmRoute}
      onTouchStart={warmRoute}
    >
      <ResilientMediaImage
        item={item}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
      />
      <div className="catalog-sheen" />
      <div className="catalog-copy">
        <div className="meta-row">
          <span className="pill">{item.type}</span>
          <span className="pill">{item.year}</span>
          <span className="pill">{item.rating.toFixed(1)}</span>
        </div>
        <h3 className="catalog-title">{item.title}</h3>
        <p className="catalog-overview">{item.overview}</p>
      </div>
    </Link>
  );
}
