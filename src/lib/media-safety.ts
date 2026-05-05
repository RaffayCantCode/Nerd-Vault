import { MediaItem } from "@/lib/types";

const RESTRICTED_GENRES = new Set([
  "sex",
  "ecchi",
  "hentai",
  "erotica",
  "adult",
  "nsfw",
]);

const SENSITIVE_TEXT_PATTERNS = [
  /\b(?:porn|porno|pornographic|xxx|nsfw|hentai|ecchi|erotica?)\b/i,
  /\b(?:softcore|hardcore|fetish|bdsm|milf)\b/i,
  /\b(?:hot|sexy)\s+girls?\b/i,
  /\bnud(?:e|es|ity)\b/i,
  /\bstrip(?:per|pers|club|tease)\b/i,
  /\badult(?:\s+only|\s+content|\s+video|\s+film)\b/i,
  /\bmature\s+audiences?\b/i,
  /\bsexual\s+content\b/i,
  /\b18\+\b/i,
];

function normalizeSafetyText(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isFamilyFriendlyMediaItem(item: MediaItem) {
  const hasRestrictedGenre = item.genres.some((genre) =>
    RESTRICTED_GENRES.has(genre.toLowerCase().trim()),
  );

  if (hasRestrictedGenre) {
    return false;
  }

  const textBlob = normalizeSafetyText(
    `${item.title} ${item.originalTitle ?? ""} ${item.overview} ${item.genres.join(" ")}`,
  );

  return !SENSITIVE_TEXT_PATTERNS.some((pattern) => pattern.test(textBlob));
}
