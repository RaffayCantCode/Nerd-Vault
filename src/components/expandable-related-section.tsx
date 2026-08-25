"use client";

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
  const maxItems = 12;

  return (
    <section className="section-stack expandable-related-section" style={{ paddingTop: 0 }}>
      {showFranchiseSection && franchiseSection ? (
        <div className="franchise-wrapper">
          <FranchiseRelatedSection
            title={franchiseSection.title}
            summary={franchiseSection.summary}
            entries={franchiseSection.entries}
            secondaryTitle={franchiseSection.secondaryTitle}
            secondaryEntries={franchiseSection.secondaryEntries}
          />
        </div>
      ) : null}

      <div className="section-header" style={{ marginTop: showFranchiseSection ? 48 : 0 }}>
        <div>
          <p className="eyebrow">Discover</p>
          <h2 className="headline">More like this</h2>
          <p className="copy">Hand-picked titles that share the same DNA as {mediaTitle}</p>
        </div>
      </div>

      <div className="related-media-container">
        <RelatedMediaSection items={related} visibleCount={maxItems} />
      </div>

      <div className="related-actions-row modern-cta-row">
        <DetailBackButton className="modern-btn-secondary" />
      </div>
    </section>
  );
}
