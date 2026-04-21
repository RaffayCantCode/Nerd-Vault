export type BookTheme = "dark" | "light";

export type BookSummary = {
  id: number;
  title: string;
  authors: string[];
  summary: string;
  coverUrl: string | null;
  subjects: string[];
  languages: string[];
  downloadCount: number;
  pageCountEstimate: number;
};

export type BookListPayload = {
  page: number;
  totalPages: number;
  totalResults: number;
  items: BookSummary[];
};

export type BookReaderPayload = {
  book: BookSummary;
  paragraphs: string[];
};

export type StoredBookProgress = {
  bookId: number;
  paragraphIndex: number;
  percent: number;
  updatedAt: number;
};
