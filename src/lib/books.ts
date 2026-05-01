import { BookListPayload, BookReaderPayload, BookSummary } from "@/lib/book-types";

const GUTENDEX_API_URL = "https://gutendex.com/books";
const GUTENDEX_SOURCE_PAGE_SIZE = 32;
const BOOK_LIST_PAGE_SIZE = GUTENDEX_SOURCE_PAGE_SIZE;
const BOOK_LIST_CACHE_MS = 1000 * 60 * 20;
const BOOK_READER_CACHE_MS = 1000 * 60 * 60 * 24;

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
  { label: "Fiction", terms: ["fiction", "novel", "stories", "literature", "short stories"] },
  { label: "Classics", terms: ["classic", "classics", "canonical"] },
  { label: "Adventure", terms: ["adventure", "voyage", "travel", "sea stories", "expedition", "exploration"] },
  { label: "Fantasy", terms: ["fantasy", "fairy", "legend", "myth", "folklore", "magic"] },
  { label: "Mystery", terms: ["mystery", "detective", "crime", "murder", "investigation"] },
  { label: "Science Fiction", terms: ["science fiction", "sci fi", "scientific romance", "future", "space", "utopia", "dystopia"] },
  { label: "Romance", terms: ["romance", "love", "courtship", "marriage", "domestic fiction"] },
  { label: "Horror", terms: ["ghost", "horror", "terror", "supernatural", "haunted", "occult"] },
  { label: "History", terms: ["history", "historical", "war", "ancient", "medieval"] },
  { label: "Biography", terms: ["biography", "memoir", "autobiography", "letters", "journals"] },
  { label: "Philosophy", terms: ["philosophy", "ethics", "metaphysics", "logic"] },
  { label: "Politics", terms: ["politics", "government", "state", "law", "economics"] },
  { label: "Religion", terms: ["religion", "theology", "bible", "christian", "islam", "buddhism", "faith"] },
  { label: "Science", terms: ["science", "mathematics", "astronomy", "physics", "chemistry", "biology", "nature"] },
  { label: "Poetry", terms: ["poetry", "poems", "verse"] },
  { label: "Drama", terms: ["drama", "plays", "tragedies", "comedy", "theater", "theatre"] },
  { label: "Children", terms: ["children", "juvenile", "boys", "girls", "fairy tales"] },
] as const;

const AVAILABLE_BOOK_GENRES = Array.from(
  new Set(["Literary", ...BOOK_GENRE_RULES.map((rule) => rule.label)]),
).sort((left, right) => left.localeCompare(right));

const gutendexResponseCache = new Map<string, { expiresAt: number; payload: GutendexResponse }>();
const readerPayloadCache = new Map<number, { expiresAt: number; payload: BookReaderPayload }>();
const readerPayloadInflight = new Map<number, Promise<BookReaderPayload>>();

function deriveGenres(subjects: string[]) {
  const normalized = subjects.join(" ").toLowerCase();
  const matches = BOOK_GENRE_RULES
    .filter((rule) => rule.terms.some((term) => normalized.includes(term)))
    .map((rule) => rule.label);

  return matches.length ? matches.slice(0, 4) : ["Literary"];
}

