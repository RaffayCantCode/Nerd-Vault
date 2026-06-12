import { BookListPayload, BookReaderPayload, BookSummary } from "@/lib/book-types";
import { getModernCoverOverride } from "@/lib/book-cover-overrides";

const FALLBACK_BOOKS: GutendexBook[] = [
  {
    id: 84,
    title: "Frankenstein; Or, The Modern Prometheus",
    authors: [{ name: "Shelley, Mary Wollstonecraft" }],
    subjects: ["Science fiction", "Horror tales", "Frankenstein's monster (Fictitious character) -- Fiction", "Gothic fiction"],
    languages: ["en"],
    download_count: 98000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/84/pg84.txt"
    }
  },
  {
    id: 1342,
    title: "Pride and Prejudice",
    authors: [{ name: "Austen, Jane" }],
    subjects: ["Sisters -- Fiction", "Courtship -- Fiction", "England -- Fiction", "Social classes -- Fiction", "Love stories", "Domestic fiction"],
    languages: ["en"],
    download_count: 89000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/1342/pg1342.txt"
    }
  },
  {
    id: 11,
    title: "Alice's Adventures in Wonderland",
    authors: [{ name: "Carroll, Lewis" }],
    subjects: ["Fantasy fiction", "Children's stories", "Alice (Fictitious character from Carroll) -- Fiction"],
    languages: ["en"],
    download_count: 75000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/11/pg11.txt"
    }
  },
  {
    id: 345,
    title: "Dracula",
    authors: [{ name: "Stoker, Bram" }],
    subjects: ["Vampires -- Fiction", "Dracula, Count (Fictitious character) -- Fiction", "Horror tales", "Gothic fiction"],
    languages: ["en"],
    download_count: 68000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/345/pg345.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/345/pg345.txt"
    }
  },
  {
    id: 1661,
    title: "The Adventures of Sherlock Holmes",
    authors: [{ name: "Doyle, Arthur Conan" }],
    subjects: ["Holmes, Sherlock (Fictitious character) -- Fiction", "Private investigators -- England -- Fiction", "Detective and mystery stories"],
    languages: ["en"],
    download_count: 65000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/1661/pg1661.txt"
    }
  },
  {
    id: 174,
    title: "The Picture of Dorian Gray",
    authors: [{ name: "Wilde, Oscar" }],
    subjects: ["Didactic fiction", "Supernatural -- Fiction", "Conduct of life -- Fiction", "Portraits -- Fiction", "Gothic fiction", "Horror tales"],
    languages: ["en"],
    download_count: 58000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/174/pg174.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/174/pg174.txt"
    }
  },
  {
    id: 98,
    title: "A Tale of Two Cities",
    authors: [{ name: "Dickens, Charles" }],
    subjects: ["Historical fiction", "French Revolution -- Fiction", "London (England) -- Fiction", "Paris (France) -- Fiction", "Classics"],
    languages: ["en"],
    download_count: 54000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/98/pg98.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/98/pg98.txt"
    }
  },
  {
    id: 2701,
    title: "Moby Dick; Or, The Whale",
    authors: [{ name: "Melville, Herman" }],
    subjects: ["Whaling -- Fiction", "Ahab, Captain (Fictitious character) -- Fiction", "Adventure stories", "Classics", "Sea stories"],
    languages: ["en"],
    download_count: 52000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/2701/pg2701.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/2701/pg2701.txt"
    }
  },
  {
    id: 1513,
    title: "Romeo and Juliet",
    authors: [{ name: "Shakespeare, William" }],
    subjects: ["Tragedies", "Conflict of generations -- Drama", "Verona (Italy) -- Drama", "Drama", "Poetry"],
    languages: ["en"],
    download_count: 48000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/1513/pg1513.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/1513/pg1513.txt"
    }
  },
  {
    id: 5200,
    title: "Metamorphosis",
    authors: [{ name: "Kafka, Franz" }],
    subjects: ["Psychological fiction", "Metamorphosis -- Fiction", "Absurdist fiction"],
    languages: ["en"],
    download_count: 46000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/5200/pg5200.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/5200/pg5200.txt"
    }
  },
  {
    id: 35,
    title: "The Time Machine",
    authors: [{ name: "Wells, H. G. (Herbert George)" }],
    subjects: ["Science fiction", "Time travel -- Fiction", "Dystopias -- Fiction"],
    languages: ["en"],
    download_count: 44000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/35/pg35.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/35/pg35.txt"
    }
  },
  {
    id: 205,
    title: "Walden, and On The Duty Of Civil Disobedience",
    authors: [{ name: "Thoreau, Henry David" }],
    subjects: ["Philosophy", "Natural history -- Massachusetts -- Walden Woods", "Solitude", "Civil disobedience", "Biography", "Autobiographies"],
    languages: ["en"],
    download_count: 41000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/205/pg205.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/205/pg205.txt"
    }
  },
  {
    id: 1232,
    title: "The Prince",
    authors: [{ name: "Machiavelli, Niccolò" }],
    subjects: ["Politics", "Political science -- Early works to 1800", "State, The", "Philosophy"],
    languages: ["en"],
    download_count: 39000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/1232/pg1232.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/1232/pg1232.txt"
    }
  },
  {
    id: 23,
    title: "Narrative of the Life of Frederick Douglass, an American Slave",
    authors: [{ name: "Douglass, Frederick" }],
    subjects: ["Biography", "Douglass, Frederick, 1818-1895", "Slaves -- United States -- Biography", "Antislavery movements", "History"],
    languages: ["en"],
    download_count: 37000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/23/pg23.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/23/pg23.txt"
    }
  },
  {
    id: 76,
    title: "Adventures of Huckleberry Finn",
    authors: [{ name: "Twain, Mark" }],
    subjects: ["Adventure stories", "Humorous stories", "Mississippi River -- Fiction", "Missouri -- Fiction", "Classics", "Boys -- Fiction"],
    languages: ["en"],
    download_count: 36000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/76/pg76.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/76/pg76.txt"
    }
  },
  {
    id: 1952,
    title: "The Yellow Wallpaper",
    authors: [{ name: "Gilman, Charlotte Perkins" }],
    subjects: ["Feminist fiction", "Mentally ill women -- Fiction", "Horror tales", "Short stories", "Psychological fiction"],
    languages: ["en"],
    download_count: 35000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/1952/pg1952.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/1952/pg1952.txt"
    }
  },
  {
    id: 1260,
    title: "Jane Eyre: An Autobiography",
    authors: [{ name: "Brontë, Charlotte" }],
    subjects: ["Orphans -- Fiction", "Governesses -- Fiction", "England -- Fiction", "Romance fiction", "Classics", "Domestic fiction"],
    languages: ["en"],
    download_count: 34000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/1260/pg1260.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/1260/pg1260.txt"
    }
  },
  {
    id: 844,
    title: "The Importance of Being Earnest",
    authors: [{ name: "Wilde, Oscar" }],
    subjects: ["Comedy", "Drama", "English drama (Comedy)", "Courtship -- Drama"],
    languages: ["en"],
    download_count: 33000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/844/pg844.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/844/pg844.txt"
    }
  },
  {
    id: 33,
    title: "The Scarlet Letter",
    authors: [{ name: "Hawthorne, Nathaniel" }],
    subjects: ["Historical fiction", "Adultery -- Fiction", "Boston (Mass.) -- History -- Colonial period, ca. 1600-1775 -- Fiction", "Classics", "Psychological fiction"],
    languages: ["en"],
    download_count: 32000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/33/pg33.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/33/pg33.txt"
    }
  },
  {
    id: 219,
    title: "Heart of Darkness",
    authors: [{ name: "Conrad, Joseph" }],
    subjects: ["Imperialism -- Fiction", "Africa -- Fiction", "Psychological fiction", "Classics"],
    languages: ["en"],
    download_count: 31000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/219/pg219.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/219/pg219.txt"
    }
  },
  {
    id: 2600,
    title: "War and Peace",
    authors: [{ name: "Tolstoy, Leo, graf" }],
    subjects: ["Historical fiction", "Napoleonic Wars, 1800-1815 -- Campaigns -- Russia -- Fiction", "Russia -- History -- Alexander I, 1801-1825 -- Fiction", "Classics"],
    languages: ["en"],
    download_count: 30000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/2600/pg2600.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/2600/pg2600.txt"
    }
  },
  {
    id: 2554,
    title: "Crime and Punishment",
    authors: [{ name: "Dostoyevsky, Fyodor" }],
    subjects: ["Psychological fiction", "Murder -- Fiction", "Saint Petersburg (Russia) -- Fiction", "Classics"],
    languages: ["en"],
    download_count: 29000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/2554/pg2554.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/2554/pg2554.txt"
    }
  },
  {
    id: 1727,
    title: "The Odyssey",
    authors: [{ name: "Homer" }],
    subjects: ["Epic poetry, Greek -- Translations into English", "Odysseus, King of Ithaca (Mythological character) -- Poetry", "Poetry", "Classics"],
    languages: ["en"],
    download_count: 28000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/1727/pg1727.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/1727/pg1727.txt"
    }
  },
  {
    id: 2542,
    title: "A Doll's House: a play",
    authors: [{ name: "Ibsen, Henrik" }],
    subjects: ["Drama", "Man-woman relationships -- Drama", "Marriage -- Drama", "Play"],
    languages: ["en"],
    download_count: 27000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/2542/pg2542.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/2542/pg2542.txt"
    }
  },
  {
    id: 28052,
    title: "The Brothers Karamazov",
    authors: [{ name: "Dostoyevsky, Fyodor" }],
    subjects: ["Psychological fiction", "Didactic fiction", "Russia -- Fiction", "Fathers and sons -- Fiction", "Classics"],
    languages: ["en"],
    download_count: 26000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/28052/pg28052.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/28052/pg28052.txt"
    }
  },
  {
    id: 1400,
    title: "Great Expectations",
    authors: [{ name: "Dickens, Charles" }],
    subjects: ["Orphans -- Fiction", "England -- Fiction", "Benefactors -- Fiction", "Classics"],
    languages: ["en"],
    download_count: 25000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/1400/pg1400.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/1400/pg1400.txt"
    }
  },
  {
    id: 4300,
    title: "Ulysses",
    authors: [{ name: "Joyce, James" }],
    subjects: ["Dublin (Ireland) -- Fiction", "Psychological fiction", "Classics"],
    languages: ["en"],
    download_count: 24000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/4300/pg4300.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/4300/pg4300.txt"
    }
  },
  {
    id: 1184,
    title: "The Count of Monte Cristo",
    authors: [{ name: "Dumas, Alexandre" }],
    subjects: ["Adventure stories", "Historical fiction", "Revenge -- Fiction", "France -- History -- 19th century -- Fiction", "Classics"],
    languages: ["en"],
    download_count: 23000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/1184/pg1184.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/1184/pg1184.txt"
    }
  },
  {
    id: 120,
    title: "Treasure Island",
    authors: [{ name: "Stevenson, Robert Louis" }],
    subjects: ["Adventure stories", "Pirates -- Fiction", "Treasure trove -- Fiction", "Classics"],
    languages: ["en"],
    download_count: 22000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/120/pg120.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/120/pg120.txt"
    }
  },
  {
    id: 135,
    title: "Les Misérables",
    authors: [{ name: "Hugo, Victor" }],
    subjects: ["Historical fiction", "Orphans -- Fiction", "Paris (France) -- Fiction", "Ex-convicts -- Fiction", "Classics"],
    languages: ["en"],
    download_count: 21000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/135/pg135.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/135/pg135.txt"
    }
  },
  {
    id: 43,
    title: "The Strange Case of Dr. Jekyll and Mr. Hyde",
    authors: [{ name: "Stevenson, Robert Louis" }],
    subjects: ["Science fiction", "Horror tales", "London (England) -- Fiction", "Multiple personality -- Fiction", "Gothic fiction"],
    languages: ["en"],
    download_count: 20000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/43/pg43.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/43/pg43.txt"
    }
  },
  {
    id: 64317,
    title: "The Great Gatsby",
    authors: [{ name: "Fitzgerald, F. Scott (Francis Scott)" }],
    subjects: ["First loves -- Fiction", "Rich people -- Fiction", "Long Island (N.Y.) -- Fiction", "Classics"],
    languages: ["en"],
    download_count: 90000,
    formats: {
      "image/jpeg": "https://www.gutenberg.org/cache/epub/64317/pg64317.cover.medium.jpg",
      "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/64317/pg64317.txt"
    }
  }
];

