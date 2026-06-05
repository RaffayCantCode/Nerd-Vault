"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

type SortMode = "relevance" | "title" | "author" | "popularity" | "length";
const BOOKS_CLIENT_CACHE_TTL = 5 * 60 * 1000;
const BOOKS_CACHE_MAX = 50;
const booksPayloadCache = new Map<string, { data: BookListPayload; ts: number }>();
const booksInflightCache = new Map<string, Promise<BookListPayload & { ok?: boolean; message?: string }>>();

function getCachedPayload(key: string): BookListPayload | undefined {
  const entry = booksPayloadCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > BOOKS_CLIENT_CACHE_TTL) {
    booksPayloadCache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setCachedPayload(key: string, payload: BookListPayload): void {
  booksPayloadCache.set(key, { data: payload, ts: Date.now() });
  if (booksPayloadCache.size > BOOKS_CACHE_MAX) {
    const oldest = booksPayloadCache.keys().next().value;
    if (oldest) booksPayloadCache.delete(oldest);
  }
}

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
  const router = useRouter();
  const [theme, setTheme] = useState<BookTheme>("dark");
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [activeGenre, setActiveGenre] = useState(initialGenre);
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const [page, setPage] = useState(initialPayload.page || 1);
  const [payload, setPayload] = useState<BookListPayload>(initialPayload);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [loading, setLoading] = useState(!initialPayload.items.length);
  const [error, setError] = useState<string | null>(null);
  const [continueReading, setContinueReading] = useState(initialContinue || []);
  const [clearingContinue, setClearingContinue] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const pathname = usePathname();
  const currentRequestKey = useMemo(() => {
    const search = new URLSearchParams({ page: String(page) });
    if (submittedQuery.trim()) {
      search.set("query", submittedQuery.trim());
    }
    if (activeGenre !== "All") {
      search.set("genre", activeGenre);
    }
    return search.toString();
  }, [activeGenre, page, submittedQuery]);

  useEffect(() => {
    const sync = () => {
      setTheme(readBookTheme());
      setWishlist(readBookWishlist());
    };

    sync();
    return subscribeBooksChange(sync);
  }, []);

  useEffect(() => {
    if (initialContinue.length > 0) return;
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
  }, [initialContinue.length]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    // 15s client-side timeout — prevents infinite loading when gutendex.com is slow/down.
    const timeoutId = window.setTimeout(() => controller.abort(new DOMException("Books request timed out", "TimeoutError")), 25_000);
    const canUseInitial =
      initialPayload.items.length > 0 &&
      page === initialPayload.page &&
      submittedQuery === initialQuery &&
      activeGenre === initialGenre;

    if (canUseInitial) {
      setPayload(initialPayload);
      setLoading(false);
      clearTimeout(timeoutId);
      controller.abort();
      return () => {
        active = false;
      };
    }

    async function loadBooks() {
      setLoading(true);
      setError(null);

      try {
        const requestKey = currentRequestKey;
        const cached = getCachedPayload(requestKey);
        if (cached) {
          if (active) {
            setPayload((prev) => page === 1 ? cached : ({ ...cached, items: dedupeBooks([...prev.items, ...cached.items]) }));
            setPage(cached.page || 1);
            setLoading(false);
          }
          return;
        }

        // Use no-store to avoid stale/broken cached responses that cause infinite loading.
        // Use a shared inflight promise to avoid duplicate concurrent requests.
        const request =
          booksInflightCache.get(requestKey) ??
          fetch(`/api/books?${requestKey}`, { cache: "no-store", signal: controller.signal })
            .then(async (response) => {
              const nextPayload = (await response.json()) as BookListPayload & { ok?: boolean; message?: string };
              if (!response.ok || nextPayload.ok === false) {
                throw new Error(nextPayload.message || "Could not load books");
              }
              return nextPayload;
            })
            .finally(() => {
              booksInflightCache.delete(requestKey);
            });

        booksInflightCache.set(requestKey, request);
        const nextPayload = await request;

        setCachedPayload(requestKey, nextPayload);

        if (active) {
          if (page === 1) {
            setPayload(nextPayload);
          } else {
            setPayload((prev) => ({ ...nextPayload, items: dedupeBooks([...prev.items, ...nextPayload.items]) }));
          }
          setPage(nextPayload.page || 1);
        }
      } catch (loadError) {
        if (!active) return;

        // Ignore AbortError — happens when the component unmounts or navigates away.
        if (loadError instanceof DOMException && (loadError.name === "AbortError" || loadError.name === "TimeoutError")) {
          if (active) {
            setError("Books took too long to load. Check your connection and try again.");
          }
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Could not load books. Please try again.");
      } finally {
        clearTimeout(timeoutId);
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadBooks();

    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeGenre, currentRequestKey, initialGenre, initialPayload, initialQuery, page, submittedQuery]);

  useEffect(() => {
    if (loading || page >= payload.totalPages) {
      return;
    }

    const controller = new AbortController();
    const nextSearch = new URLSearchParams({ page: String(page + 1) });
    if (submittedQuery.trim()) {
      nextSearch.set("query", submittedQuery.trim());
    }
    if (activeGenre !== "All") {
      nextSearch.set("genre", activeGenre);
    }

    const nextRequestKey = nextSearch.toString();
    if (getCachedPayload(nextRequestKey) || booksInflightCache.has(nextRequestKey)) {
      return;
    }

    const request = fetch(`/api/books?${nextRequestKey}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const nextPayload = (await response.json()) as BookListPayload & { ok?: boolean; message?: string };
        if (!response.ok || nextPayload.ok === false) {
          throw new Error(nextPayload.message || "Could not load books");
        }
        setCachedPayload(nextRequestKey, nextPayload);
        return nextPayload;
      })
      .catch(() => undefined)
      .finally(() => {
        booksInflightCache.delete(nextRequestKey);
      });

    booksInflightCache.set(nextRequestKey, request as Promise<BookListPayload & { ok?: boolean; message?: string }>);

    return () => controller.abort();
  }, [activeGenre, loading, page, payload.totalPages, submittedQuery]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSubmittedQuery(query);
    setShowMobileFilters(false);
  }

  function isWishlisted(book: BookSummary) {
    return wishlist.includes(book.id);
  }

  const genreChips = useMemo(
    () => ["All", ...(payload.availableGenres ?? [])],
    [payload.availableGenres],
  );

  // Sort books client-side based on selected sort mode
  const sortedItems = useMemo(() => {
    const items = [...payload.items];
    switch (sortMode) {
      case "title":
        return items.sort((a, b) => a.title.localeCompare(b.title));
      case "author":
        return items.sort((a, b) => {
          const aAuthor = a.authors[0] || "Unknown";
          const bAuthor = b.authors[0] || "Unknown";
          return aAuthor.localeCompare(bAuthor);
        });
      case "popularity":
        return items.sort((a, b) => b.downloadCount - a.downloadCount);
      case "length":
        return items.sort((a, b) => b.pageCountEstimate - a.pageCountEstimate);
      case "relevance":
      default:
        // Keep original order (random from API)
        return items;
    }
  }, [payload.items, sortMode]);

  function dedupeBooks(items: BookSummary[]) {
    const seen = new Set<number>();
    return items.filter((book) => {
      if (seen.has(book.id)) {
        return false;
      }
      seen.add(book.id);
      return true;
    });
  }

  function renderBookSkeletons() {
    return (
      <div className="books-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <article key={`book-skeleton-${index}`} className="books-card books-card-skeleton" aria-hidden="true">
            <div className="book-cover book-cover-small book-cover-skeleton" />
            <div className="books-card-copy">
              <div className="skeleton books-skeleton-line books-skeleton-title" />
              <div className="skeleton books-skeleton-line books-skeleton-author" />
              <div className="skeleton books-skeleton-line" />
              <div className="skeleton books-skeleton-line books-skeleton-long" />
            </div>
          </article>
        ))}
      </div>
    );
  }

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
            {/* Mobile Filter Toggle Button */}
            <button
              type="button"
              className="books-mobile-filter-toggle"
              onClick={() => setShowMobileFilters((prev) => !prev)}
              aria-expanded={showMobileFilters}
              aria-controls="books-filter-panel"
            >
              <span>{showMobileFilters ? "Close" : "Filter & Sort"}</span>
              <span className="books-filter-badge">{activeGenre !== "All" ? activeGenre : sortMode !== "relevance" ? "Sorted" : ""}</span>
            </button>

            {/* Filter & Sort Panel - Collapsible on mobile */}
            <div
              id="books-filter-panel"
              className={`books-filter-panel ${showMobileFilters ? "is-open" : ""}`}
            >
              <div className="books-filter-section">
                <p className="books-filter-label">Genre</p>
                <div className="books-genre-row">
                  {genreChips.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      className={`books-genre-chip ${activeGenre === genre ? "is-active" : ""}`}
                      onClick={() => {
                        setActiveGenre(genre);
                        setPage(1);
                        setShowMobileFilters(false);
                      }}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div className="books-filter-section">
                <p className="books-filter-label">Sort by</p>
                <div className="books-sort-options">
                  {[
                    { value: "relevance", label: "Relevance" },
                    { value: "title", label: "Title (A-Z)" },
                    { value: "author", label: "Author (A-Z)" },
                    { value: "popularity", label: "Most Popular" },
                    { value: "length", label: "Longest First" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`books-sort-chip ${sortMode === option.value ? "is-active" : ""}`}
                      onClick={() => setSortMode(option.value as SortMode)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="books-hero-metadata">
              <span>{loading ? "Loading library..." : `${formatCompactNumber(payload.totalResults)} books found`}</span>
              <span>{wishlist.length} saved</span>
              <span>{payload.availableGenres?.length ?? 0} genres indexed</span>
            </div>
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

        {/* Continue Reading: dedicated section, not inside the hero */}
        {continueReading && continueReading.length > 0 ? (
          <section className="books-continue-section-standalone">
            <div className="books-continue-header">
              <h2 className="books-eyebrow">Continue Reading</h2>
              <p className="books-copy" style={{ margin: 0, fontSize: "0.88rem" }}>
                {continueReading.length} book{continueReading.length !== 1 ? "s" : ""} in progress
              </p>
            </div>
            <div className="books-continue-scroll">
              {continueReading.map((item) => (
                <div key={item.bookId} className="books-continue-card-v2">
                  <div className="books-continue-card-top">
                    <strong className="books-continue-card-title">{item.title}</strong>
                    <span className="books-continue-card-author">{item.author || "Project Gutenberg"}</span>
                  </div>
                  <div className="books-continue-progress-bar">
                    <div
                      className="books-continue-progress-fill"
                      style={{ width: `${Math.round(item.percent * 100)}%` }}
                    />
                  </div>
                  <p className="books-continue-card-page">
                    Page {item.currentPage} of {item.totalPages} · {Math.round(item.percent * 100)}%
                  </p>
                  <div className="books-continue-card-actions">
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
                        setContinueReading((prev) => prev.filter((b) => b.bookId !== item.bookId));
                        setClearingContinue(null);
                      }}
                    >
                      {clearingContinue === item.bookId ? "..." : "x"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

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
          {loading && !payload.items.length ? renderBookSkeletons() : null}

          {sortedItems.length ? (
            <div className="books-grid">
              {sortedItems.map((book) => (
                <article key={book.id} className="books-card">
                  <Link
                    href={`/books/${book.id}`}
                    className="books-card-link"
                    prefetch
                    onMouseEnter={() => {
                      router.prefetch(`/books/${book.id}`);
                      router.prefetch(`/books/${book.id}/read`);
                    }}
                    onFocus={() => {
                      router.prefetch(`/books/${book.id}`);
                      router.prefetch(`/books/${book.id}/read`);
                    }}
                  >
                    <BookCover title={book.title} author={book.authors[0]} coverUrl={book.coverUrl} size="small" />
                    <div className="books-card-copy">
                      <p className="books-card-title" title={book.title}>{book.title}</p>
                      <p className="books-card-author">{book.authors.join(", ") || "Unknown author"}</p>
                      <p className="books-card-tagline">{book.tagline}</p>
                      <p className="books-card-summary">{book.summary}</p>
                    </div>
                  </Link>
                  <div className="books-card-meta">
                    <span>{book.pageCountEstimate} pages est.</span>
                    <span>{formatCompactNumber(book.downloadCount)} reads</span>
                  </div>
                  <div className="books-card-actions">
                    <Link
                      href={`/books/${book.id}`}
                      className="books-card-button books-card-button-primary"
                      prefetch
                      onMouseEnter={() => router.prefetch(`/books/${book.id}`)}
                    >
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
          ) : null}

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
