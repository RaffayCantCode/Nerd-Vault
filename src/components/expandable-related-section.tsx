"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RelatedMediaSection } from "@/components/related-media-section";
import { FranchiseRelatedSection } from "@/components/franchise-related-section";
import { DetailBackButton } from "@/components/detail-back-button";
import { MediaItem } from "@/lib/types";

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
    canOpen?: boolean;
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
    canOpen?: boolean;
  }>;
};

interface ExpandableRelatedSectionProps {
  related: MediaItem[];
  franchiseSection?: FranchiseSectionData;
  mediaTitle: string;
  showFranchiseSection?: boolean;
}

export function ExpandableRelatedSection({
  related,
  franchiseSection,
  mediaTitle,
  showFranchiseSection = true,
}: ExpandableRelatedSectionProps) {
  const [cardsPerRow, setCardsPerRow] = useState(4);
  const [visibleRows, setVisibleRows] = useState(2);
  const [highlightedFromIndex, setHighlightedFromIndex] = useState<number | null>(null);
  const initialRows = 2;
  const additionalRowsPerExpand = 1;
  const relatedContainerRef = useRef<HTMLDivElement | null>(null);
  const previousVisibleCountRef = useRef(cardsPerRow * initialRows);

  useEffect(() => {
    function syncCardsPerRow() {
      if (window.innerWidth < 640) {
        setCardsPerRow(2);
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

      if (window.innerWidth >= 1700) {
        setCardsPerRow(5);
        return;
      }

      setCardsPerRow(4);
    }

    syncCardsPerRow();
    window.addEventListener("resize", syncCardsPerRow);
    return () => window.removeEventListener("resize", syncCardsPerRow);
  }, []);

  useEffect(() => {
    setVisibleRows(initialRows);
    setHighlightedFromIndex(null);
  }, [cardsPerRow, related.length]);

  const visibleCount = useMemo(() => cardsPerRow * visibleRows, [cardsPerRow, visibleRows]);
  const hasMore = related.length > visibleCount;
  const canCollapse = visibleRows > initialRows;

  useEffect(() => {
    const previousVisibleCount = previousVisibleCountRef.current;

    if (visibleCount > previousVisibleCount && relatedContainerRef.current) {
      setHighlightedFromIndex(previousVisibleCount);

      const target = relatedContainerRef.current.querySelector<HTMLElement>(`[data-related-index="${previousVisibleCount}"]`);
      if (target) {
        window.setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        }, 90);
      }

      const timeout = window.setTimeout(() => setHighlightedFromIndex(null), 1200);
      previousVisibleCountRef.current = visibleCount;
      return () => window.clearTimeout(timeout);
    }

    previousVisibleCountRef.current = visibleCount;
    return;
  }, [visibleCount]);

  function handleExpand() {
    setVisibleRows((current) => current + additionalRowsPerExpand);
  }

  function handleCollapse() {
    setVisibleRows(initialRows);
    setHighlightedFromIndex(null);
    window.setTimeout(() => {
      relatedContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  return (
    <section className="section-stack expandable-related-section" style={{ paddingTop: 0 }}>
      {showFranchiseSection ? (
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
                <h2 className="headline" style={{ opacity: 0.7 }}>
                  Standalone title
                </h2>
                <p className="copy">
                  This is a standalone title.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="section-header" style={{ marginTop: showFranchiseSection ? 60 : 0 }}>
        <div>
          <p className="eyebrow">Discover</p>
          <h2 className="headline">More like this</h2>
          <p className="copy">Hand-picked titles that share the same DNA as {mediaTitle}</p>
        </div>
      </div>

      <div className="related-media-headline">
        <p className="copy">
          Showing {Math.min(visibleCount, related.length)} of {related.length} recommendations.
        </p>
      </div>

      <div ref={relatedContainerRef} className="related-media-container">
        <RelatedMediaSection items={related} visibleCount={visibleCount} highlightedFromIndex={highlightedFromIndex} />
      </div>

      <div className="related-actions-row">
        <DetailBackButton className="action-button action-button-secondary" />

        <div className="related-expand-actions">
          {canCollapse ? (
            <button type="button" onClick={handleCollapse} className="action-button action-button-secondary">
              Show Less
            </button>
          ) : null}

          {hasMore ? (
            <button type="button" onClick={handleExpand} className="action-button action-button-gold">
              View More
              <span className="expandable-count">+{Math.min(cardsPerRow * additionalRowsPerExpand, related.length - visibleCount)}</span>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
