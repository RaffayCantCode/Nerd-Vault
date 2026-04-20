import { MediaItem } from "@/lib/types";

function normalizePart(input?: string | null) {
  return (input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactAlphaNum(input: string) {
  return normalizePart(input).replace(/\s+/g, "");
}

function tokenize(input: string) {
  return normalizePart(input)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function wordList(input: string) {
  return tokenize(input);
}

function tokenMatchesWord(token: string, word: string) {
  if (!token || !word) return false;
  if (word === token) return true;
  if (word.startsWith(token) && token.length >= 3) return true;
  if (token.startsWith(word) && word.length >= 3) return true;
  if (isFuzzyWordMatch(token, word)) return true;
  return false;
}

function getAllowedDistance(token: string, word: string) {
  const longest = Math.max(token.length, word.length);
  if (longest <= 4) return 1;
  if (longest <= 6) return 2;
  if (longest <= 8) return 3;
  return 4;
}

/** Slightly looser than strict matching (typo-tolerant browse). */
function getWeakAllowedDistance(token: string, word: string) {
  const longest = Math.max(token.length, word.length);
  if (longest <= 4) return 2;
  if (longest <= 6) return 3;
  if (longest <= 8) return 4;
  return 5;
}

/** Enhanced tolerance for common misspellings and typos */
function getLenientAllowedDistance(token: string, word: string) {
  const longest = Math.max(token.length, word.length);
  // Allow more typos for longer words, but be reasonable
  if (longest <= 3) return 1;
  if (longest <= 5) return 2;
  if (longest <= 7) return 3;
  if (longest <= 10) return 4;
  return Math.min(5, Math.floor(longest * 0.5));
}

function limitedLevenshtein(left: string, right: string, maxDistance: number) {
  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }

  let previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let row = 1; row <= left.length; row += 1) {
    const currentRow = [row];
    let rowMinimum = currentRow[0];

    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      const value = Math.min(
        previousRow[column] + 1,
        currentRow[column - 1] + 1,
        previousRow[column - 1] + cost,
      );
      currentRow[column] = value;
      rowMinimum = Math.min(rowMinimum, value);
    }

    if (rowMinimum > maxDistance) {
      return maxDistance + 1;
    }

    previousRow = currentRow;
  }

  return previousRow[right.length];
}

function isFuzzyWordMatch(token: string, word: string) {
  const maxDistance = getAllowedDistance(token, word);
  return limitedLevenshtein(token, word, maxDistance) <= maxDistance;
}

function isWeakFuzzyWordMatch(token: string, word: string) {
  const maxDistance = getWeakAllowedDistance(token, word);
  return limitedLevenshtein(token, word, maxDistance) <= maxDistance;
}

function isLenientFuzzyWordMatch(token: string, word: string) {
  const maxDistance = getLenientAllowedDistance(token, word);
  return limitedLevenshtein(token, word, maxDistance) <= maxDistance;
}

function tokenMatchesText(token: string, text: string) {
  const words = wordList(text);
  return words.some((word) => tokenMatchesWord(token, word));
}

function tokenMatchesTextWeak(token: string, text: string) {
  const words = wordList(text);
  return words.some((word) => isWeakFuzzyWordMatch(token, word) || tokenMatchesWord(token, word));
}

function tokenMatchesTextLenient(token: string, text: string) {
  const words = wordList(text);
  return words.some((word) => isLenientFuzzyWordMatch(token, word) || isWeakFuzzyWordMatch(token, word) || tokenMatchesWord(token, word));
}

function strongTokenCoverage(item: MediaItem, tokens: string[]) {
  const title = normalizePart(item.title);
  const originalTitle = normalizePart(item.originalTitle);
  const genres = normalizePart(item.genres.join(" "));

  return tokens.filter(
    (token) => tokenMatchesText(token, title) || tokenMatchesText(token, originalTitle) || tokenMatchesText(token, genres),
  ).length;
}

function weakTokenCoverage(item: MediaItem, tokens: string[]) {
  const title = normalizePart(item.title);
  const originalTitle = normalizePart(item.originalTitle);
  const overview = normalizePart(item.overview);
  const genres = normalizePart(item.genres.join(" "));

  return tokens.filter(
    (token) =>
      tokenMatchesTextWeak(token, title) ||
      tokenMatchesTextWeak(token, originalTitle) ||
      tokenMatchesTextWeak(token, overview) ||
      tokenMatchesTextWeak(token, genres),
  ).length;
}

