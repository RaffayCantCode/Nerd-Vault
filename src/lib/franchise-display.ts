/**
 * Enhanced franchise display system that properly separates anime movies from shows
 * Provides clear visual organization and prevents duplicate display
 */

import { MediaItem } from "@/lib/types";

export interface FranchiseGroup {
  title: string;
  movies: MediaItem[];
  series: MediaItem[];
  hasMovies: boolean;
  hasSeries: boolean;
}

/**
 * Groups media items by franchise with proper separation between movies and series
 */
export function groupByFranchiseEnhanced(items: MediaItem[]): FranchiseGroup[] {
  const franchiseMap = new Map<string, FranchiseGroup>();
  
  for (const item of items) {
    const franchiseKey = item.collectionTitle || item.title;
    
    if (!franchiseMap.has(franchiseKey)) {
      franchiseMap.set(franchiseKey, {
        title: franchiseKey,
        movies: [],
        series: [],
        hasMovies: false,
        hasSeries: false
      });
    }
    
    const group = franchiseMap.get(franchiseKey)!;
    
    // Separate anime movies from series
    if (item.type === 'anime-movie') {
      group.movies.push(item);
      group.hasMovies = true;
    } else if (item.type === 'anime') {
      group.series.push(item);
      group.hasSeries = true;
    } else {
      // For non-anime content, use existing logic
      if (item.type === 'movie') {
        group.movies.push(item);
        group.hasMovies = true;
      } else if (item.type === 'show') {
        group.series.push(item);
        group.hasSeries = true;
      }
    }
  }
  
  return Array.from(franchiseMap.values());
}

/**
 * Determines if a franchise should be displayed with enhanced separation
 */
export function shouldUseEnhancedFranchiseDisplay(items: MediaItem[]): boolean {
  return items.some(item => 
    item.type === 'anime-movie' || 
    item.type === 'anime' || 
    (item.collectionTitle && item.type === 'movie')
  );
}

/**
 * Gets display label for franchise groups
 */
export function getFranchiseDisplayLabel(group: FranchiseGroup): string {
  if (group.hasMovies && group.hasSeries) {
    return `${group.title} (Mixed)`;
  } else if (group.hasMovies) {
    return `${group.title} (Movies)`;
  } else if (group.hasSeries) {
    return `${group.title} (Series)`;
  }
  return group.title;
}

/**
 * Filters items by type for franchise display
 */
export function filterByFranchiseType(items: MediaItem[], type: 'movies' | 'series'): MediaItem[] {
  return items.filter(item => {
    if (type === 'movies') {
      return item.type === 'anime-movie' || item.type === 'movie';
    } else {
      return item.type === 'anime' || item.type === 'show';
    }
  });
}