const GUTENDEX_API_URL = "https://gutendex.com/books";
const GUTENDEX_SOURCE_PAGE_SIZE = 32;
const BOOK_LIST_PAGE_SIZE = GUTENDEX_SOURCE_PAGE_SIZE;
const BOOK_LIST_CACHE_MS = 1000 * 60 * 20;
const BOOK_READER_CACHE_MS = 1000 * 60 * 60 * 24;
const FETCH_TIMEOUT_MS = 6_000;

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
const bookListPayloadCache = new Map<string, { expiresAt: number; payload: BookListPayload }>();
const bookListInflight = new Map<string, Promise<BookListPayload>>();
const readerPayloadCache = new Map<number, { expiresAt: number; payload: BookReaderPayload }>();
const readerPayloadInflight = new Map<number, Promise<BookReaderPayload>>();

function deriveGenres(subjects: string[]) {
  const normalized = subjects.join(" ").toLowerCase();
  const matches = BOOK_GENRE_RULES
    .filter((rule) => rule.terms.some((term) => normalized.includes(term)))
    .map((rule) => rule.label);

  return matches.length ? matches.slice(0, 4) : ["Literary"];
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
}

function genreTermsFor(genre: string) {
  const normalizedGenre = normalizeText(genre);
  const matched = BOOK_GENRE_RULES.find((rule) => normalizeText(rule.label) === normalizedGenre);
  return matched ? matched.terms.map((term) => normalizeText(term)) : [];
}

