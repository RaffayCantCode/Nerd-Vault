"use client";

import { useEffect, useMemo, useState } from "react";
import { generatePalette, paletteToCSSVariables, ColorPalette } from "@/lib/color-palettes";
import { MediaItem } from "@/lib/types";

interface PremiumMediaDetailsProps {
  media: MediaItem;
  children: React.ReactNode;
}

export function PremiumMediaDetails({ media, children }: PremiumMediaDetailsProps) {
  const [palette, setPalette] = useState<ColorPalette | null>(null);
  const [cssVariables, setCssVariables] = useState<string>("");

  // Generate a deterministic palette based on media ID and title
  useEffect(() => {
    const seed = `${media.source}-${media.sourceId}-${media.title}`;
    const generatedPalette = generatePalette(seed);
    setPalette(generatedPalette);
    setCssVariables(paletteToCSSVariables(generatedPalette));
  }, [media.source, media.sourceId, media.title]);

  // Apply CSS variables to the document root
  useEffect(() => {
    if (!cssVariables) return;

    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .media-details-${media.source}-${media.sourceId} {
        ${cssVariables}
      }
      
      .media-details-${media.source}-${media.sourceId} .media-header {
        background: var(--palette-gradient);
        position: relative;
        overflow: hidden;
      }
      
      .media-details-${media.source}-${media.sourceId} .media-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(180deg, transparent 0%, rgba(6, 9, 17, 0.8) 60%, rgba(6, 9, 17, 0.95) 100%);
        z-index: 1;
      }
      
      .media-details-${media.source}-${media.sourceId} .media-header-content {
        position: relative;
        z-index: 2;
      }
      
      .media-details-${media.source}-${media.sourceId} .media-title {
        color: var(--palette-text);
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      
      .media-details-${media.source}-${media.sourceId} .media-meta {
        color: var(--palette-muted);
      }
      
      .media-details-${media.source}-${media.sourceId} .media-accent {
        color: var(--palette-accent);
      }
      
      .media-details-${media.source}-${media.sourceId} .media-surface {
        background: var(--palette-surface);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        backdrop-filter: blur(20px);
      }
      
      .media-details-${media.source}-${media.sourceId} .action-button {
        background: var(--palette-primary);
        color: #ffffff;
        border: none;
        border-radius: 12px;
        padding: 0.75rem 1.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .media-details-${media.source}-${media.sourceId} .action-button:hover {
        background: var(--palette-secondary);
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      }
      
      .media-details-${media.source}-${media.sourceId} .genre-badge {
        background: rgba(255, 255, 255, 0.15);
        color: var(--palette-text);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        font-weight: 500;
      }
      
      .media-details-${media.source}-${media.sourceId} .rating-display {
        background: var(--palette-accent);
        color: #ffffff;
        border-radius: 12px;
        padding: 0.5rem 1rem;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .media-details-${media.source}-${media.sourceId} .section-title {
        color: var(--palette-primary);
        font-weight: 700;
        margin-bottom: 1rem;
      }
    `;
    
    document.head.appendChild(styleElement);
    
    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, [cssVariables, media.source, media.sourceId]);

  if (!palette) {
    return <div className="media-details-loading">Loading...</div>;
  }

  return (
    <div className={`media-details-${media.source}-${media.sourceId}`}>
      {children}
    </div>
  );
}