function lenientTokenCoverage(item: MediaItem, tokens: string[]) {
  const title = normalizePart(item.title);
  const originalTitle = normalizePart(item.originalTitle);
  const overview = normalizePart(item.overview);
  const genres = normalizePart(item.genres.join(" "));

  return tokens.filter(
    (token) =>
      tokenMatchesTextLenient(token, title) ||
      tokenMatchesTextLenient(token, originalTitle) ||
      tokenMatchesTextLenient(token, overview) ||
      tokenMatchesTextLenient(token, genres),
  ).length;
}

/** Whole-query fuzzy check on title (handles single-word typos like "frankistein"). */
function compactTitleFuzzyScore(query: string, item: MediaItem) {
  const q = compactAlphaNum(query);
  if (q.length < 4 || q.length > 36) return 0;

  const candidates = [
    compactAlphaNum(item.title),
    compactAlphaNum(item.originalTitle ?? ""),
    compactAlphaNum(`${item.title} ${item.originalTitle ?? ""}`),
  ].filter((value) => value.length >= 4);

  let best = 0;
  const maxDist = q.length <= 8 ? 2 : q.length <= 14 ? 3 : 4;

  for (const hay of candidates) {
    if (!hay) continue;
    if (hay.includes(q)) {
      best = Math.max(best, 72);
      continue;
    }
    if (limitedLevenshtein(q, hay, maxDist) <= maxDist) {
      best = Math.max(best, 58);
    }
    if (hay.length >= q.length) {
      for (let start = 0; start <= hay.length - q.length; start += 1) {
        const slice = hay.slice(start, start + q.length);
        if (limitedLevenshtein(q, slice, maxDist) <= maxDist) {
          best = Math.max(best, 48);
          break;
        }
      }
    }
  }

  return best;
}

export function normalizeSearchText(input: string) {
  return normalizePart(input);
}

export function itemMatchesSearch(item: MediaItem, query: string) {
  const normalizedQuery = normalizePart(query);
  if (!normalizedQuery) return true;

  const tokens = tokenize(normalizedQuery);
  if (!tokens.length) return true;

  const title = normalizePart(item.title);
  const originalTitle = normalizePart(item.originalTitle);
  const overview = normalizePart(item.overview);
  const coverage = strongTokenCoverage(item, tokens);

  if (tokens.length >= 2) {
    if (title.includes(normalizedQuery) || originalTitle.includes(normalizedQuery)) {
      return true;
    }

    // More lenient coverage requirements for multi-token searches
    const relaxedFloor =
      tokens.length >= 4 ? Math.max(1, Math.floor(tokens.length * 0.4)) : Math.max(1, tokens.length - 1);
    if (coverage >= relaxedFloor) {
      return true;
    }

    const weakCov = weakTokenCoverage(item, tokens);
    if (weakCov >= Math.max(1, Math.ceil(tokens.length * 0.45))) {
      return true;
    }

    // Add lenient coverage for very forgiving matching
    const lenientCov = lenientTokenCoverage(item, tokens);
    if (lenientCov >= Math.max(1, Math.ceil(tokens.length * 0.35))) {
      return true;
    }
  }

  const [token] = tokens;
  return (
    tokenMatchesText(token, title) ||
    tokenMatchesText(token, originalTitle) ||
    tokenMatchesText(token, normalizePart(item.genres.join(" "))) ||
    tokenMatchesTextWeak(token, title) ||
    tokenMatchesTextWeak(token, originalTitle) ||
    overview.includes(normalizedQuery) ||
    compactTitleFuzzyScore(normalizedQuery, item) >= 40 // Lowered threshold from 48
  );
}

