import { BookListPayload, BookReaderPayload, BookSummary } from "@/lib/book-types";

const GUTENDEX_API_URL = "https://gutendex.com/books";
const GUTENDEX_PAGE_SIZE = 32;

type GutendexAuthor = {
  name?: string;
};

type GutendexBook = {
  id: number;
  title: string;
  authors?: GutendexAuthor[];
  subjects?: string[];
  languages?: string[];
  download_count?: number;
  summaries?: string[];
  formats?: Record<string, string>;
};

type GutendexResponse = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: GutendexBook[];
};

const BOOK_GENRE_RULES = [
  { label: "Fiction", terms: ["fiction", "novel", "stories", "literature"] },
  { label: "Classics", terms: ["classic", "classics"] },
  { label: "Romance", terms: ["romance", "love", "courtship"] },
  { label: "Horror", terms: ["ghost", "horror", "terror", "supernatural"] },
  { label: "Adventure", terms: ["adventure", "voyage", "travel", "sea stories"] },
  { label: "Fantasy", terms: ["fantasy", "fairy", "legend", "myth"] },
  { label: "Mystery", terms: ["mystery", "detective", "crime"] },
  { label: "History", terms: ["history", "historical", "war"] },
  { label: "Science", terms: ["science", "mathematics", "astronomy", "physics"] },
  { label: "Poetry", terms: ["poetry", "poems"] },
  { label: "Drama", terms: ["drama", "plays", "tragedies", "comedy"] },
] as const;

function deriveGenres(subjects: string[]) {
  const normalized = subjects.join(" ").toLowerCase();
  const matches = BOOK_GENRE_RULES
    .filter((rule) => rule.terms.some((term) => normalized.includes(term)))
    .map((rule) => rule.label);

  return matches.length ? matches.slice(0, 4) : ["Literary"];
}

function mapBook(book: GutendexBook): BookSummary {
  const authors = (book.authors ?? [])
    .map((author) => author.name?.trim())
    .filter((value): value is string => Boolean(value));
  const summary = book.summaries?.find(Boolean)?.trim() || `A Project Gutenberg edition of ${book.title}.`;
  const downloadCount = book.download_count ?? 0;
  const pageCountEstimate = Math.max(80, Math.min(960, Math.round(120 + downloadCount / 20)));

  return {
    id: book.id,
    title: book.title,
    authors,
    summary,
    coverUrl: book.formats?.["image/jpeg"] ?? null,
    subjects: (book.subjects ?? []).slice(0, 8),
    genres: deriveGenres(book.subjects ?? []),
    languages: book.languages ?? [],
    downloadCount,
    pageCountEstimate,
  };
}

async function fetchGutendex(url: URL) {
  const response = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Books request failed with ${response.status}`);
  }

  return response.json() as Promise<GutendexResponse>;
}

function pickReadableFormat(book: GutendexBook) {
  const formats = book.formats ?? {};

  return (
    formats["text/plain; charset=utf-8"] ||
    formats["text/plain; charset=us-ascii"] ||
    formats["text/plain"] ||
    formats["text/html; charset=utf-8"] ||
    formats["text/html"] ||
    null
  );
}

function decodeEntities(input: string) {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeBookText(input: string) {
  const stripped = decodeEntities(
    input
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );

  const withoutHeader = stripped
    .replace(/^[\s\S]*?\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i, "")
    .replace(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*$/i, "");

  return withoutHeader
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function splitIntoParagraphs(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 35)
    .slice(0, 2200);
}

export async function fetchBooksPage({
  page,
  query,
  genre = "All",
}: {
  page: number;
  query: string;
  genre?: string;
}): Promise<BookListPayload> {
  const url = new URL(GUTENDEX_API_URL);
  url.searchParams.set("page", String(Math.max(1, page)));
  const normalizedGenre = genre.trim() || "All";
  const searchTerms = [query.trim(), normalizedGenre !== "All" ? normalizedGenre : ""].filter(Boolean).join(" ");

  if (searchTerms) {
    url.searchParams.set("search", searchTerms);
  }

  const payload = await fetchGutendex(url);
  const mappedItems = payload.results.map(mapBook);
  const filteredItems =
    normalizedGenre === "All"
      ? mappedItems
      : mappedItems.filter((book) => book.genres.includes(normalizedGenre));

  return {
    page: Math.max(1, page),
    totalPages: Math.max(1, Math.ceil(payload.count / GUTENDEX_PAGE_SIZE)),
    totalResults: normalizedGenre === "All" ? payload.count : filteredItems.length,
    items: filteredItems,
  };
}

export async function fetchBookSummary(bookId: number): Promise<BookSummary> {
  const url = new URL(GUTENDEX_API_URL);
  url.searchParams.set("ids", String(bookId));

  const payload = await fetchGutendex(url);
  const book = payload.results[0];

  if (!book) {
    throw new Error("Book not found");
  }

  return mapBook(book);
}

export async function fetchBookReaderPayload(bookId: number): Promise<BookReaderPayload> {
  const url = new URL(GUTENDEX_API_URL);
  url.searchParams.set("ids", String(bookId));

  const payload = await fetchGutendex(url);
  const book = payload.results[0];

  if (!book) {
    throw new Error("Book not found");
  }

  const readableUrl = pickReadableFormat(book);
  if (!readableUrl) {
    throw new Error("No readable format available for this book");
  }

  const contentResponse = await fetch(readableUrl, {
    next: { revalidate: 86400 },
    headers: {
      Accept: "text/plain,text/html;q=0.9,*/*;q=0.1",
    },
  });

  if (!contentResponse.ok) {
    throw new Error(`Reader content failed with ${contentResponse.status}`);
  }

  const rawText = await contentResponse.text();
  const paragraphs = splitIntoParagraphs(normalizeBookText(rawText));

  if (!paragraphs.length) {
    throw new Error("This book could not be prepared for reading");
  }

  return {
    book: mapBook(book),
    paragraphs,
  };
}
