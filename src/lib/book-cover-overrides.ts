const MODERN_COVER_OVERRIDES: Record<number, string> = {
  // Pride and Prejudice
  1342: "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg",
  // Frankenstein
  84: "https://covers.openlibrary.org/b/isbn/9780143131847-L.jpg",
  // Moby-Dick
  2701: "https://covers.openlibrary.org/b/isbn/9780143105954-L.jpg",
  // Dracula
  345: "https://covers.openlibrary.org/b/isbn/9780141439846-L.jpg",
  // The Picture of Dorian Gray
  174: "https://covers.openlibrary.org/b/isbn/9780141439570-L.jpg",
};

export function getModernCoverOverride(bookId: number) {
  return MODERN_COVER_OVERRIDES[bookId] ?? null;
}

