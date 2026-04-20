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
  const [isLoading, setIsLoading] = useState(false);

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
  const remainingCount = items.length - visibleItems.length;

  const handleToggle = () => {
    if (expanded) {
      // Collapse immediately
      setExpanded(false);
    } else {
      // Show loading state for better UX
      setIsLoading(true);
      // Simulate loading for smooth transition
      setTimeout(() => {
        setExpanded(true);
        setIsLoading(false);
      }, 300);
    }
  };

  return (
    <div className="related-media-section">
      <div className="catalog-grid">
        {visibleItems.map((item, index) => (
          <CatalogCard key={item.id} item={item} priority={index < 8} onBeforeNavigate={onBeforeNavigate} />
        ))}
      </div>

      {canToggle && (
        <div className="related-media-actions">
          <button 
            type="button" 
            className={`button button-secondary ${isLoading ? 'loading' : ''}`} 
            onClick={handleToggle}
            disabled={isLoading}
          >
            {isLoading ? (
              <span>Loading more related titles...</span>
            ) : expanded ? (
              <span>Show less related</span>
            ) : (
              <span>View {remainingCount} more related title{remainingCount !== 1 ? 's' : ''}</span>
            )}
          </button>
        </div>
      )}

      {!canToggle && items.length > 0 && (
        <div className="related-media-actions">
          <p className="copy">That's all the related titles we found for this entry.</p>
        </div>
      )}

      <div className="related-media-back-row">
        <DetailBackButton />
      </div>
    </div>
  );
}
