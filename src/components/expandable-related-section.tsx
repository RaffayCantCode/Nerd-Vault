"use client";

import { useState } from "react";
import { RelatedMediaSection } from "@/components/related-media-section";
import { FranchiseRelatedSection } from "@/components/franchise-related-section";
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
  const [isExpanded, setIsExpanded] = useState(false);

  const hasContent = related.length > 0 || franchiseSection;

  if (!hasContent) {
    return null;
  }

  return (
    <section className="section-stack expandable-related-section" style={{ paddingTop: 0 }}>
      <div className="section-header">
        <div>
          <p className="eyebrow">Related</p>
          <h2 className="headline">More like {mediaTitle}</h2>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="expandable-toggle-button action-button"
          aria-expanded={isExpanded}
          aria-controls="related-content"
        >
          {isExpanded ? "Show Less" : "View More"}
          <span 
            className={`expandable-toggle-icon ${isExpanded ? "is-expanded" : ""}`}
            aria-hidden="true"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path 
                d="M4 6L8 10L12 6" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </div>

      <div 
        id="related-content"
        className={`expandable-content ${isExpanded ? "is-expanded" : "is-collapsed"}`}
        aria-hidden={!isExpanded}
      >
        {franchiseSection && (
          <div className="expandable-section">
            <FranchiseRelatedSection
              title={franchiseSection.title}
              summary={franchiseSection.summary}
              entries={franchiseSection.entries}
              secondaryTitle={franchiseSection.secondaryTitle}
              secondaryEntries={franchiseSection.secondaryEntries}
            />
          </div>
        )}

        {related.length > 0 && (
          <div className="expandable-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Similar</p>
                <h2 className="headline">More like this</h2>
              </div>
            </div>
            <RelatedMediaSection items={related} />
          </div>
        )}

        <div className="expandable-actions">
          <button
            onClick={() => setIsExpanded(false)}
            className="action-button action-button-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </section>
  );
}