/** Soft gate for merging API pools: include borderline typo / partial matches, then rank. */
export function itemMatchesSearchLoose(item: MediaItem, query: string) {
  if (itemMatchesSearch(item, query)) return true;
  const normalizedQuery = normalizePart(query);
  if (!normalizedQuery) return true;
  const tokens = tokenize(normalizedQuery);
  if (!tokens.length) return true;

  // Much more lenient matching for loose search
  if (weakTokenCoverage(item, tokens) >= 1 && compactTitleFuzzyScore(normalizedQuery, item) >= 28) {
    return true;
  }

  if (tokens.length >= 2 && weakTokenCoverage(item, tokens) >= Math.max(1, Math.floor(tokens.length * 0.25))) {
    return true;
  }

  // Add lenient token coverage for very forgiving matching
  if (lenientTokenCoverage(item, tokens) >= Math.max(1, Math.ceil(tokens.length * 0.2))) {
    return true;
  }

  return compactTitleFuzzyScore(normalizedQuery, item) >= 32; // Lowered from 40
}

export function weakSearchScore(item: MediaItem, query: string) {
  const normalizedQuery = normalizePart(query);
  if (!normalizedQuery) return 0;

  const tokens = tokenize(normalizedQuery);
  let score = compactTitleFuzzyScore(normalizedQuery, item);

  if (tokens.length) {
    const weakCov = weakTokenCoverage(item, tokens);
    score += weakCov * 20; // Increased from 18
    if (weakCov >= tokens.length) score += 30; // Increased from 24
    
    // Add lenient coverage bonus
    const lenientCov = lenientTokenCoverage(item, tokens);
    score += lenientCov * 12; // Bonus for very lenient matches
    if (lenientCov >= tokens.length) score += 20;
  }

  const overview = normalizePart(item.overview);
  if (overview.includes(normalizedQuery)) {
    score += 15; // Increased from 12
  }

  return Math.min(150, score); // Increased max from 120
}

export function searchScore(item: MediaItem, query: string) {
  const normalizedQuery = normalizePart(query);
  if (!normalizedQuery) return 0;
  if (!itemMatchesSearch(item, normalizedQuery)) return -1;

  const tokens = tokenize(normalizedQuery);
  const title = normalizePart(item.title);
  const originalTitle = normalizePart(item.originalTitle);
  const genres = normalizePart(item.genres.join(" "));
  const overview = normalizePart(item.overview);
  const coverage = strongTokenCoverage(item, tokens);

  let score = 0;

  // Exact matches get highest scores
  if (title === normalizedQuery) score += 220;
  if (originalTitle === normalizedQuery) score += 180;
  if (title.startsWith(normalizedQuery)) score += 120;
  if (originalTitle.startsWith(normalizedQuery)) score += 90;
  if (title.includes(normalizedQuery)) score += 65;
  if (originalTitle.includes(normalizedQuery)) score += 45;
  if (genres.includes(normalizedQuery)) score += 20;
  if (overview.includes(normalizedQuery)) score += 8; // Increased from 6

  if (tokens.length >= 2) {
    score += coverage * 35; // Increased from 32
    if (coverage === tokens.length) score += 90; // Increased from 80
    const relaxedFloor =
      tokens.length >= 4 ? Math.max(1, Math.floor(tokens.length * 0.4)) : Math.max(1, tokens.length - 1); // More lenient
    if (coverage >= relaxedFloor) score += 40; // Increased from 36
    
    // Add weak and lenient coverage bonuses
    const weakCov = weakTokenCoverage(item, tokens);
    score += weakCov * 15;
    if (weakCov >= tokens.length) score += 25;
    
    const lenientCov = lenientTokenCoverage(item, tokens);
    score += lenientCov * 8;
    if (lenientCov >= tokens.length) score += 15;
  } else if (tokens[0]) {
    if (tokenMatchesText(tokens[0], title)) score += 50; // Increased from 45
    if (tokenMatchesText(tokens[0], originalTitle)) score += 35; // Increased from 30
    // Add weak matching for single tokens
    if (tokenMatchesTextWeak(tokens[0], title)) score += 25;
    if (tokenMatchesTextWeak(tokens[0], originalTitle)) score += 20;
  }

  const titleWords = wordList(title);
  const originalTitleWords = wordList(originalTitle);

  for (const token of tokens) {
    if (titleWords.some((word) => isFuzzyWordMatch(token, word))) score += 26; // Increased from 24
    if (originalTitleWords.some((word) => isFuzzyWordMatch(token, word))) score += 18; // Increased from 16
    // Add weak fuzzy matching
    if (titleWords.some((word) => isWeakFuzzyWordMatch(token, word))) score += 15;
    if (originalTitleWords.some((word) => isWeakFuzzyWordMatch(token, word))) score += 12;
    // Add lenient fuzzy matching
    if (titleWords.some((word) => isLenientFuzzyWordMatch(token, word))) score += 8;
    if (originalTitleWords.some((word) => isLenientFuzzyWordMatch(token, word))) score += 6;
  }

  score += compactTitleFuzzyScore(normalizedQuery, item) * 0.4; // Increased from 0.35

  return score;
}

