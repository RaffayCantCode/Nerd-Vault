"use client";

import { useState } from "react";

import { CatalogCard } from "@/components/catalog-card";
import { DetailBackButton } from "@/components/detail-back-button";
import type { MediaItem } from "@/lib/types";

const COLLAPSED_RELATED_COUNT = 12;

export function RelatedMediaSection({
  items,
  onBeforeNavigate,
}: {
  items: MediaItem[];
  onBeforeNavigate?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!items.length) {
    return (
      <div className="folder-empty glass">
        <p className="headline">No related titles found.</p>
        <p className="copy">This entry does not have a strong enough related match right now, so we are leaving the rail empty instead of filling it with bad guesses.</p>
        <div className="related-media-actions">
          <DetailBackButton />
        </div>
      </div>
    );
  }

  const canToggle = items.length > COLLAPSED_RELATED_COUNT;
  const visibleItems = expanded ? items : items.slice(0, COLLAPSED_RELATED_COUNT);

  return (
    <div className="related-media-section">
      <div className="catalog-grid">
        {visibleItems.map((item, index) => (
          <CatalogCard key={item.id} item={item} priority={index < 8} onBeforeNavigate={onBeforeNavigate} />
        ))}
      </div>

      {canToggle ? (
        <div className="related-media-actions">
          <button type="button" className="button button-secondary" onClick={() => setExpanded((current) => !current)}>
            {expanded ? "Show less" : "Show more"}
          </button>
          <DetailBackButton />
        </div>
      ) : (
        <div className="related-media-actions">
          <DetailBackButton />
        </div>
      )}
    </div>
  );
}
