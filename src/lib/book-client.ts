"use client";

import { BookReaderSettings, BookTheme, StoredBookProgress } from "@/lib/book-types";

const BOOK_THEME_KEY = "nerdvault-books-theme-v1";
const BOOK_WISHLIST_KEY = "nerdvault-books-wishlist-v1";
const BOOK_PROGRESS_KEY = "nerdvault-books-progress-v1";
const BOOK_READER_SETTINGS_KEY = "nerdvault-books-reader-settings-v1";
const BOOK_EVENT = "nerdvault-books-change";

const DEFAULT_BOOK_READER_SETTINGS: BookReaderSettings = {
  theme: "dark",
  fontScale: 100,
  lineHeight: 1.8,
  pageWidth: 760,
  paragraphSpacing: 1.15,
  fontFamily: "serif",
};

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function emitBooksChange() {
  window.dispatchEvent(new Event(BOOK_EVENT));
}

export function subscribeBooksChange(callback: () => void) {
  window.addEventListener(BOOK_EVENT, callback);
  return () => window.removeEventListener(BOOK_EVENT, callback);
}

export function readBookTheme(): BookTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(BOOK_THEME_KEY);
  return stored === "light" ? "light" : "dark";
}

export function writeBookTheme(theme: BookTheme) {
  window.localStorage.setItem(BOOK_THEME_KEY, theme);
  const nextSettings = {
    ...readBookReaderSettings(),
    theme,
  };
  window.localStorage.setItem(BOOK_READER_SETTINGS_KEY, JSON.stringify(nextSettings));
  emitBooksChange();
}

export function readBookReaderSettings(): BookReaderSettings {
  if (typeof window === "undefined") {
    return DEFAULT_BOOK_READER_SETTINGS;
  }

  const parsed = safeParse<Partial<BookReaderSettings>>(window.localStorage.getItem(BOOK_READER_SETTINGS_KEY), {});
  const theme = parsed.theme === "light" ? "light" : parsed.theme === "dark" ? "dark" : readBookTheme();

  return {
    theme,
    fontScale: Number.isFinite(parsed.fontScale) ? Math.max(85, Math.min(170, Number(parsed.fontScale))) : DEFAULT_BOOK_READER_SETTINGS.fontScale,
    lineHeight: Number.isFinite(parsed.lineHeight) ? Math.max(1.4, Math.min(2.3, Number(parsed.lineHeight))) : DEFAULT_BOOK_READER_SETTINGS.lineHeight,
    pageWidth: Number.isFinite(parsed.pageWidth) ? Math.max(620, Math.min(1120, Number(parsed.pageWidth))) : DEFAULT_BOOK_READER_SETTINGS.pageWidth,
    paragraphSpacing: Number.isFinite(parsed.paragraphSpacing) ? Math.max(0.75, Math.min(1.8, Number(parsed.paragraphSpacing))) : DEFAULT_BOOK_READER_SETTINGS.paragraphSpacing,
    fontFamily: parsed.fontFamily === "sans" ? "sans" : "serif",
  };
}

export function writeBookReaderSettings(settings: BookReaderSettings) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = {
    ...settings,
    theme: settings.theme === "light" ? "light" : "dark",
    fontScale: Math.max(85, Math.min(170, settings.fontScale)),
    lineHeight: Math.max(1.4, Math.min(2.3, settings.lineHeight)),
    pageWidth: Math.max(620, Math.min(1120, settings.pageWidth)),
    paragraphSpacing: Math.max(0.75, Math.min(1.8, settings.paragraphSpacing)),
    fontFamily: settings.fontFamily === "sans" ? "sans" : "serif",
  } satisfies BookReaderSettings;

  window.localStorage.setItem(BOOK_READER_SETTINGS_KEY, JSON.stringify(normalized));
  window.localStorage.setItem(BOOK_THEME_KEY, normalized.theme);
  emitBooksChange();
}

export function resetBookReaderSettings() {
  writeBookReaderSettings(DEFAULT_BOOK_READER_SETTINGS);
}

export function readBookWishlist() {
  if (typeof window === "undefined") {
    return [] as number[];
  }

  return safeParse<number[]>(window.localStorage.getItem(BOOK_WISHLIST_KEY), []);
}

export function toggleBookWishlist(bookId: number) {
  if (typeof window === "undefined") {
    return;
  }

  const next = new Set(readBookWishlist());
  if (next.has(bookId)) {
    next.delete(bookId);
  } else {
    next.add(bookId);
  }

  window.localStorage.setItem(BOOK_WISHLIST_KEY, JSON.stringify([...next]));
  emitBooksChange();
}

export function readBookProgressMap() {
  if (typeof window === "undefined") {
    return {} as Record<string, StoredBookProgress>;
  }

  return safeParse<Record<string, StoredBookProgress>>(window.localStorage.getItem(BOOK_PROGRESS_KEY), {});
}

export function readBookProgress(bookId: number) {
  return readBookProgressMap()[String(bookId)] ?? null;
}

export function saveLocalBookProgress(progress: StoredBookProgress) {
  const next = {
    ...readBookProgressMap(),
    [String(progress.bookId)]: progress,
  };

  window.localStorage.setItem(BOOK_PROGRESS_KEY, JSON.stringify(next));
  emitBooksChange();
}

export function clearLocalBookProgress(bookId: number) {
  const next = { ...readBookProgressMap() };
  delete next[String(bookId)];
  window.localStorage.setItem(BOOK_PROGRESS_KEY, JSON.stringify(next));
  emitBooksChange();
}

export async function fetchPersistedBookProgress(bookId?: number) {
  const search = new URLSearchParams();
  if (typeof bookId === "number" && Number.isFinite(bookId)) {
    search.set("bookId", String(bookId));
  }

  const response = await fetch(`/api/books/progress${search.toString() ? `?${search.toString()}` : ""}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not load saved progress");
  }

  return response.json() as Promise<{
    ok: boolean;
    progress: {
      bookId: number;
      title: string;
      author?: string;
      coverUrl?: string;
      currentPage: number;
      totalPages: number;
      percent: number;
      updatedAt: string;
    } | null;
    continueReading: {
      bookId: number;
      title: string;
      author?: string;
      coverUrl?: string;
      currentPage: number;
      totalPages: number;
      percent: number;
      updatedAt: string;
    } | null;
  }>;
}

export async function saveBookProgress(progress: StoredBookProgress & { title: string; author?: string; coverUrl?: string; totalPages: number }) {
  saveLocalBookProgress(progress);

  try {
    const response = await fetch("/api/books/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookId: progress.bookId,
        title: progress.title,
        author: progress.author,
        coverUrl: progress.coverUrl,
        currentPage: progress.currentPage,
        totalPages: progress.totalPages,
        percent: progress.percent,
      }),
    });

    if (!response.ok) {
      throw new Error("Progress save failed");
    }
  } catch {
    // Keep local fallback progress for guests or temporary network issues.
  }
}

export async function clearBookProgress(bookId: number) {
  clearLocalBookProgress(bookId);

  try {
    const response = await fetch(`/api/books/progress?bookId=${bookId}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 401) {
      throw new Error("Progress clear failed");
    }
  } catch {
    // Local fallback still clears the continue state in this browser.
  }
}
