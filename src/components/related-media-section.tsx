"use client";

import { useMemo } from "react";
import { CatalogCard } from "@/components/catalog-card";
import type { MediaItem } from "@/lib/types";

export function RelatedMediaSection({
  items,
  visibleCount,
  onBeforeNavigate,
  highlightedFromIndex,
}: {
  items: MediaItem[];
  visibleCount?: number;
  onBeforeNavigate?: () => void;
  highlightedFromIndex?: number | null;
}) {
  const visibleItems = useMemo(
    () => (typeof visibleCount === "number" ? items.slice(0, visibleCount) : items),
    [items, visibleCount],
  );

  return (
    <div className="related-media-section">
      <div className="catalog-grid">
        {visibleItems.map((item, index) => (
          <div
            key={item.id}
            data-related-index={index}
            className={`related-media-slot ${highlightedFromIndex !== null && highlightedFromIndex !== undefined && index >= highlightedFromIndex ? "is-newly-revealed" : ""}`}
          >
            <CatalogCard item={item} priority={index < 8} onBeforeNavigate={onBeforeNavigate} />
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="related-media-empty">
          <p className="copy">No similar titles found for this entry.</p>
        </div>
      )}
    </div>
  );
}
