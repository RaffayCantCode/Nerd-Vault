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
 * and handles sequels/spin-offs for franchise grouping
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

  // Get base franchise name by removing sequel/spin-off/season indicators
  const normalized = baseFromColon
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

  return normalized;
}

/**
 * Extracts the root franchise name for matching related series
 * This is more aggressive than normalizeAnimeBaseTitle to catch sequels like
 * "Naruto" and "Naruto Shippuden" or "Attack on Titan" and "Shingeki no Kyojin"
 */
export function extractFranchiseRoot(rawTitle: string, type?: string): string {
  const baseTitle = normalizeAnimeBaseTitle(rawTitle, type);
  const normalized = baseTitle.toLowerCase();

  // Remove common sequel/spin-off suffixes that indicate a continuation
  // but keep the root franchise name intact
  const sequelPatterns = [
    /\s+shippuden\s*$/i,              // Naruto Shippuden -> Naruto
    /\s+brotherhood\s*$/i,           // Fullmetal Alchemist Brotherhood
    /\s+the\s+animation\s*$/i,        // Various "the animation" suffixes
    /\s+\d+\s*$/i,                    // Trailing numbers like "Series 2"
    /\s+second\s+season\s*$/i,        // Explicit second season
    /\s+third\s+season\s*$/i,         // Explicit third season
    /\s+rebuild\s+of\s*$/i,           // Rebuild of Evangelion -> Evangelion
    /\s+progressive\s*$/i,            // Made in Abyss Progressive
    /\s+dawn\s+of\s+the\s+deep\s+soul\s*$/i, // Made in Abyss movies
    /\s+journeys\s+dawn\s*$/i,
    /\s+wanee\s*$/i,
    /\s+sunohara\s+so\s+no\s+.*$/i,
    /\s+so\s+no\s+.*$/i,              // "So no [character]" spin-offs
    /\s+ga\s+.*$/i,                    // "Ga [something]" spin-offs
    /\s+new\s+.*$/i,                   // "New [series]" sequels
    /\s+super\s*$/i,                   // Dragon Ball Super
    /\s+z\s*$/i,                       // Dragon Ball Z
    /\s+gt\s*$/i,                      // Dragon Ball GT
    /\s+kai\s*$/i,                     // Dragon Ball Kai
  ];

  let result = baseTitle;
  for (const pattern of sequelPatterns) {
    result = result.replace(pattern, "").trim();
  }

  // If we stripped too much and got an empty string, return the base
  if (!result || result.length < 2) {
    return baseTitle;
  }

  return result;
}

/**
 * Checks if two anime titles likely belong to the same franchise
 * Uses multiple matching strategies for better accuracy
 */
export function isSameFranchise(title1: string, title2: string, type1?: string, type2?: string): boolean {
  const norm1 = normalizeAnimeBaseTitle(title1, type1).toLowerCase();
  const norm2 = normalizeAnimeBaseTitle(title2, type2).toLowerCase();

  // Direct match after normalization
  if (norm1 === norm2) return true;

  // Check franchise root match (handles Naruto/Naruto Shippuden)
  const root1 = extractFranchiseRoot(title1, type1).toLowerCase();
  const root2 = extractFranchiseRoot(title2, type2).toLowerCase();

  if (root1 === root2 && root1.length > 2) return true;

  // One contains the other (e.g., "Naruto" and "Naruto Shippuden")
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    // Make sure it's not just a partial word match
    const longer = norm1.length > norm2.length ? norm1 : norm2;
    const shorter = norm1.length > norm2.length ? norm2 : norm1;
    // Ensure the shorter is a complete word boundary in the longer
    const regex = new RegExp(`\\b${shorter}\\b`);
    if (regex.test(longer)) return true;
  }

  // Check word overlap for titles that might be translations
  const words1 = norm1.split(/\s+/).filter(w => w.length > 2);
  const words2 = norm2.split(/\s+/).filter(w => w.length > 2);

  if (words1.length > 0 && words2.length > 0) {
    const common = words1.filter(w => words2.includes(w));
    const overlap = common.length / Math.min(words1.length, words2.length);
    // High overlap (80%+) suggests same franchise
    if (overlap >= 0.8 && common.length >= 2) return true;
  }

  return false;
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
  
  // Default to non-anime unless we have a positive signal.
  // This avoids polluting anime/franchise relationships with unrelated titles.
  return false;
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
