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
  initialContinue = [],
  isSignedIn = false,
}: {
  initialPayload?: BookListPayload;
  initialQuery?: string;
  initialGenre?: string;
  initialContinue?: Array<{
    bookId: number;
    title: string;
    author?: string;
    coverUrl?: string;
    currentPage: number;
    totalPages: number;
    percent: number;
  }>;
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
  const [continueReading, setContinueReading] = useState(initialContinue || []);
  const [clearingContinue, setClearingContinue] = useState<number | null>(null);
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
        if (active && payload.continueReadingList) {
          setContinueReading(payload.continueReadingList);
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
          if (page === 1) {
            setPayload(nextPayload);
          } else {
            setPayload(prev => ({ ...nextPayload, items: [...prev.items, ...nextPayload.items] }));
          }
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

  function renderLoadMore() {
    if (page >= payload.totalPages) return null;
    return (
      <div className="books-pager-bottom" style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
        <button 
          type="button" 
          disabled={loading} 
          onClick={() => setPage((current) => current + 1)}
          className="button button-secondary"
        >
          {loading ? "Loading..." : "Load More"}
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
            {continueReading && continueReading.length > 0 ? (
              <div className="books-continue-section" style={{ marginTop: 32 }}>
                <h2 className="books-eyebrow" style={{ marginBottom: 16 }}>Continue Reading</h2>
                <div className="books-horizontal-scroll" style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, scrollSnapType: 'x mandatory' }}>
                  {continueReading.map((item) => (
                    <div key={item.bookId} className="books-continue-card" style={{ flex: '0 0 auto', width: 300, scrollSnapAlign: 'start' }}>
                      <div className="books-continue-copy">
                        <strong>{item.title}</strong>
                        <span>
                          {item.author || "Project Gutenberg"} · page {item.currentPage} of {item.totalPages}
                        </span>
                        <div style={{ marginTop: 8, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${item.percent * 100}%`, background: 'var(--color-primary-500)' }} />
                        </div>
                      </div>
                      <div className="books-continue-actions">
                        <Link href={`/books/${item.bookId}/read`} className="books-card-button books-card-button-primary">
                          Continue
                        </Link>
                        <button
                          type="button"
                          className="books-card-button books-card-button-dismiss"
                          disabled={clearingContinue === item.bookId}
                          aria-label={`Remove ${item.title} from continue reading`}
                          onClick={async () => {
                            setClearingContinue(item.bookId);
                            await clearBookProgress(item.bookId);
                            setContinueReading(prev => prev.filter(b => b.bookId !== item.bookId));
                            setClearingContinue(null);
                          }}
                        >
                          {clearingContinue === item.bookId ? "..." : "×"}
                        </button>
                      </div>
                    </div>
                  ))}
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

          {renderLoadMore()}
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