function themedGenreScore(book: BookSummary, genre: string) {
  const normalizedGenre = normalizeText(genre);
  if (!normalizedGenre || normalizedGenre === "all") {
    return 1;
  }

  const textBlob = normalizeText(
    `${book.title} ${book.authors.join(" ")} ${book.summary} ${book.tagline} ${book.subjects.join(" ")} ${book.genres.join(" ")}`,
  );
  const directGenre = book.genres.some((entry) => normalizeText(entry) === normalizedGenre);
  const subjectLine = normalizeText(book.subjects.join(" "));
  const terms = genreTermsFor(genre);
  let score = 0;

  if (directGenre) score += 6;
  if (subjectLine.includes(normalizedGenre)) score += 4;
  for (const term of terms) {
    if (textBlob.includes(term)) {
      score += term.includes(" ") ? 2 : 1;
    }
  }

  return score;
}

function relevanceScore(book: BookSummary, query: string) {
  const terms = tokenize(query);
  if (!terms.length) {
    return 0;
  }

  const title = normalizeText(book.title);
  const authors = normalizeText(book.authors.join(" "));
  const subjects = normalizeText(book.subjects.join(" "));
  const summary = normalizeText(`${book.summary} ${book.tagline}`);
  let score = 0;

  for (const term of terms) {
    if (title.includes(term)) score += 10;
    if (authors.includes(term)) score += 6;
    if (subjects.includes(term)) score += 4;
    if (summary.includes(term)) score += 2;
  }

  return score;
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
  
  const rawSummary = book.summaries?.find(Boolean)?.trim() || `A Project Gutenberg edition of ${cleanedTitle}.`;
  
  // Clean summary: remove half-cut text and limit length
  const summary = rawSummary.length > 280 ? rawSummary.substring(0, 277) + "..." : rawSummary;
  
  // Generate a clean tagline from the subjects or summary
  const tagline = book.subjects?.[0]?.split("--")[0]?.trim() || "A classic literary work";

  const downloadCount = book.download_count ?? 0;
  const pageCountEstimate = Math.max(80, Math.min(960, Math.round(120 + downloadCount / 20)));

  const modernCover = getModernCoverOverride(book.id);

  return {
    id: book.id,
    title: cleanedTitle,
    authors,
    summary,
    tagline,
    coverUrl: modernCover ?? book.formats?.["image/jpeg"] ?? null,
    subjects: (book.subjects ?? []).slice(0, 10),
    genres: deriveGenres(book.subjects ?? []),
    languages: book.languages ?? [],
    downloadCount,
    pageCountEstimate,
  };
}

