"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BooksSidebar } from "@/components/books-sidebar";
import { NVLoader } from "@/components/nv-loader";
import { fetchPersistedBookProgress, readBookTheme, readBookWishlist, saveBookProgress, subscribeBooksChange, toggleBookWishlist } from "@/lib/book-client";
import { BookReaderPayload, BookTheme } from "@/lib/book-types";

function paginateParagraphs(paragraphs: string[], targetSize = 2600) {
  const pages: string[][] = [];
  let currentPage: string[] = [];
  let currentSize = 0;

  for (const paragraph of paragraphs) {
    const paragraphSize = paragraph.length;

    if (currentPage.length && currentSize + paragraphSize > targetSize) {
      pages.push(currentPage);
      currentPage = [];
      currentSize = 0;
    }

    currentPage.push(paragraph);
    currentSize += paragraphSize;
  }

  if (currentPage.length) {
    pages.push(currentPage);
  }

  return pages;
}

export function BookReader({
  bookId,
  initialPayload = null,
  initialProgress = null,
  isSignedIn = false,
}: {
  bookId: number;
  initialPayload?: BookReaderPayload | null;
  initialProgress?: {
    currentPage: number;
    totalPages: number;
    percent: number;
  } | null;
  isSignedIn?: boolean;
}) {
  const [theme, setTheme] = useState<BookTheme>("dark");
  const [payload, setPayload] = useState<BookReaderPayload | null>(initialPayload);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [loading, setLoading] = useState(!initialPayload);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(Math.max(1, initialProgress?.currentPage ?? 1));
  const [hasResolvedSavedPage, setHasResolvedSavedPage] = useState(Boolean(initialProgress));

  useEffect(() => {
    const sync = () => {
      setTheme(readBookTheme());
      setWishlist(readBookWishlist());
    };

    sync();
    return subscribeBooksChange(sync);
  }, []);

  useEffect(() => {
    let active = true;

    if (initialPayload) {
      return () => {
        active = false;
      };
    }

    async function loadBook() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/books/${bookId}`, { cache: "no-store" });
        const nextPayload = (await response.json()) as BookReaderPayload & { ok?: boolean; message?: string };

        if (!response.ok || nextPayload.ok === false) {
          throw new Error(nextPayload.message || "Could not open this book");
        }

        if (active) {
          setPayload(nextPayload);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Could not open this book");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadBook();

    return () => {
      active = false;
    };
  }, [bookId, initialPayload]);

  const pages = useMemo(() => (payload ? paginateParagraphs(payload.paragraphs) : []), [payload]);
  const totalPages = Math.max(1, pages.length);

  useEffect(() => {
    setCurrentPage((page) => Math.max(1, Math.min(initialProgress?.currentPage ?? page, totalPages)));
  }, [initialProgress?.currentPage, totalPages]);

  useEffect(() => {
    if (!payload) {
      return;
    }

    let active = true;

    async function syncSavedProgress() {
      if (initialProgress) {
        setHasResolvedSavedPage(true);
        return;
      }

      try {
        const saved = await fetchPersistedBookProgress(bookId);
        if (!active) {
          return;
        }

        if (saved.progress?.currentPage) {
          setCurrentPage(Math.max(1, Math.min(saved.progress.currentPage, totalPages)));
        }
      } catch {
        // Ignore and keep current page fallback.
      } finally {
        if (active) {
          setHasResolvedSavedPage(true);
        }
      }
    }

    void syncSavedProgress();

    return () => {
      active = false;
    };
  }, [bookId, initialProgress, payload, totalPages]);

  useEffect(() => {
    if (!payload || !pages.length || !hasResolvedSavedPage) {
      return;
    }

    void saveBookProgress({
      bookId,
      title: payload.book.title,
      author: payload.book.authors[0],
      coverUrl: payload.book.coverUrl ?? undefined,
      currentPage,
      totalPages,
      percent: totalPages <= 1 ? 1 : (currentPage - 1) / (totalPages - 1),
      updatedAt: Date.now(),
    });
  }, [bookId, currentPage, hasResolvedSavedPage, pages.length, payload, totalPages]);

  const isWishlisted = wishlist.includes(bookId);

  if (loading) {
    return (
      <div className="books-reader-shell" data-theme={theme}>
        <BooksSidebar theme={theme} active="reader" />
        <main className="books-reader-main">
          <section className="books-loading-shell">
            <NVLoader label="Preparing your reading room..." />
          </section>
        </main>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="books-reader-shell" data-theme={theme}>
        <BooksSidebar theme={theme} active="reader" />
        <main className="books-reader-main">
          <div className="books-empty-state">{error || "This book could not be loaded."}</div>
        </main>
      </div>
    );
  }

  const visiblePage = pages[Math.max(0, currentPage - 1)] ?? [];

  return (
    <div className="books-reader-shell" data-theme={theme}>
      <BooksSidebar theme={theme} active="reader" currentBookTitle={payload.book.title} />

      <main className="books-reader-main">
        <section className="books-reader-topbar">
          <div className="books-reader-copy">
            <p className="books-eyebrow">Reader</p>
            <h1 className="books-reader-title">{payload.book.title}</h1>
            <p className="books-copy">
              {payload.book.authors.join(", ") || "Unknown author"} · page {currentPage} of {totalPages}
            </p>
            {!isSignedIn ? (
              <p className="books-reader-guest-note">
                Sign in to keep this page saved and continue later from exactly where you stop.
              </p>
            ) : null}
          </div>
          <div className="books-reader-actions">
            {!isSignedIn ? (
              <Link href="/sign-in" className="books-card-button books-card-button-primary">
                Sign in to save
              </Link>
            ) : null}
            <Link href={`/books/${bookId}`} className="books-card-button">Book info</Link>
            <Link href="/books" className="books-card-button">Library</Link>
            <button type="button" className="books-card-button" onClick={() => toggleBookWishlist(bookId)}>
              {isWishlisted ? "Saved to wishlist" : "Add to wishlist"}
            </button>
          </div>
        </section>

        <section className="books-reader-panel books-reader-panel-immersive">
          <div className="books-reader-toolbar">
            <div>
              <p className="books-eyebrow">Paged reader</p>
              <strong>Turn pages and resume exactly from the saved page.</strong>
            </div>
            <div className="books-page-controls">
              <button type="button" className="books-card-button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                Previous page
              </button>
              <span className="books-page-indicator">{currentPage} / {totalPages}</span>
              <button type="button" className="books-card-button books-card-button-primary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                Next page
              </button>
            </div>
          </div>
          <div className="books-reader-content books-reader-content-paged">
            {visiblePage.map((paragraph, index) => (
              <p key={`${currentPage}-${index}-${paragraph.slice(0, 20)}`} className="books-reader-paragraph">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
