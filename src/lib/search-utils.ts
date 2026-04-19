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
  if (longest <= 8) return 2;
  return 3;
}

/** Slightly looser than strict matching (typo-tolerant browse). */
function getWeakAllowedDistance(token: string, word: string) {
  return getAllowedDistance(token, word) + 1;
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

function tokenMatchesText(token: string, text: string) {
  const words = wordList(text);
  return words.some((word) => tokenMatchesWord(token, word));
}

function tokenMatchesTextWeak(token: string, text: string) {
  const words = wordList(text);
  return words.some((word) => isWeakFuzzyWordMatch(token, word) || tokenMatchesWord(token, word));
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

    const relaxedFloor =
      tokens.length >= 4 ? Math.max(1, Math.floor(tokens.length * 0.5)) : Math.max(1, tokens.length - 1);
    if (coverage >= relaxedFloor) {
      return true;
    }

    const weakCov = weakTokenCoverage(item, tokens);
    if (weakCov >= Math.max(1, Math.ceil(tokens.length * 0.55))) {
      return true;
    }
  }

  const [token] = tokens;
  return (
    tokenMatchesText(token, title) ||
    tokenMatchesText(token, originalTitle) ||
    tokenMatchesText(token, normalizePart(item.genres.join(" "))) ||
    overview.includes(normalizedQuery) ||
    compactTitleFuzzyScore(normalizedQuery, item) >= 48
  );
}

/** Soft gate for merging API pools: include borderline typo / partial matches, then rank. */
export function itemMatchesSearchLoose(item: MediaItem, query: string) {
  if (itemMatchesSearch(item, query)) return true;
  const normalizedQuery = normalizePart(query);
  if (!normalizedQuery) return true;
  const tokens = tokenize(normalizedQuery);
  if (!tokens.length) return true;

  if (weakTokenCoverage(item, tokens) >= 1 && compactTitleFuzzyScore(normalizedQuery, item) >= 32) {
    return true;
  }

  if (tokens.length >= 2 && weakTokenCoverage(item, tokens) >= Math.max(1, Math.floor(tokens.length * 0.35))) {
    return true;
  }

  return compactTitleFuzzyScore(normalizedQuery, item) >= 40;
}

export function weakSearchScore(item: MediaItem, query: string) {
  const normalizedQuery = normalizePart(query);
  if (!normalizedQuery) return 0;

  const tokens = tokenize(normalizedQuery);
  let score = compactTitleFuzzyScore(normalizedQuery, item);

  if (tokens.length) {
    const weakCov = weakTokenCoverage(item, tokens);
    score += weakCov * 18;
    if (weakCov >= tokens.length) score += 24;
  }

  const overview = normalizePart(item.overview);
  if (overview.includes(normalizedQuery)) {
    score += 12;
  }

  return Math.min(120, score);
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

  if (title === normalizedQuery) score += 220;
  if (originalTitle === normalizedQuery) score += 180;
  if (title.startsWith(normalizedQuery)) score += 120;
  if (originalTitle.startsWith(normalizedQuery)) score += 90;
  if (title.includes(normalizedQuery)) score += 65;
  if (originalTitle.includes(normalizedQuery)) score += 45;
  if (genres.includes(normalizedQuery)) score += 20;
  if (overview.includes(normalizedQuery)) score += 6;

  if (tokens.length >= 2) {
    score += coverage * 32;
    if (coverage === tokens.length) score += 80;
    const relaxedFloor =
      tokens.length >= 4 ? Math.max(1, Math.floor(tokens.length * 0.5)) : Math.max(1, tokens.length - 1);
    if (coverage >= relaxedFloor) score += 36;
  } else if (tokens[0]) {
    if (tokenMatchesText(tokens[0], title)) score += 45;
    if (tokenMatchesText(tokens[0], originalTitle)) score += 30;
  }

  const titleWords = wordList(title);
  const originalTitleWords = wordList(originalTitle);

  for (const token of tokens) {
    if (titleWords.some((word) => isFuzzyWordMatch(token, word))) score += 24;
    if (originalTitleWords.some((word) => isFuzzyWordMatch(token, word))) score += 16;
  }

  score += compactTitleFuzzyScore(normalizedQuery, item) * 0.35;

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

function dedupeMediaKey(items: MediaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.source}-${item.sourceId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Rank a merged catalog/search pool: do not drop items before scoring.
 * Keeps weak matches at lower ranks so typos still surface intended titles.
 */
export function rankCandidatesForQuery(
  items: MediaItem[],
  query: string,
  options?: { limit?: number; minRank?: number },
): MediaItem[] {
  const q = query.trim();
  if (!q) {
    return dedupeMediaKey(items).slice(0, options?.limit ?? 96);
  }

  const minRank = options?.minRank ?? 10;
  const limit = options?.limit ?? 96;

  return dedupeMediaKey(items)
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