function fetchWithTimeout(input: string | URL, init?: RequestInit & { timeout?: number }) {
  const { timeout = FETCH_TIMEOUT_MS, ...rest } = init ?? {};
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(input, { ...rest, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function fetchGutendex(url: URL) {
  const cacheKey = url.toString();
  const cached = gutendexResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return structuredClone(cached.payload);
  }

  const response = await fetchWithTimeout(cacheKey, {
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
  return structuredClone(payload);
}

async function fetchGutendexWithRetry(url: URL, attempts = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchGutendex(url);
    } catch (error) {
      lastError = error;
      // Don’t retry on AbortError — these are intentional cancellations.
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        break;
      }
      if (attempt < attempts) {
        // Exponential backoff: 400ms, 800ms
        await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Books request failed after retries");
}

async function fetchGutendexPage(page: number, searchTerms = ""): Promise<GutendexResponse> {
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
  return query
    .trim()
    .replace(/\s+/g, " ")
    .trim();
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
  const cacheKey = JSON.stringify({ page: safePage, query: searchTerms, genre });
  const cached = bookListPayloadCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  // Instant return for default landing page (page 1, no search query, no genre filter)
  // to avoid blocking SSR page rendering when Gutendex API is slow or offline.
  if (safePage === 1 && !query.trim() && (genre === "All" || !genre)) {
    const collected = FALLBACK_BOOKS.map(mapBook);
    const nextPayload = {
      page: 1,
      totalPages: Math.max(1, Math.ceil(collected.length / BOOK_LIST_PAGE_SIZE)),
      totalResults: collected.length,
      availableGenres: AVAILABLE_BOOK_GENRES,
      items: collected,
    } satisfies BookListPayload;
    return nextPayload;
  }


  const inflight = bookListInflight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    const normalizedGenre = normalizeForSearch(genre);
    const needThemedFiltering = Boolean(normalizedGenre && normalizedGenre !== "all");
    const scannedPages = needThemedFiltering ? 3 : 1;
    const collected: BookSummary[] = [];
    const seen = new Set<number>();
    let sourceCount = 0;

    const pagePromises = Array.from({ length: scannedPages }, (_, offset) =>
      fetchGutendexPage(safePage + offset, searchTerms)
    );
    const pageResults = await Promise.allSettled(pagePromises);

    for (const result of pageResults) {
      if (result.status === "rejected") continue;
      const payload = result.value;
      sourceCount = payload.count || sourceCount;
      const mappedItems = payload.results.map((book): BookSummary => mapBook(book));

      for (const item of mappedItems) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);

        const themeScore = themedGenreScore(item, genre);
        if (needThemedFiltering && themeScore <= 0) {
          continue;
        }

        collected.push(item);
      }
    }

    // Fall back to local Gutenberg catalog if API timed out/failed and returned empty results
    if (collected.length === 0) {
      const fallbackSummaries = FALLBACK_BOOKS.map(mapBook);
      for (const item of fallbackSummaries) {
        if (seen.has(item.id)) continue;
        
        const themeScore = themedGenreScore(item, genre);
        if (needThemedFiltering && themeScore <= 0) {
          continue;
        }
        
        collected.push(item);
      }
      sourceCount = collected.length;
    }

    const filtered = collected
      .map((item) => ({
        item,
        score: relevanceScore(item, query) + themedGenreScore(item, genre) * 3,
      }))
      .filter((entry) => {
        // If there's a query, filter out items that don't match the query
        if (query.trim() && relevanceScore(entry.item, query) <= 0) {
          return false;
        }
        return true;
      });

    const mappedItems = filtered
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return right.item.downloadCount - left.item.downloadCount;
      })
      .map((entry) => entry.item)
      .slice(0, BOOK_LIST_PAGE_SIZE);

    const nextPayload = {
      page: safePage,
      totalPages: Math.max(1, Math.ceil((sourceCount || mappedItems.length || 1) / BOOK_LIST_PAGE_SIZE)),
      totalResults: needThemedFiltering ? Math.max(mappedItems.length, Math.min(sourceCount, mappedItems.length * 6)) : (sourceCount || mappedItems.length),
      availableGenres: AVAILABLE_BOOK_GENRES,
      items: mappedItems,
    } satisfies BookListPayload;

    bookListPayloadCache.set(cacheKey, {
      expiresAt: Date.now() + BOOK_LIST_CACHE_MS,
      payload: nextPayload,
    });

    return nextPayload;
  })();

  bookListInflight.set(cacheKey, request);

  try {
    return await request;
  } finally {
    bookListInflight.delete(cacheKey);
  }
}

