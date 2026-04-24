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
  const fallbackPalette = useMemo(() => {
    const seed = `${media.source}-${media.sourceId}-${media.title}`;
    return generatePalette(seed);
  }, [media.source, media.sourceId, media.title]);

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function toHex(value: number) {
    return Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");
  }

  function rgbToHex(red: number, green: number, blue: number) {
    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
  }

  function rgbToHsl(red: number, green: number, blue: number) {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue = 0;
    let saturation = 0;
    const lightness = (max + min) / 2;

    if (max !== min) {
      const delta = max - min;
      saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

      switch (max) {
        case r:
          hue = (g - b) / delta + (g < b ? 6 : 0);
          break;
        case g:
          hue = (b - r) / delta + 2;
          break;
        default:
          hue = (r - g) / delta + 4;
          break;
      }

      hue /= 6;
    }

    return { h: hue, s: saturation, l: lightness };
  }

  function hueToRgb(p: number, q: number, t: number) {
    let normalized = t;
    if (normalized < 0) normalized += 1;
    if (normalized > 1) normalized -= 1;
    if (normalized < 1 / 6) return p + (q - p) * 6 * normalized;
    if (normalized < 1 / 2) return q;
    if (normalized < 2 / 3) return p + (q - p) * (2 / 3 - normalized) * 6;
    return p;
  }

  function hslToHex(hue: number, saturation: number, lightness: number) {
    const h = ((hue % 1) + 1) % 1;
    const s = clamp(saturation, 0, 1);
    const l = clamp(lightness, 0, 1);

    if (s === 0) {
      const channel = l * 255;
      return rgbToHex(channel, channel, channel);
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const red = hueToRgb(p, q, h + 1 / 3) * 255;
    const green = hueToRgb(p, q, h) * 255;
    const blue = hueToRgb(p, q, h - 1 / 3) * 255;
    return rgbToHex(red, green, blue);
  }

  function buildPaletteFromSample(red: number, green: number, blue: number) {
    const { h, s, l } = rgbToHsl(red, green, blue);
    const baseSaturation = clamp(s, 0.28, 0.62);
    const baseLightness = clamp(l, 0.34, 0.52);

    return {
      primary: hslToHex(h, baseSaturation, baseLightness),
      secondary: hslToHex(h + 0.08, clamp(baseSaturation * 0.92, 0.24, 0.56), clamp(baseLightness + 0.06, 0.38, 0.58)),
      accent: hslToHex(h - 0.06, clamp(baseSaturation + 0.14, 0.32, 0.78), clamp(baseLightness + 0.16, 0.48, 0.7)),
      background: `linear-gradient(135deg, ${hslToHex(h, clamp(baseSaturation * 0.82, 0.2, 0.5), 0.18)} 0%, ${hslToHex(h + 0.07, clamp(baseSaturation * 0.9, 0.22, 0.54), 0.12)} 100%)`,
      surface: `color-mix(in srgb, ${hslToHex(h, clamp(baseSaturation * 0.7, 0.18, 0.42), 0.22)} 18%, rgba(8, 11, 17, 0.82))`,
      text: "#F8FBFF",
      muted: "rgba(235, 241, 255, 0.72)",
      gradient: `linear-gradient(135deg, ${hslToHex(h, baseSaturation, baseLightness)} 0%, ${hslToHex(h + 0.12, clamp(baseSaturation + 0.08, 0.3, 0.7), clamp(baseLightness + 0.08, 0.44, 0.66))} 100%)`,
      name: "Image-driven",
    } satisfies ColorPalette;
  }

  async function extractPaletteFromImage(url: string) {
    if (!url || typeof window === "undefined") {
      return null;
    }

    return new Promise<ColorPalette | null>((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 18;
          canvas.height = 18;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) {
            resolve(null);
            return;
          }

          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
          let redTotal = 0;
          let greenTotal = 0;
          let blueTotal = 0;
          let sampleCount = 0;

          for (let index = 0; index < data.length; index += 4) {
            const alpha = data[index + 3] / 255;
            if (alpha < 0.6) continue;
            const red = data[index];
            const green = data[index + 1];
            const blue = data[index + 2];
            const brightness = (red + green + blue) / 3;
            if (brightness < 20 || brightness > 238) continue;

            redTotal += red;
            greenTotal += green;
            blueTotal += blue;
            sampleCount += 1;
          }

          if (!sampleCount) {
            resolve(null);
            return;
          }

          resolve(buildPaletteFromSample(redTotal / sampleCount, greenTotal / sampleCount, blueTotal / sampleCount));
        } catch {
          resolve(null);
        }
      };
      image.onerror = () => resolve(null);
      image.src = url;
    });
  }

  useEffect(() => {
    setPalette(fallbackPalette);
    setCssVariables(paletteToCSSVariables(fallbackPalette));
  }, [fallbackPalette]);

  useEffect(() => {
    let isActive = true;

    async function hydratePalette() {
      const paletteSources = [
        media.backdropUrl,
        media.coverUrl,
        ...(media.screenshots ?? []).slice(0, 1),
      ].filter(Boolean) as string[];

      for (const source of paletteSources) {
        const extracted = await extractPaletteFromImage(source);
        if (extracted && isActive) {
          setPalette(extracted);
          setCssVariables(paletteToCSSVariables(extracted));
          return;
        }
      }
    }

    void hydratePalette();
    return () => {
      isActive = false;
    };
  }, [fallbackPalette, media.backdropUrl, media.coverUrl, media.screenshots]);

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
