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
  franchiseTitles: string[] = []
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
  
  // For partial matches, be more strict - require significant overlap
  const itemNormalizedTitles = itemVariants.map(title => normalizeBaseTitle(title));
  
  for (const franchiseKey of franchiseKeys) {
    for (const itemTitle of itemNormalizedTitles) {
      // Only match if there's significant word overlap (not just single words)
      const franchiseWords = franchiseKey.split(/\s+/).filter(w => w.length > 2);
      const itemWords = itemTitle.split(/\s+/).filter(w => w.length > 2);
      
      if (franchiseWords.length === 0 || itemWords.length === 0) {
        continue;
      }
      
      // Require at least 50% word overlap for partial matches
      const commonWords = franchiseWords.filter(word => itemWords.includes(word));
      const overlapRatio = commonWords.length / Math.min(franchiseWords.length, itemWords.length);
      
      if (overlapRatio >= 0.5 && commonWords.length >= 2) {
        return true;
      }
    }
  }
  
  return false;
}
