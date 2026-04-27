export type BookTheme = "dark" | "light";

export type BookReaderFont = "serif" | "sans";

export type BookReaderSettings = {
  theme: BookTheme;
  fontScale: number;
  lineHeight: number;
  pageWidth: number;
  paragraphSpacing: number;
  fontFamily: BookReaderFont;
};

export type BookSummary = {
  id: number;
  title: string;
  authors: string[];
  summary: string;
  coverUrl: string | null;
  subjects: string[];
  genres: string[];
  languages: string[];
  downloadCount: number;
  pageCountEstimate: number;
};

export type BookListPayload = {
  page: number;
  totalPages: number;
  totalResults: number;
  availableGenres?: string[];
  items: BookSummary[];
};

export type BookReaderPayload = {
  book: BookSummary;
  paragraphs: string[];
};

export type StoredBookProgress = {
  bookId: number;
  currentPage: number;
  percent: number;
  updatedAt: number;
};
