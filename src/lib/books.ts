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

export async function fetchBooksPage({ page, query }: { page: number; query: string }): Promise<BookListPayload> {
  const url = new URL(GUTENDEX_API_URL);
  url.searchParams.set("page", String(Math.max(1, page)));

  if (query.trim()) {
    url.searchParams.set("search", query.trim());
  }

  const payload = await fetchGutendex(url);

  return {
    page: Math.max(1, page),
    totalPages: Math.max(1, Math.ceil(payload.count / GUTENDEX_PAGE_SIZE)),
    totalResults: payload.count,
    items: payload.results.map(mapBook),
  };
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
