import { MediaItem } from "@/lib/types";

function buildFallbackDataUrl(label: string, accent: string, shadow: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1350" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#07111a" />
          <stop offset="55%" stop-color="${shadow}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="900" height="1350" fill="url(#bg)" />
      <circle cx="720" cy="190" r="220" fill="rgba(255,255,255,0.08)" />
      <circle cx="160" cy="1120" r="280" fill="rgba(255,255,255,0.05)" />
      <rect x="92" y="160" width="716" height="1030" rx="44" fill="rgba(6,9,15,0.28)" stroke="rgba(255,255,255,0.14)" />
      <text x="120" y="1050" fill="#f6f7fb" font-family="Arial, sans-serif" font-size="118" font-weight="700">${label}</text>
      <text x="124" y="1135" fill="rgba(246,247,251,0.72)" font-family="Arial, sans-serif" font-size="44">NerdVault</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getMediaFallbackImage(item: Pick<MediaItem, "type">) {
  switch (item.type) {
    case "anime":
    case "anime_movie":
      return buildFallbackDataUrl("Anime", "#8b5cf6", "#111827");
    case "game":
      return buildFallbackDataUrl("Games", "#14b8a6", "#0f172a");
    case "show":
      return buildFallbackDataUrl("Series", "#0ea5e9", "#101827");
    default:
      return buildFallbackDataUrl("Cinema", "#f59e0b", "#111827");
  }
}