function cleanBookTitle(title: string) {
  const normalized = title
    .replace(/\s+/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*(illustrated|annotated|complete|unabridged|edition|vol(?:ume)?\.?\s*\d+|part\s*\d+|book\s*\d+|series\s*\d+)[^)]*\)/gi, " ")
    .replace(/[,;:\-]\s*(illustrated|annotated|complete|unabridged|edition|author'?s edition|collector'?s edition|with.*|in .* volumes?|vol(?:ume)?\.?\s*\d+|part\s*\d+|book\s*\d+).*$/i, "")
    .replace(/\b(vol(?:ume)?\.?\s*\d+|part\s*\d+|book\s*\d+|no\.?\s*\d+|#\s*\d+)\b/gi, " ")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/[^\p{L}\p{N}\s'&:.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const titleCase = normalized
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (word === word.toUpperCase() && word.length <= 5) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  return titleCase.replace(/\s+[:\-]\s*$/g, "").trim() || "Untitled";
}

function mapBook(book: GutendexBook): BookSummary {
  const cleanedTitle = cleanBookTitle(book.title);
  const authors = (book.authors ?? [])
    .map((author) => author.name?.trim())
    .filter((value): value is string => Boolean(value));
  const summary = book.summaries?.find(Boolean)?.trim() || `A Project Gutenberg edition of ${cleanedTitle}.`;
  const downloadCount = book.download_count ?? 0;
  const pageCountEstimate = Math.max(80, Math.min(960, Math.round(120 + downloadCount / 20)));

  return {
    id: book.id,
    title: cleanedTitle,
    authors,
    summary,
    coverUrl: book.formats?.["image/jpeg"] ?? null,
    subjects: (book.subjects ?? []).slice(0, 10),
    genres: deriveGenres(book.subjects ?? []),
    languages: book.languages ?? [],
    downloadCount,
    pageCountEstimate,
  };
}

async function fetchGutendex(url: URL) {
  const cacheKey = url.toString();
  const cached = gutendexResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const response = await fetch(cacheKey, {
    next: { revalidate: 3600 },
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Books request failed with ${response.status}`);
  }

  const payload = (await response.json()) as GutendexResponse;
  gutendexResponseCache.set(cacheKey, {
    expiresAt: Date.now() + BOOK_LIST_CACHE_MS,
    payload,
  });
  return payload;
}

async function fetchGutendexWithRetry(url: URL, attempts = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchGutendex(url);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 250));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Books request failed");
}

async function fetchGutendexPage(page: number, searchTerms = "") {
  const url = new URL(GUTENDEX_API_URL);
  url.searchParams.set("page", String(Math.max(1, page)));

  if (searchTerms.trim()) {
    url.searchParams.set("search", searchTerms.trim());
  }

  return fetchGutendexWithRetry(url);
}

function normalizeForSearch(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildBookSearchTerms(query: string, genre: string) {
  const terms = [query.trim()];
  if (genre.trim() && genre.trim().toLowerCase() !== "all") {
    terms.push(genre.trim());
  }

  return terms
    .map((term) => term.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
}

function matchesGenre(book: BookSummary, genre: string) {
  const normalizedGenre = genre.trim().toLowerCase();
  if (!normalizedGenre || normalizedGenre === "all") {
    return true;
  }

  return book.genres.some((entry) => entry.toLowerCase() === normalizedGenre);
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
  const safePage = Math.max(1, page);
  const searchTerms = buildBookSearchTerms(query, genre);
  const payload = await fetchGutendexPage(safePage, searchTerms);
  const mappedItems = payload.results.map(mapBook).filter((book) => matchesGenre(book, genre));

  return {
    page: safePage,
    totalPages: Math.max(1, Math.ceil((payload.count || payload.results.length || 1) / BOOK_LIST_PAGE_SIZE)),
    totalResults: payload.count || mappedItems.length,
    availableGenres: AVAILABLE_BOOK_GENRES,
    items: mappedItems,
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

export async function fetchBooksByIds(bookIds: number[]): Promise<BookSummary[]> {
  const normalizedIds = Array.from(new Set(bookIds.filter((bookId) => Number.isFinite(bookId) && bookId > 0)));
  if (!normalizedIds.length) {
    return [];
  }

  const url = new URL(GUTENDEX_API_URL);
  url.searchParams.set("ids", normalizedIds.join(","));

  const payload = await fetchGutendex(url);
  const mapped = payload.results.map(mapBook);
  const order = new Map(normalizedIds.map((id, index) => [id, index]));

  return mapped.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
}

export async function fetchBookReaderPayload(bookId: number): Promise<BookReaderPayload> {
  const cached = readerPayloadCache.get(bookId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const inflight = readerPayloadInflight.get(bookId);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
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

    const nextPayload = {
      book: mapBook(book),
      paragraphs,
    } satisfies BookReaderPayload;

    readerPayloadCache.set(bookId, {
      expiresAt: Date.now() + BOOK_READER_CACHE_MS,
      payload: nextPayload,
    });

    return nextPayload;
  })();

  readerPayloadInflight.set(bookId, request);

  try {
    return await request;
  } finally {
    readerPayloadInflight.delete(bookId);
  }
}
