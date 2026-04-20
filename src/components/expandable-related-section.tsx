"use client";

import { useState } from "react";
import { RelatedMediaSection } from "@/components/related-media-section";
import { FranchiseRelatedSection } from "@/components/franchise-related-section";
import { MediaItem } from "@/lib/types";
import { BrowseResetLink } from "@/components/browse-reset-link";

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
  const [isExpanded, setIsExpanded] = useState(false);

  const hasContent = related.length > 0 || franchiseSection;

  if (!hasContent) {
    return null;
  }

  return (
    <section className="section-stack expandable-related-section" style={{ paddingTop: 0 }}>
      {/* Franchise Section - Always visible if it exists */}
      {franchiseSection && (
        <div className="franchise-wrapper">
          <FranchiseRelatedSection
            title={franchiseSection.title}
            summary={franchiseSection.summary}
            entries={franchiseSection.entries}
            secondaryTitle={franchiseSection.secondaryTitle}
            secondaryEntries={franchiseSection.secondaryEntries}
          />
        </div>
      )}

      {/* More Like This Header */}
      <div className="section-header" style={{ marginTop: franchiseSection ? 40 : 0 }}>
        <div>
          <p className="eyebrow">Discover</p>
          <h2 className="headline">More like this</h2>
          <p className="copy">Titles with similar genres and atmosphere to {mediaTitle}</p>
        </div>
      </div>

      {/* Similar Media - First row always visible, rest expandable */}
      <div className={`related-media-container ${isExpanded ? "is-expanded" : "is-collapsed"}`}>
        <RelatedMediaSection items={related} />
      </div>

      {/* Actions Row */}
      <div className="related-actions-row">
        <BrowseResetLink className="action-button action-button-primary">
          Back to Browse
        </BrowseResetLink>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`action-button ${isExpanded ? "action-button-secondary" : "action-button-gold"}`}
          aria-expanded={isExpanded}
        >
          {isExpanded ? "Close More" : "View More"}
          <span className={`expandable-icon ${isExpanded ? "is-rotated" : ""}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
            </svg>
          </span>
        </button>
      </div>
    </section>
  );
}
