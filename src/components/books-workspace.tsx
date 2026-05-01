"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AuthRequiredModal } from "@/components/auth-required-modal";
import { BookCover } from "@/components/book-cover";
import { BooksSidebar } from "@/components/books-sidebar";
import { NVLoader } from "@/components/nv-loader";
import { clearBookProgress, fetchPersistedBookProgress, readBookTheme, readBookWishlist, subscribeBooksChange, toggleBookWishlist } from "@/lib/book-client";
import { BookListPayload, BookSummary, BookTheme } from "@/lib/book-types";

const emptyPayload: BookListPayload = {
  page: 1,
  totalPages: 1,
  totalResults: 0,
  availableGenres: [],
  items: [],
};
const booksPayloadCache = new Map<string, BookListPayload>();

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

export function BooksWorkspace({
  initialPayload = emptyPayload,
  initialQuery = "",
  initialGenre = "All",
  initialContinue = null,
  isSignedIn = false,
}: {
  initialPayload?: BookListPayload;
  initialQuery?: string;
  initialGenre?: string;
  initialContinue?: {
    bookId: number;
    title: string;
    author?: string;
    coverUrl?: string;
    currentPage: number;
    totalPages: number;
    percent: number;
  } | null;
  isSignedIn?: boolean;
}) {
  const [theme, setTheme] = useState<BookTheme>("dark");
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [activeGenre, setActiveGenre] = useState(initialGenre);
  const [page, setPage] = useState(initialPayload.page || 1);
  const [payload, setPayload] = useState<BookListPayload>(initialPayload);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [loading, setLoading] = useState(!initialPayload.items.length);
  const [error, setError] = useState<string | null>(null);
  const [continueReading, setContinueReading] = useState(initialContinue);
  const [clearingContinue, setClearingContinue] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const pathname = usePathname();

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

    fetchPersistedBookProgress()
      .then((payload) => {
        if (active && payload.continueReading) {
          setContinueReading(payload.continueReading);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const canUseInitial =
      initialPayload.items.length > 0 &&
      page === initialPayload.page &&
      submittedQuery === initialQuery &&
      activeGenre === initialGenre;

    if (canUseInitial) {
      setPayload(initialPayload);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    async function loadBooks() {
      setLoading(true);
      setError(null);

      try {
        const search = new URLSearchParams({ page: String(page) });
        if (submittedQuery.trim()) {
          search.set("query", submittedQuery.trim());
        }
        if (activeGenre !== "All") {
          search.set("genre", activeGenre);
        }

        const requestKey = search.toString();
        const cached = booksPayloadCache.get(requestKey);
        if (cached) {
          if (active) {
            setPayload(cached);
            setPage(cached.page || 1);
            setLoading(false);
          }
          return;
        }

        const response = await fetch(`/api/books?${requestKey}`, { cache: "force-cache" });
        const nextPayload = (await response.json()) as BookListPayload & { ok?: boolean; message?: string };

        if (!response.ok || nextPayload.ok === false) {
          throw new Error(nextPayload.message || "Could not load books");
        }

        if (active) {
          booksPayloadCache.set(requestKey, nextPayload);
          setPayload(nextPayload);
          setPage(nextPayload.page || 1);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Could not load books");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadBooks();

    return () => {
      active = false;
    };
  }, [activeGenre, initialGenre, initialPayload, initialQuery, page, submittedQuery]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSubmittedQuery(query);
  }

  function isWishlisted(book: BookSummary) {
    return wishlist.includes(book.id);
  }

  const genreChips = useMemo(
    () => ["All", ...(payload.availableGenres ?? [])],
    [payload.availableGenres],
  );

  function renderPager(position: "top" | "bottom") {
    return (
      <div className={`books-pager books-pager-${position}`}>
        <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
          Prev
        </button>
        <span>
          Page {payload.page} of {payload.totalPages}
        </span>
        <button type="button" disabled={page >= payload.totalPages || loading} onClick={() => setPage((current) => current + 1)}>
          Next
        </button>
      </div>
    );
  }

  return (
    <div className="books-shell" data-theme={theme}>
      <BooksSidebar theme={theme} active="library" />

      <main className="books-main">
        <section className="books-hero">
          <div className="books-hero-copy">
            <p className="books-eyebrow">Stories</p>
            <h1 className="books-title">A calmer room for reading, separate from the rest of your vault.</h1>
            <p className="books-copy">
              Browse Project Gutenberg books, sort by genre, save titles for later, and step into a dedicated reader when you are ready.
            </p>
            <form className="books-search" onSubmit={submitSearch}>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search authors, titles, or eras..."
                aria-label="Search books"
              />
              <button type="submit">Search</button>
            </form>
            <div className="books-genre-row">
              {genreChips.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  className={`books-genre-chip ${activeGenre === genre ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveGenre(genre);
                    setPage(1);
                  }}
                >
                  {genre}
                </button>
              ))}
            </div>
            <div className="books-hero-metadata">
              <span>{loading ? "Loading library..." : `${formatCompactNumber(payload.totalResults)} books found`}</span>
              <span>{wishlist.length} saved</span>
              <span>{payload.availableGenres?.length ?? 0} genres indexed</span>
            </div>
            {continueReading ? (
              <div className="books-continue-card">
                <div className="books-continue-copy">
                  <p className="books-feature-label">Continue reading</p>
                  <strong>{continueReading.title}</strong>
                  <span>
                    {continueReading.author || "Project Gutenberg"} · page {continueReading.currentPage} of {continueReading.totalPages}
                  </span>
                </div>
                <div className="books-continue-actions">
                  <Link href={`/books/${continueReading.bookId}/read`} className="books-card-button books-card-button-primary">
                    Continue
                  </Link>
                  <button
                    type="button"
                    className="books-card-button books-card-button-dismiss"
                    disabled={clearingContinue}
                    aria-label={`Remove ${continueReading.title} from continue reading`}
                    onClick={async () => {
                      if (!continueReading) {
                        return;
                      }

                      setClearingContinue(true);
                      await clearBookProgress(continueReading.bookId);
                      setContinueReading(null);
                      setClearingContinue(false);
                    }}
                  >
                    {clearingContinue ? "Removing..." : "×"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="books-feature-panel">
            <div className="books-feature-glow" />
            <div className="books-feature-stack">
              <div className="books-feature-card">
                <p className="books-feature-label">Reading flow</p>
                <strong>Open a book page first, then enter the full reader when you are ready.</strong>
                <span>The library now keeps fuller shelves, broader genre coverage, and stable next/previous paging.</span>
              </div>
              <BookCover title="Midnight Atlas" author="Reading room preview" />
            </div>
          </div>
        </section>

        <section className="books-library">
          <div className="books-section-head">
            <div>
              <p className="books-eyebrow">Library</p>
              <h2>{submittedQuery ? `Results for "${submittedQuery}"` : "Project Gutenberg library"}</h2>
              <p className="books-copy">
                {loading ? "Refreshing the catalog..." : `Showing ${payload.items.length} books on this page.`}
              </p>
            </div>
            <div className="books-pager">
              {renderPager("top")}
            </div>
          </div>

          {error ? <div className="books-empty-state">{error}</div> : null}
          {loading ? (
            <div className="books-inline-loader">
              <NVLoader compact label="Refreshing the library..." />
            </div>
          ) : null}

          <div className="books-grid">
            {payload.items.map((book) => (
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
                  <button
                    type="button"
                    className="books-card-button"
                    onClick={() => {
                      if (!isSignedIn) {
                        setShowAuthModal(true);
                        return;
                      }
                      toggleBookWishlist(book.id);
                    }}
                  >
                    {isWishlisted(book) ? "Saved" : "Wishlist"}
                  </button>
                </div>
              </article>
            ))}
          </div>

          {!loading && !payload.items.length && !error ? (
            <div className="books-empty-state">No books matched that search yet. Try another author, title, or genre.</div>
          ) : null}

          {!loading && payload.items.length ? renderPager("bottom") : null}
        </section>
      </main>
      <AuthRequiredModal
        isOpen={showAuthModal}
        title="Save books to your wishlist"
        message="You need to be logged in to add books to your wishlist and save them for later."
        redirectTo={pathname}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
