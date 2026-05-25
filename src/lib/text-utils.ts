const HTML_ENTITY_MAP: Record<string, string> = {
  "&mdash;": "—",
  "&ndash;": "–",
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

export function decodeHtmlEntities(input: string) {
  if (!input) {
    return "";
  }

  return input
    .replace(/&(?:#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity) => HTML_ENTITY_MAP[entity.toLowerCase()] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}