/** Sort key: strict matches always beat weak-only matches. */
export function inclusiveSearchRank(item: MediaItem, query: string) {
  const q = normalizePart(query);
  if (!q) return 0;
  const strict = itemMatchesSearch(item, q) ? searchScore(item, q) : -1;
  if (strict >= 0) {
    return 800 + strict;
  }
  const weak = weakSearchScore(item, q);
  return weak;
}

/**
 * Creates a smart deduplication key that identifies the same content across different sources/platforms
 */
function createSmartDedupKey(item: MediaItem): string {
  // Normalize title for comparison
  const normalizedTitle = normalizePart(item.title);
  const normalizedOriginalTitle = normalizePart(item.originalTitle || "");
  
  // Check if this is likely an anime movie (important for cross-source deduplication)
  const isAnimeMovie = item.type === 'anime' && 
    (normalizedTitle.includes('movie') || 
     normalizedTitle.includes('film') || 
     item.details.episodeCount && item.details.episodeCount <= 3);
  
  // For anime movies, use anime-movie unified key to match across sources
  if (isAnimeMovie) {
    const movieTitle = normalizedTitle.replace(/\s*(movie|film)\s*$/i, '').trim();
    return `anime-movie-${movieTitle}-${item.year}`;
  }
  
  // For anime/shows, use title + year + type as primary key
  if (item.type === 'anime' || item.type === 'show') {
    // Handle series with multiple seasons - use base title + year
    const baseTitle = normalizedTitle.replace(/\s*(season|part|cour)\s*\d+$/i, '').trim();
    return `${item.type}-${baseTitle}-${item.year}`;
  }
  
  // For games, use title + year as primary key (ignores platform differences)
  if (item.type === 'game') {
    const gameTitle = normalizedTitle.replace(/\s*\([^)]*\)/g, '').trim(); // Remove platform info
    return `game-${gameTitle}-${item.year}`;
  }
  
  // For movies, use title + year as primary key
  if (item.type === 'movie') {
    return `movie-${normalizedTitle}-${item.year}`;
  }
  
  // Fallback to normalized title + type + year
  return `${item.type}-${normalizedTitle}-${item.year}`;
}

/**
 * Enhanced deduplication that removes duplicates across different sources and platforms
 */
export function dedupeMediaKey(items: MediaItem[]) {
  const seen = new Set<string>();
  const bestItems = new Map<string, MediaItem>(); // Store best version of each dedup key
  
  return items.filter((item) => {
    // First check source-specific deduplication
    const sourceKey = `${item.source}-${item.sourceId}`;
    if (seen.has(sourceKey)) return false;
    seen.add(sourceKey);
    
    // Then check smart deduplication across sources
    const smartKey = createSmartDedupKey(item);
    const existing = bestItems.get(smartKey);
    
    if (!existing) {
      bestItems.set(smartKey, item);
      return true;
    }
    
    // Keep the better version based on quality metrics
    if (isBetterVersion(item, existing)) {
      bestItems.set(smartKey, item);
      return true;
    }
    
    return false;
  });
}

/**
 * Determines which version of duplicate media is better to keep
 */
function isBetterVersion(newItem: MediaItem, existingItem: MediaItem): boolean {
  // Prefer items with higher ratings
  if (newItem.rating > existingItem.rating) return true;
  if (existingItem.rating > newItem.rating) return false;
  
  // Prefer items with more complete data
  const newCompleteness = getDataCompleteness(newItem);
  const existingCompleteness = getDataCompleteness(existingItem);
  if (newCompleteness > existingCompleteness) return true;
  if (existingCompleteness > newCompleteness) return false;
  
  // Prefer items with better image availability
  if (newItem.coverUrl && !existingItem.coverUrl) return true;
  if (existingItem.coverUrl && !newItem.coverUrl) return false;
  
  // Prefer TMDB over other sources for movies/shows/anime
  if (newItem.source === 'tmdb' && ['movie', 'show', 'anime'].includes(newItem.type)) return true;
  if (existingItem.source === 'tmdb' && ['movie', 'show', 'anime'].includes(existingItem.type)) return false;
  
  // Prefer IGDB for games
  if (newItem.source === 'igdb' && newItem.type === 'game') return true;
  if (existingItem.source === 'igdb' && existingItem.type === 'game') return false;
  
  // If all else equal, keep the existing one
  return false;
}

