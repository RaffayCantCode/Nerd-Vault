"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CatalogCard } from "@/components/catalog-card";
import type { MediaItem } from "@/lib/types";

const COLLAPSED_RELATED_COUNT = 12;
const BROWSE_LAST_URL_KEY = "nerdvault-browse-last-url";

export function RelatedMediaSection({
  items,
  onBeforeNavigate,
}: {
  items: MediaItem[];
  onBeforeNavigate?: () => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  if (!items.length) {
    return (
      <div className="folder-empty glass">
        <p className="headline">No close matches yet.</p>
        <p className="copy">We are still tuning the related rail for this title.</p>
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
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              const lastBrowseUrl = window.sessionStorage.getItem(BROWSE_LAST_URL_KEY) || "/browse";
              router.push(lastBrowseUrl);
            }}
          >
            Back to browse
          </button>
        </div>
      ) : (
        <div className="related-media-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              const lastBrowseUrl = window.sessionStorage.getItem(BROWSE_LAST_URL_KEY) || "/browse";
              router.push(lastBrowseUrl);
            }}
          >
            Back to browse
          </button>
        </div>
      )}
    </div>
  );
}
