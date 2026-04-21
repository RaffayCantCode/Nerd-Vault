"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookCover } from "@/components/book-cover";
import { BooksSidebar } from "@/components/books-sidebar";
import { NVLoader } from "@/components/nv-loader";
import { readBookTheme, readBookWishlist, subscribeBooksChange, toggleBookWishlist } from "@/lib/book-client";
import { BookSummary, BookTheme } from "@/lib/book-types";

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

export function BookDetail({
  book,
  initialProgress = null,
}: {
  book: BookSummary;
  initialProgress?: {
    currentPage: number;
    totalPages: number;
    percent: number;
  } | null;
}) {
  const [theme, setTheme] = useState<BookTheme>("dark");
  const [wishlist, setWishlist] = useState<number[]>([]);

  useEffect(() => {
    const sync = () => {
      setTheme(readBookTheme());
      setWishlist(readBookWishlist());
    };

    sync();
    return subscribeBooksChange(sync);
  }, []);

  const isWishlisted = wishlist.includes(book.id);

  return (
    <div className="books-shell" data-theme={theme}>
      <BooksSidebar theme={theme} active="detail" currentBookTitle={book.title} />
      <main className="books-main">
        <section className="books-detail-hero">
          <div className="books-detail-copy">
            <p className="books-eyebrow">Book detail</p>
            <h1 className="books-title books-title-detail">{book.title}</h1>
            <p className="books-copy">
              {book.authors.join(", ") || "Unknown author"} · {book.pageCountEstimate} pages estimated · {formatCompactNumber(book.downloadCount)} reads
            </p>
            <div className="books-detail-tags">
              {book.genres.map((genre) => (
                <span key={genre}>{genre}</span>
              ))}
            </div>
            <p className="books-reader-summary">{book.summary}</p>
            <div className="books-reader-actions">
              <Link href={`/books/${book.id}/read`} className="books-card-button books-card-button-primary">
                {initialProgress ? "Resume reading" : "Read book"}
              </Link>
              <button type="button" className="books-card-button" onClick={() => toggleBookWishlist(book.id)}>
                {isWishlisted ? "Saved to wishlist" : "Add to wishlist"}
              </button>
              <Link href="/books" className="books-card-button">
                Back to library
              </Link>
            </div>
            <p className="books-progress-note">
              {initialProgress
                ? `Saved progress: page ${initialProgress.currentPage} of ${initialProgress.totalPages}.`
                : "No reading progress saved yet."}
            </p>
          </div>

          <div className="books-detail-art">
            <BookCover title={book.title} author={book.authors[0]} />
          </div>
        </section>

        <section className="books-library">
          <div className="books-section-head">
            <div>
              <p className="books-eyebrow">Edition info</p>
              <h2>Reading room overview</h2>
            </div>
          </div>
          <div className="books-detail-grid">
            <div className="books-detail-panel">
              <strong>Genres</strong>
              <p>{book.genres.join(" · ")}</p>
            </div>
            <div className="books-detail-panel">
              <strong>Languages</strong>
              <p>{book.languages.join(", ") || "English"}</p>
            </div>
            <div className="books-detail-panel">
              <strong>Subjects</strong>
              <p>{book.subjects.slice(0, 4).join(" · ") || "General literature"}</p>
            </div>
            <div className="books-detail-panel">
              <strong>Reader mode</strong>
              <p>Dedicated in-app paged reader with automatic resume and a calmer layout.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function BookLoadingShell({ label = "Opening your book..." }: { label?: string }) {
  const [theme, setTheme] = useState<BookTheme>("dark");

  useEffect(() => {
    setTheme(readBookTheme());
  }, []);

  return (
    <div className="books-shell" data-theme={theme}>
      <BooksSidebar theme={theme} active="detail" />
      <main className="books-main">
        <section className="books-loading-shell">
          <NVLoader label={label} />
        </section>
      </main>
    </div>
  );
}
