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
  const cleaned = rawTitle
    .trim()
    .toLowerCase()
    .replace(/\s*:\s*the final season(?:\s+part\s+\d+)?$/i, "")
    .replace(/\s+the final season(?:\s+part\s+\d+)?$/i, "")
    .replace(/\s+final season(?:\s+part\s+\d+)?$/i, "")
    .replace(/\s+\d+(?:st|nd|rd|th)\s+season$/i, "")
    .replace(/\s+season\s+\d+$/i, "")
    .replace(/\s+part\s+\d+$/i, "")
    .replace(/\s+cour\s+\d+$/i, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  // For movies, be more conservative - don't remove as much
  if (type === 'movie' || cleaned.includes('movie') || cleaned.includes('film')) {
    return rawTitle
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  return cleaned;
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
  
  // For anime, be extra strict about type matching
  if (itemType === 'anime') {
    const isMovie = isAnimeMovie(itemTitle, itemEpisodes);
    
    // Don't mix movies with series
    for (const franchiseTitle of franchiseTitles) {
      const isFranchiseMovie = isAnimeMovie(franchiseTitle);
      if (isMovie !== isFranchiseMovie) {
        return false; // Different types, don't match
      }
    }
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
  const movieGroups = new Map<string, Array<{title: string; episodes?: number; type?: string; id: string; originalItem?: any; score?: number; year?: number}>>();
  const seriesGroups = new Map<string, Array<{title: string; episodes?: number; type?: string; id: string; originalItem?: any; score?: number; year?: number}>>();
  
  for (const item of items) {
    const isMovie = isAnimeMovie(item.title, item.episodes, item.type);
    const key = normalizeAnimeBaseTitle(item.title, isMovie ? 'movie' : 'series');
    
    const targetGroups = isMovie ? movieGroups : seriesGroups;
    const existing = targetGroups.get(key) || [];
    existing.push(item);
    targetGroups.set(key, existing);
  }
  
  return {
    movies: Array.from(movieGroups.entries()),
    series: Array.from(seriesGroups.entries())
  };
}
