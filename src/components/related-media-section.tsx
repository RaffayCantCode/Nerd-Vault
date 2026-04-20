"use client";

import { CatalogCard } from "@/components/catalog-card";
import type { MediaItem } from "@/lib/types";

export function RelatedMediaSection({
  items,
  onBeforeNavigate,
}: {
  items: MediaItem[];
  onBeforeNavigate?: () => void;
}) {

  return (
    <div className="related-media-section">
      <div className="catalog-grid">
        {items.map((item, index) => (
          <CatalogCard key={item.id} item={item} priority={index < 8} onBeforeNavigate={onBeforeNavigate} />
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
