/**
 * Universal franchise matching utilities for all media types
 * Prevents random titles from passing through while maintaining good matches
 */

export function normalizeBaseTitle(rawTitle: string): string {
  return rawTitle
    .trim()
    .toLowerCase()
    .replace(/\s*:\s*the.*$/i, "")
    .replace(/\s*\d+(?:st|nd|rd|th)\s+season$/i, "")
    .replace(/\s+season\s+\d+$/i, "")
    .replace(/\s+part\s+\d+$/i, "")
    .replace(/\s+cour\s+\d+$/i, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Enhanced anime title normalization that properly separates series from movies
 */
export function normalizeAnimeBaseTitle(rawTitle: string, type?: string): string {
  const original = rawTitle.trim().toLowerCase();
  const cleaned = original
    .replace(/[^\w\s:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (type === "movie" || /\b(movie|film)\b/.test(cleaned)) {
    return cleaned.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  const colonParts = cleaned.split(/\s*:\s*/).map((part) => part.trim()).filter(Boolean);
  const baseFromColon =
    colonParts.length > 1 && !/\b(movie|film)\b/.test(colonParts[colonParts.length - 1])
      ? colonParts[0]
      : cleaned;

  return baseFromColon
    .replace(/\s*-\s*thousand year blood war(?: arc)?$/i, "")
    .replace(/\s+thousand year blood war(?: arc)?$/i, "")
    .replace(/\s+the final chapters(?:\s+special\s+\d+)?$/i, "")
    .replace(/\s+final chapters(?:\s+special\s+\d+)?$/i, "")
    .replace(/\s+the final season(?:\s+part\s+\d+)?$/i, "")
    .replace(/\s+final season(?:\s+part\s+\d+)?$/i, "")
    .replace(/\s+\d+(?:st|nd|rd|th)\s+season$/i, "")
    .replace(/\s+season\s+\d+$/i, "")
    .replace(/\s+part\s+\d+$/i, "")
    .replace(/\s+cour\s+\d+$/i, "")
    .replace(/\s+special\s+\d+$/i, "")
    .replace(/\s+(?:arc|chapter|episode)\s+\d+$/i, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getAnimeSeriesContext(rawTitle: string, type?: string) {
  const title = rawTitle.trim();
  const normalizedTitle = title.toLowerCase();
  const parentSeriesTitle = normalizeAnimeBaseTitle(title, type);
  const normalizedParent = parentSeriesTitle.toLowerCase();
  const isMovie = type === "movie" || /\b(movie|film)\b/.test(normalizedTitle);
  const isSameAsParent = normalizedTitle.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim() === normalizedParent;

  let parentSeriesLabel: string | undefined;
  if (!isSameAsParent) {
    if (/\bthousand year blood war\b/.test(normalizedTitle)) {
      parentSeriesLabel = "Arc continuation";
    } else if (/\bfinal season\b/.test(normalizedTitle)) {
      parentSeriesLabel = "Final season";
    } else if (/\bseason\b/.test(normalizedTitle)) {
      parentSeriesLabel = "Season continuation";
    } else if (/\bpart\b/.test(normalizedTitle)) {
      parentSeriesLabel = "Series continuation";
    } else if (isMovie) {
      parentSeriesLabel = "Franchise movie";
    } else {
      parentSeriesLabel = "Series continuation";
    }
  }

  return {
    parentSeriesTitle,
    parentSeriesLabel,
    isContinuation: Boolean(parentSeriesLabel),
  };
}

/**
 * Determines if content is likely anime vs live-action based on multiple indicators
 */
export function isLikelyAnime(title: string, genres?: string[], overview?: string, type?: string): boolean {
  const normalized = title.toLowerCase();
  const genreStr = genres?.join(' ').toLowerCase() || '';
  const overviewStr = overview?.toLowerCase() || '';
  
  // Explicit anime indicators
  if (type === 'anime' || normalized.includes('anime') || normalized.includes('manga')) {
    return true;
  }
  
  // Anime-specific genre indicators
  const animeGenres = ['animation', 'anime', 'sci-fi & fantasy', 'fantasy', 'adventure', 'action & adventure'];
  const hasAnimeGenre = genres?.some(g => animeGenres.some(ag => genreStr.includes(ag)));
  
  // Live-action indicators to exclude
  const liveActionIndicators = ['live action', 'action', 'thriller', 'horror', 'drama', 'comedy'];
  const hasLiveActionGenre = genres?.some(g => liveActionIndicators.some(lg => genreStr.includes(lg) && !g.includes('animation')));
  
  // Title indicators
  const animeTitleIndicators = ['dragon ball', 'naruto', 'one piece', 'attack on titan', 'demon slayer', 'my hero academia'];
  const hasAnimeTitle = animeTitleIndicators.some(indicator => normalized.includes(indicator));
  
  // Overview indicators
  const animeOverviewIndicators = ['anime', 'manga', 'japanese', 'studio'];
  const hasAnimeOverview = animeOverviewIndicators.some(indicator => overviewStr.includes(indicator));
  
  // Decision logic
  if (hasAnimeGenre && !hasLiveActionGenre) return true;
  if (hasAnimeTitle || hasAnimeOverview) return true;
  if (hasLiveActionGenre && !hasAnimeGenre) return false;
  
  // Default to anime for safety (better to include than exclude)
  return true;
}

/**
 * Determines if an anime is likely a movie vs series based on title and metadata
 */
export function isAnimeMovie(title: string, episodes?: number, type?: string): boolean {
  const normalized = title.toLowerCase();
  
  // Explicit movie indicators
  if (type === 'movie' || normalized.includes('movie') || normalized.includes('film')) {
    return true;
  }
  
  // Series indicators
  if (type === 'tv' || normalized.includes('season') || normalized.includes('cour') || 
      normalized.includes('part') || episodes && episodes > 5) {
    return false;
  }
  
  // Single episode or low episode count suggests movie
  if (episodes && episodes <= 3) {
    return true;
  }
  
  // Default to series for safety
  return false;
}

export function getTitleVariants(title: string, englishTitle?: string, originalTitle?: string): string[] {
  return Array.from(
    new Set([
      title,
      englishTitle ?? "",
      originalTitle ?? "",
    ].map(t => t.trim()).filter(Boolean))
  );
}

export function matchesFranchise(
  itemTitle: string,
  itemEnglishTitle?: string,
  itemOriginalTitle?: string,
  franchiseTitles: string[] = [],
  itemType?: string,
  itemEpisodes?: number
): boolean {
  const itemVariants = getTitleVariants(itemTitle, itemEnglishTitle, itemOriginalTitle);
  const franchiseKeys = new Set(franchiseTitles.map(title => normalizeBaseTitle(title)));
  
  // Check for exact normalized title matches
  const exactMatches = itemVariants.some((title) => 
    franchiseKeys.has(normalizeBaseTitle(title))
  );
  
  if (exactMatches) {
    return true;
  }
  
  // For anime, allow movies and series to be grouped together
  // This allows franchises like Chainsaw Man to show both movie and series
  if (itemType === 'anime') {
    // Skip strict type checking for anime - allow movies and series to match
    // This improves franchise discovery for mixed anime content
  }
  
  // For partial matches, be much more strict - require significant overlap
  const itemNormalizedTitles = itemVariants.map(title => normalizeBaseTitle(title));
  
  for (const franchiseKey of franchiseKeys) {
    for (const itemTitle of itemNormalizedTitles) {
      // Only match if there's significant word overlap (not just single words)
      const franchiseWords = franchiseKey.split(/\s+/).filter(w => w.length > 2);
      const itemWords = itemTitle.split(/\s+/).filter(w => w.length > 2);
      
      if (franchiseWords.length === 0 || itemWords.length === 0) {
        continue;
      }
      
      // Require at least 70% word overlap for partial matches (stricter)
      const commonWords = franchiseWords.filter(word => itemWords.includes(word));
      const overlapRatio = commonWords.length / Math.min(franchiseWords.length, itemWords.length);
      
      // Also require the first word to match (prevents unrelated titles with similar words)
      const firstWordMatches = franchiseWords[0] === itemWords[0];
      
      if (overlapRatio >= 0.7 && commonWords.length >= 2 && firstWordMatches) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Enhanced anime franchise grouping that respects type separation
 */
export function groupAnimeByFranchise(items: Array<{title: string; episodes?: number; type?: string; id: string; originalItem?: any; score?: number; year?: number}>) {
  const franchiseGroups = new Map<string, Array<{title: string; episodes?: number; type?: string; id: string; originalItem?: any; score?: number; year?: number}>>();
  
  for (const item of items) {
    // Use unified franchise key for both movies and series
    const key = normalizeAnimeBaseTitle(item.title);
    
    const existing = franchiseGroups.get(key) || [];
    existing.push(item);
    franchiseGroups.set(key, existing);
  }
  
  return {
    franchises: Array.from(franchiseGroups.entries())
  };
}
