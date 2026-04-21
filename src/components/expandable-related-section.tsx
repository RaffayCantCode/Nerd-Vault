"use client";

import { useEffect, useMemo, useState } from "react";
import { RelatedMediaSection } from "@/components/related-media-section";
import { FranchiseRelatedSection } from "@/components/franchise-related-section";
import { DetailBackButton } from "@/components/detail-back-button";
import { MediaItem } from "@/lib/types";

// Import the FranchiseSectionData type from the media page
type FranchiseSectionData = {
  title: string;
  summary: string;
  entries: Array<{
    id: string;
    title: string;
    meta: string;
    href: {
      pathname: string;
      query: {
        source: string;
        sourceId: string;
        type: string;
      };
    };
    badge?: string;
    isActive?: boolean;
  }>;
  secondaryTitle?: string;
  secondaryEntries?: Array<{
    id: string;
    title: string;
    meta: string;
    href: {
      pathname: string;
      query: {
        source: string;
        sourceId: string;
        type: string;
      };
    };
    badge?: string;
    isActive?: boolean;
  }>;
};

interface ExpandableRelatedSectionProps {
  related: MediaItem[];
  franchiseSection?: FranchiseSectionData;
  mediaTitle: string;
}

export function ExpandableRelatedSection({ 
  related, 
  franchiseSection, 
  mediaTitle 
}: ExpandableRelatedSectionProps) {
  const [cardsPerRow, setCardsPerRow] = useState(4);
  const [visibleRows, setVisibleRows] = useState(2);

  useEffect(() => {
    function syncCardsPerRow() {
      if (window.innerWidth < 480) {
        setCardsPerRow(1);
        return;
      }

      if (window.innerWidth < 900) {
        setCardsPerRow(2);
        return;
      }

      if (window.innerWidth < 1200) {
        setCardsPerRow(3);
        return;
      }

      setCardsPerRow(4);
    }

    syncCardsPerRow();
    window.addEventListener("resize", syncCardsPerRow);
    return () => window.removeEventListener("resize", syncCardsPerRow);
  }, []);

  useEffect(() => {
    setVisibleRows(2);
  }, [cardsPerRow, related.length]);

  const visibleCount = useMemo(() => cardsPerRow * visibleRows, [cardsPerRow, visibleRows]);
  const hasMore = related.length > visibleCount;

  return (
    <section className="section-stack expandable-related-section" style={{ paddingTop: 0 }}>
      {/* Franchise Section */}
      <div className="franchise-wrapper">
        {franchiseSection ? (
          <FranchiseRelatedSection
            title={franchiseSection.title}
            summary={franchiseSection.summary}
            entries={franchiseSection.entries}
            secondaryTitle={franchiseSection.secondaryTitle}
            secondaryEntries={franchiseSection.secondaryEntries}
          />
        ) : (
          <div className="section-header">
            <div>
              <p className="eyebrow">Franchise</p>
              <h2 className="headline" style={{ opacity: 0.5 }}>Not a part of any franchise</h2>
              <p className="copy">This title is a standalone entry in our vault.</p>
            </div>
          </div>
        )}
      </div>

      {/* More Like This Header */}
      <div className="section-header" style={{ marginTop: 60 }}>
        <div>
          <p className="eyebrow">Discover</p>
          <h2 className="headline">More like this</h2>
          <p className="copy">Hand-picked titles that share the same DNA as {mediaTitle}</p>
        </div>
      </div>

      {/* Similar Media - Expandable Grid */}
      <div className="related-media-container">
        <RelatedMediaSection items={related} visibleCount={visibleCount} />
      </div>

      {/* Actions Row */}
      <div className="related-actions-row">
        <DetailBackButton className="action-button action-button-secondary" />
        
        {hasMore ? (
          <button
            onClick={() => setVisibleRows((current) => current + 2)}
            className="action-button action-button-gold"
          >
            View More
            <span className="expandable-count">+{Math.min(cardsPerRow * 2, related.length - visibleCount)}</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
