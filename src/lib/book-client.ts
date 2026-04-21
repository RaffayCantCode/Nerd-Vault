"use client";

import { BookTheme, StoredBookProgress } from "@/lib/book-types";

const BOOK_THEME_KEY = "nerdvault-books-theme-v1";
const BOOK_WISHLIST_KEY = "nerdvault-books-wishlist-v1";
const BOOK_PROGRESS_KEY = "nerdvault-books-progress-v1";
const BOOK_EVENT = "nerdvault-books-change";

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
  emitBooksChange();
}

export function readBookWishlist() {
  if (typeof window === "undefined") {
    return [] as number[];
  }

  return safeParse<number[]>(window.localStorage.getItem(BOOK_WISHLIST_KEY), []);
}

export function toggleBookWishlist(bookId: number) {
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
