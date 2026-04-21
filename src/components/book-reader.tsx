"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookCover } from "@/components/book-cover";
import { BookReaderPayload, BookTheme } from "@/lib/book-types";
import {
  readBookProgress,
  readBookTheme,
  readBookWishlist,
  saveBookProgress,
  subscribeBooksChange,
  toggleBookWishlist,
  writeBookTheme,
} from "@/lib/book-client";

export function BookReader({ bookId }: { bookId: number }) {
  const [theme, setTheme] = useState<BookTheme>("dark");
  const [payload, setPayload] = useState<BookReaderPayload | null>(null);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const hasRestoredProgressRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

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
  }, [bookId]);

  useEffect(() => {
    if (!payload || !readerRef.current || hasRestoredProgressRef.current) {
      return;
    }

    const progress = readBookProgress(bookId);
    if (!progress) {
      hasRestoredProgressRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      const target = readerRef.current?.querySelector<HTMLElement>(`[data-paragraph="${progress.paragraphIndex}"]`);
      if (target && readerRef.current) {
        readerRef.current.scrollTop = Math.max(0, target.offsetTop - 28);
      } else if (readerRef.current) {
        const maxScroll = readerRef.current.scrollHeight - readerRef.current.clientHeight;
        readerRef.current.scrollTop = Math.max(0, Math.round(maxScroll * progress.percent));
      }

      hasRestoredProgressRef.current = true;
    }, 80);

    return () => window.clearTimeout(timer);
  }, [bookId, payload]);

  useEffect(() => {
    const reader = readerRef.current;
    if (!reader || !payload) {
      return;
    }

    function persistProgress() {
      if (!readerRef.current || !payload) {
        return;
      }

      const readerTop = readerRef.current.scrollTop;
      const maxScroll = Math.max(1, readerRef.current.scrollHeight - readerRef.current.clientHeight);
      const percent = Math.max(0, Math.min(1, readerTop / maxScroll));
      const paragraphs = Array.from(readerRef.current.querySelectorAll<HTMLElement>("[data-paragraph]"));
      const activeParagraph =
        paragraphs.find((paragraph) => paragraph.offsetTop + paragraph.offsetHeight >= readerTop + 24) ?? paragraphs[paragraphs.length - 1];
      const paragraphIndex = Number(activeParagraph?.dataset.paragraph ?? "0");

      saveBookProgress({
        bookId,
        paragraphIndex: Number.isFinite(paragraphIndex) ? paragraphIndex : 0,
        percent,
        updatedAt: Date.now(),
      });
    }

    function handleScroll() {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(persistProgress, 180);
    }

    reader.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      reader.removeEventListener("scroll", handleScroll);
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [bookId, payload]);

  const isWishlisted = useMemo(() => wishlist.includes(bookId), [bookId, wishlist]);

  if (loading) {
    return <div className="books-reader-shell" data-theme={theme}><div className="books-empty-state">Preparing your reading room...</div></div>;
  }

  if (error || !payload) {
    return (
      <div className="books-reader-shell" data-theme={theme}>
        <div className="books-empty-state">{error || "This book could not be loaded."}</div>
      </div>
    );
  }

  return (
    <div className="books-reader-shell" data-theme={theme}>
      <aside className="books-reader-sidebar">
        <Link href="/" className="books-brand">NV</Link>
        <button type="button" className="books-theme-toggle" onClick={() => writeBookTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <Link href="/books" className="books-sidebar-link is-active">Library</Link>
        <Link href="/" className="books-sidebar-link">Landing</Link>
      </aside>

      <main className="books-reader-main">
        <section className="books-reader-hero">
          <div className="books-reader-copy">
            <p className="books-eyebrow">Reading now</p>
            <h1>{payload.book.title}</h1>
            <p className="books-copy">
              {payload.book.authors.join(", ") || "Unknown author"} · {payload.book.pageCountEstimate} pages estimated · resume tracking enabled
            </p>
            <div className="books-reader-actions">
              <Link href="/books" className="books-card-button books-card-button-primary">Back to library</Link>
              <button type="button" className="books-card-button" onClick={() => toggleBookWishlist(bookId)}>
                {isWishlisted ? "Saved to wishlist" : "Add to wishlist"}
              </button>
            </div>
            <p className="books-reader-summary">{payload.book.summary}</p>
          </div>

          <div className="books-reader-art">
            <BookCover title={payload.book.title} author={payload.book.authors[0]} />
          </div>
        </section>

        <section className="books-reader-panel">
          <div className="books-reader-toolbar">
            <div>
              <p className="books-eyebrow">Reader</p>
              <strong>Scroll to read. Your position is saved automatically.</strong>
            </div>
          </div>
          <div ref={readerRef} className="books-reader-content">
            {payload.paragraphs.map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 20)}`} data-paragraph={index} className="books-reader-paragraph">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