export async function fetchBookSummary(bookId: number): Promise<BookSummary> {
  const local = FALLBACK_BOOKS.find((b) => b.id === bookId);
  if (local) {
    return mapBook(local);
  }

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

  const foundLocal: BookSummary[] = [];
  const missingIds: number[] = [];

  for (const id of normalizedIds) {
    const local = FALLBACK_BOOKS.find((b) => b.id === id);
    if (local) {
      foundLocal.push(mapBook(local));
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) {
    const order = new Map(normalizedIds.map((id, index) => [id, index]));
    return foundLocal.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
  }

  try {
    const url = new URL(GUTENDEX_API_URL);
    url.searchParams.set("ids", missingIds.join(","));

    const payload = await fetchGutendex(url);
    const mapped = payload.results.map(mapBook);
    const combined = [...foundLocal, ...mapped];
    const order = new Map(normalizedIds.map((id, index) => [id, index]));

    return combined.sort((left: BookSummary, right: BookSummary) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
  } catch (error) {
    if (foundLocal.length > 0) {
      const order = new Map(normalizedIds.map((id, index) => [id, index]));
      return foundLocal.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
    }
    throw error;
  }
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
    let book: GutendexBook | undefined;
    
    // Check fallback list first
    const local = FALLBACK_BOOKS.find((b) => b.id === bookId);
    if (local) {
      book = local;
    } else {
      try {
        const url = new URL(GUTENDEX_API_URL);
        url.searchParams.set("ids", String(bookId));

        const payload = await fetchGutendex(url);
        book = payload.results[0];
      } catch (err) {
        console.error("Failed to fetch book summary from Gutendex:", err);
      }
    }

    if (!book) {
      throw new Error("Book not found");
    }

    const readableUrl = pickReadableFormat(book);
    if (!readableUrl) {
      throw new Error("No readable format available for this book");
    }

    const contentResponse = await fetchWithTimeout(readableUrl, {
      next: { revalidate: 86400 },
      timeout: 20_000,
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