/**
 * Calculates a completeness score for media items
 */
function getDataCompleteness(item: MediaItem): number {
  let score = 0;
  
  if (item.title && item.title.trim().length > 0) score += 1;
  if (item.overview && item.overview.trim().length > 20) score += 1;
  if (item.genres && item.genres.length > 0) score += 1;
  if (item.coverUrl && item.coverUrl.trim().length > 10) score += 1;
  if (item.backdropUrl && item.backdropUrl.trim().length > 10) score += 1;
  if (item.credits && item.credits.length > 0) score += 1;
  if (item.rating > 0) score += 1;
  if (item.year > 1900) score += 1;
  
  // Type-specific completeness
  if (item.type === 'game' && item.details.platform) score += 1;
  if ((item.type === 'show' || item.type === 'anime') && 
      (item.details.seasonCount || item.details.episodeCount)) score += 1;
  if (item.type === 'movie' && item.details.runtime) score += 1;
  
  return score;
}

/**
 * Rank a merged catalog/search pool: do not drop items before scoring.
 * Keeps weak matches at lower ranks so typos still surface intended titles.
 */
/**
 * Validates that a media item has sufficient data to be considered "proper" and not a placeholder
 */
export function isValidMediaItem(item: MediaItem): boolean {
  // Must have basic required fields with meaningful content
  if (!item.title || item.title.trim().length < 2) return false;
  if (!item.coverUrl || item.coverUrl.trim().length < 10) return false;
  if (!item.backdropUrl || item.backdropUrl.trim().length < 10) return false;
  if (!item.overview || item.overview.trim().length < 20) return false;
  if (!item.genres || item.genres.length === 0) return false;
  
  // Rating should be reasonable (0-10 scale, but placeholder items often have 0 or unrealistic values)
  if (item.rating < 1 || item.rating > 10) return false;
  
  // Year should be reasonable (not placeholder values like 0, 1900, or future dates)
  const currentYear = new Date().getFullYear();
  if (item.year < 1900 || item.year > currentYear + 3) return false;
  
  // Source ID should be meaningful (not empty or placeholder values)
  if (!item.sourceId || item.sourceId.trim().length < 1) return false;
  
  // Language should be a valid ISO code
  if (!item.language || item.language.length !== 2) return false;
  
  // For games, ensure platform information exists
  if (item.type === 'game' && !item.details.platform) {
    // Allow games without platform if they have other strong indicators
    if (item.rating < 5 || item.genres.length < 2) return false;
  }
  
  // For shows/anime, ensure episode/season info exists
  if ((item.type === 'show' || item.type === 'anime') && 
      (!item.details.seasonCount && !item.details.episodeCount)) {
    // Allow if it's a very new show with high rating
    if (item.year < currentYear - 2 || item.rating < 7) return false;
  }
  
  return true;
}

/**
 * Enhanced validation for search results to ensure only proper media appear
 */
export function validateSearchResults(items: MediaItem[]): MediaItem[] {
  return items.filter(item => isValidMediaItem(item));
}

export function rankCandidatesForQuery(
  items: MediaItem[],
  query: string,
  options?: { limit?: number; minRank?: number },
): MediaItem[] {
  const q = query.trim();
  if (!q) {
    // Even for empty queries, filter out placeholder media
    return validateSearchResults(dedupeMediaKey(items)).slice(0, options?.limit ?? 96);
  }

  const minRank = options?.minRank ?? 10;
  const limit = options?.limit ?? 96;

  return validateSearchResults(dedupeMediaKey(items))
    .map((item) => ({ item, rank: inclusiveSearchRank(item, q) }))
    .filter((entry) => entry.rank >= minRank)
    .sort((left, right) => {
      const gap = right.rank - left.rank;
      if (gap !== 0) return gap;
      return right.item.rating - left.item.rating || right.item.year - left.item.year;
    })
    .map((entry) => entry.item)
    .slice(0, limit);
}
