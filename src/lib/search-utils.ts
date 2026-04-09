import { MediaItem } from "@/lib/types";

function normalizePart(input?: string | null) {
  return (input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  return false;
}

function tokenMatchesText(token: string, text: string) {
  const words = wordList(text);
  return words.some((word) => tokenMatchesWord(token, word));
}

function strongTokenCoverage(item: MediaItem, tokens: string[]) {
  const title = normalizePart(item.title);
  const originalTitle = normalizePart(item.originalTitle);
  const genres = normalizePart(item.genres.join(" "));

  return tokens.filter(
    (token) => tokenMatchesText(token, title) || tokenMatchesText(token, originalTitle) || tokenMatchesText(token, genres),
  ).length;
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

    return coverage === tokens.length;
  }

  const [token] = tokens;
  return (
    tokenMatchesText(token, title) ||
    tokenMatchesText(token, originalTitle) ||
    tokenMatchesText(token, normalizePart(item.genres.join(" "))) ||
    overview.includes(normalizedQuery)
  );
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
  } else if (tokens[0]) {
    if (tokenMatchesText(tokens[0], title)) score += 45;
    if (tokenMatchesText(tokens[0], originalTitle)) score += 30;
  }

  return score;
}
