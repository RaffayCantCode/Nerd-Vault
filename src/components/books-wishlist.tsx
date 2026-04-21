"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookCover } from "@/components/book-cover";
import { BooksSidebar } from "@/components/books-sidebar";
import { NVLoader } from "@/components/nv-loader";
import { readBookTheme, readBookWishlist, subscribeBooksChange, toggleBookWishlist } from "@/lib/book-client";
import { BookListPayload, BookSummary, BookTheme } from "@/lib/book-types";

const emptyPayload: BookListPayload = {
  page: 1,
  totalPages: 1,
  totalResults: 0,
  items: [],
};

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

export function BooksWishlist() {
  const [theme, setTheme] = useState<BookTheme>("dark");
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [items, setItems] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setTheme(readBookTheme());
      setWishlistIds(readBookWishlist());
    };

    sync();
    return subscribeBooksChange(sync);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadWishlist() {
      if (!wishlistIds.length) {
        setItems([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/books?ids=${wishlistIds.join(",")}`, { cache: "no-store" });
        const payload = (await response.json()) as BookListPayload & { ok?: boolean; message?: string };

        if (!response.ok || payload.ok === false) {
          throw new Error(payload.message || "Could not load your wishlist");
        }

        if (active) {
          setItems(payload.items);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Could not load your wishlist");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadWishlist();

    return () => {
      active = false;
    };
  }, [wishlistIds]);

  return (
    <div className="books-shell" data-theme={theme}>
      <BooksSidebar theme={theme} active="wishlist" />

      <main className="books-main">
        <section className="books-hero books-wishlist-hero">
          <div className="books-hero-copy">
            <p className="books-eyebrow">Wishlist</p>
            <h1 className="books-title">Your saved shelf for books you want to come back to.</h1>
            <p className="books-copy">
              Keep a clean shortlist of Project Gutenberg books you plan to read next, without mixing them into the main media side of the app.
            </p>
            <div className="books-hero-metadata">
              <span>{wishlistIds.length} saved</span>
              <span>Project Gutenberg only</span>
              <span>Reading-first space</span>
            </div>
          </div>

          <div className="books-feature-panel">
            <div className="books-feature-glow" />
            <div className="books-feature-card books-feature-card-wide">
              <p className="books-feature-label">Saved for later</p>
              <strong>Open any title when you are ready, or trim the list down as your mood changes.</strong>
              <span>Your wishlist stays lightweight and separate from progress tracking.</span>
            </div>
          </div>
        </section>

        <section className="books-library">
          <div className="books-section-head">
            <div>
              <p className="books-eyebrow">Saved books</p>
              <h2>{wishlistIds.length ? "Your wishlist" : "Nothing saved yet"}</h2>
            </div>
            <Link href="/books" className="books-card-button">
              Back to library
            </Link>
          </div>

          {error ? <div className="books-empty-state">{error}</div> : null}
          {loading ? (
            <div className="books-inline-loader">
              <NVLoader compact label="Loading your saved books..." />
            </div>
          ) : null}

          {!loading && !error && !items.length ? (
            <div className="books-empty-state books-empty-state-rich">
              <strong>No books in your wishlist yet.</strong>
              <span>Save any title from the library and it will show up here.</span>
              <Link href="/books" className="books-card-button books-card-button-primary">
                Browse books
              </Link>
            </div>
          ) : null}

          <div className="books-grid">
            {items.map((book) => (
              <article key={book.id} className="books-card">
                <Link href={`/books/${book.id}`} className="books-card-link">
                  <BookCover title={book.title} author={book.authors[0]} size="small" />
                  <div className="books-card-copy">
                    <p className="books-card-title">{book.title}</p>
                    <p className="books-card-author">{book.authors.join(", ") || "Unknown author"}</p>
                    <p className="books-card-summary">{book.summary}</p>
                  </div>
                </Link>
                <div className="books-card-meta">
                  <span>{book.pageCountEstimate} pages est.</span>
                  <span>{formatCompactNumber(book.downloadCount)} reads</span>
                </div>
                <div className="books-card-actions">
                  <Link href={`/books/${book.id}`} className="books-card-button books-card-button-primary">
                    Open book
                  </Link>
                  <button type="button" className="books-card-button" onClick={() => toggleBookWishlist(book.id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
