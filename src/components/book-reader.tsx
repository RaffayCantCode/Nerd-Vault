"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AuthRequiredModal } from "@/components/auth-required-modal";
import { BooksSidebar } from "@/components/books-sidebar";
import { NVLoader } from "@/components/nv-loader";
import {
  fetchPersistedBookProgress,
  readBookReaderSettings,
  readBookTheme,
  readBookWishlist,
  resetBookReaderSettings,
  saveBookProgress,
  subscribeBooksChange,
  toggleBookWishlist,
  writeBookReaderSettings,
} from "@/lib/book-client";
import { BookReaderPayload, BookReaderSettings } from "@/lib/book-types";

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

function clampPage(page: number, totalPages: number) {
  return Math.max(1, Math.min(totalPages, page));
}

const QUICK_ZOOM_LEVELS = [90, 100, 112, 124, 136, 150];

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
  const [theme, setTheme] = useState(readBookTheme);
  const [readerSettings, setReaderSettings] = useState<BookReaderSettings>(readBookReaderSettings);
  const [payload, setPayload] = useState<BookReaderPayload | null>(initialPayload);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [loading, setLoading] = useState(!initialPayload);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(Math.max(1, initialProgress?.currentPage ?? 1));
  const [draftPage, setDraftPage] = useState(String(Math.max(1, initialProgress?.currentPage ?? 1)));
  const [hasResolvedSavedPage, setHasResolvedSavedPage] = useState(Boolean(initialProgress));
  const [showAuthModal, setShowAuthModal] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const sync = () => {
      setTheme(readBookTheme());
      setReaderSettings(readBookReaderSettings());
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

  const pageTargetSize = useMemo(() => {
    const fontDensity = readerSettings.fontScale / 100;
    const widthDensity = readerSettings.pageWidth / 760;
    const lineDensity = readerSettings.lineHeight / 1.8;
    const spacingDensity = readerSettings.paragraphSpacing / 1.15;
    const density = Math.max(0.62, Math.min(1.45, fontDensity * widthDensity * lineDensity * spacingDensity));
    return Math.round(2600 / density);
  }, [readerSettings.fontScale, readerSettings.lineHeight, readerSettings.pageWidth, readerSettings.paragraphSpacing]);

  const pages = useMemo(
    () => (payload ? paginateParagraphs(payload.paragraphs, pageTargetSize) : []),
    [pageTargetSize, payload],
  );
  const totalPages = Math.max(1, pages.length);

  useEffect(() => {
    setCurrentPage((page) => clampPage(initialProgress?.currentPage ?? page, totalPages));
  }, [initialProgress?.currentPage, totalPages]);

  useEffect(() => {
    setDraftPage(String(currentPage));
  }, [currentPage]);

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
          setCurrentPage(clampPage(saved.progress.currentPage, totalPages));
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTypingTarget) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setCurrentPage((page) => clampPage(page + 1, totalPages));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setCurrentPage((page) => clampPage(page - 1, totalPages));
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        updateSettings({ fontScale: Math.min(170, readerSettings.fontScale + 6) });
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        updateSettings({ fontScale: Math.max(85, readerSettings.fontScale - 6) });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readerSettings.fontScale, totalPages]);

  function updateSettings(partial: Partial<BookReaderSettings>) {
    setReaderSettings((current) => {
      const next = { ...current, ...partial };
      writeBookReaderSettings(next);
      setTheme(next.theme);
      return readBookReaderSettings();
    });
  }

  function jumpToPage(nextPage: number) {
    setCurrentPage(clampPage(nextPage, totalPages));
  }

  function handleDraftPageSubmit() {
    const parsed = Number(draftPage);
    if (!Number.isFinite(parsed)) {
      setDraftPage(String(currentPage));
      return;
    }

    jumpToPage(parsed);
  }

  function handleResetReader() {
    resetBookReaderSettings();
    const next = readBookReaderSettings();
    setReaderSettings(next);
    setTheme(next.theme);
  }

  const isWishlisted = wishlist.includes(bookId);
  const readingPercent = totalPages <= 1 ? 100 : Math.round(((currentPage - 1) / (totalPages - 1)) * 100);
  const visiblePage = pages[Math.max(0, currentPage - 1)] ?? [];
  const quickZoomActive = QUICK_ZOOM_LEVELS.find((level) => level === Math.round(readerSettings.fontScale));

  if (loading) {
    return (
      <div className="books-reader-shell books-reader-shell-premium" data-theme={theme}>
        <BooksSidebar theme={theme} active="reader" />
        <main className="books-reader-main books-reader-main-premium">
          <section className="books-loading-shell books-loading-shell-reader">
            <NVLoader label="Preparing your premium reading room..." />
          </section>
        </main>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="books-reader-shell books-reader-shell-premium" data-theme={theme}>
        <BooksSidebar theme={theme} active="reader" />
        <main className="books-reader-main books-reader-main-premium">
          <div className="books-empty-state">{error || "This book could not be loaded."}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="books-reader-shell books-reader-shell-premium" data-theme={theme}>
      <BooksSidebar theme={theme} active="reader" currentBookTitle={payload.book.title} />

      <main className="books-reader-main books-reader-main-premium">
        <section className="books-reader-stage">
          <header className="books-reader-command">
            <div className="books-reader-command-copy">
              <p className="books-eyebrow">Dedicated reader</p>
              <h1 className="books-reader-title">{payload.book.title}</h1>
              <p className="books-copy books-reader-subcopy">
                {payload.book.authors.join(", ") || "Unknown author"} · page {currentPage} of {totalPages} · {readingPercent}% read
              </p>
              {!isSignedIn ? (
                <p className="books-reader-guest-note">
                  Sign in to keep this exact page synced so you can come back later without losing your place.
                </p>
              ) : null}
            </div>

            <div className="books-reader-command-actions">
              {!isSignedIn ? (
                <Link href={`/sign-in?redirectTo=${encodeURIComponent(`/books/${bookId}/read`)}`} className="books-card-button books-card-button-primary">
                  Sign in to save
                </Link>
              ) : null}
              <Link href={`/books/${bookId}`} className="books-card-button">Book info</Link>
              <Link href="/books" className="books-card-button">Library</Link>
              <button
                type="button"
                className="books-card-button"
                onClick={() => {
                  if (!isSignedIn) {
                    setShowAuthModal(true);
                    return;
                  }
                  toggleBookWishlist(bookId);
                }}
              >
                {isWishlisted ? "Saved to wishlist" : "Add to wishlist"}
              </button>
            </div>
          </header>

          <section className="books-reader-control-deck">
            <div className="books-reader-control-grid">
              <div className="books-reader-control-card">
                <span className="books-feature-label">Theme</span>
                <div className="books-segmented">
                  <button type="button" className={`books-segmented-chip ${readerSettings.theme === "dark" ? "is-active" : ""}`} onClick={() => updateSettings({ theme: "dark" })}>
                    Dark
                  </button>
                  <button type="button" className={`books-segmented-chip ${readerSettings.theme === "light" ? "is-active" : ""}`} onClick={() => updateSettings({ theme: "light" })}>
                    Light
                  </button>
                </div>
              </div>

              <div className="books-reader-control-card">
                <span className="books-feature-label">Typeface</span>
                <div className="books-segmented">
                  <button type="button" className={`books-segmented-chip ${readerSettings.fontFamily === "serif" ? "is-active" : ""}`} onClick={() => updateSettings({ fontFamily: "serif" })}>
                    Serif
                  </button>
                  <button type="button" className={`books-segmented-chip ${readerSettings.fontFamily === "sans" ? "is-active" : ""}`} onClick={() => updateSettings({ fontFamily: "sans" })}>
                    Sans
                  </button>
                </div>
              </div>

              <div className="books-reader-control-card books-reader-control-card-wide">
                <div className="books-reader-slider-head">
                  <span className="books-feature-label">Text zoom</span>
                  <strong>{Math.round(readerSettings.fontScale)}%</strong>
                </div>
                <input
                  type="range"
                  min={85}
                  max={170}
                  step={1}
                  value={readerSettings.fontScale}
                  onChange={(event) => updateSettings({ fontScale: Number(event.target.value) })}
                />
                <div className="books-reader-quick-zoom">
                  {QUICK_ZOOM_LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={`books-reader-preset ${quickZoomActive === level ? "is-active" : ""}`}
                      onClick={() => updateSettings({ fontScale: level })}
                    >
                      {level}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="books-reader-control-card">
                <div className="books-reader-slider-head">
                  <span className="books-feature-label">Line spacing</span>
                  <strong>{readerSettings.lineHeight.toFixed(2)}</strong>
                </div>
                <input
                  type="range"
                  min={1.4}
                  max={2.3}
                  step={0.05}
                  value={readerSettings.lineHeight}
                  onChange={(event) => updateSettings({ lineHeight: Number(event.target.value) })}
                />
              </div>

              <div className="books-reader-control-card">
                <div className="books-reader-slider-head">
                  <span className="books-feature-label">Paragraph space</span>
                  <strong>{readerSettings.paragraphSpacing.toFixed(2)}x</strong>
                </div>
                <input
                  type="range"
                  min={0.75}
                  max={1.8}
                  step={0.05}
                  value={readerSettings.paragraphSpacing}
                  onChange={(event) => updateSettings({ paragraphSpacing: Number(event.target.value) })}
                />
              </div>

              <div className="books-reader-control-card books-reader-control-card-wide">
                <div className="books-reader-slider-head">
                  <span className="books-feature-label">Reading width</span>
                  <strong>{Math.round(readerSettings.pageWidth)}px</strong>
                </div>
                <input
                  type="range"
                  min={620}
                  max={1120}
                  step={10}
                  value={readerSettings.pageWidth}
                  onChange={(event) => updateSettings({ pageWidth: Number(event.target.value) })}
                />
              </div>

              <div className="books-reader-control-card">
                <span className="books-feature-label">Page jump</span>
                <div className="books-reader-page-jump">
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={draftPage}
                    onChange={(event) => setDraftPage(event.target.value)}
                    onBlur={handleDraftPageSubmit}
                  />
                  <button type="button" className="books-card-button" onClick={handleDraftPageSubmit}>
                    Go
                  </button>
                </div>
              </div>

              <div className="books-reader-control-card">
                <span className="books-feature-label">Reader reset</span>
                <button type="button" className="books-card-button" onClick={handleResetReader}>
                  Reset layout
                </button>
              </div>
            </div>
          </section>

          <section className="books-reader-progress-rail">
            <button type="button" className="books-card-button" disabled={currentPage <= 1} onClick={() => jumpToPage(currentPage - 1)}>
              Previous
            </button>
            <div className="books-reader-progress-bar">
              <input
                type="range"
                min={1}
                max={totalPages}
                step={1}
                value={currentPage}
                onChange={(event) => jumpToPage(Number(event.target.value))}
                aria-label="Reader progress"
              />
              <div className="books-reader-progress-meta">
                <span>Page {currentPage}</span>
                <span>{totalPages} pages</span>
              </div>
            </div>
            <button type="button" className="books-card-button books-card-button-primary" disabled={currentPage >= totalPages} onClick={() => jumpToPage(currentPage + 1)}>
              Next
            </button>
          </section>

          <section
            className={`books-reader-paper books-reader-paper-${readerSettings.fontFamily}`}
            style={
              {
                "--reader-width": `${readerSettings.pageWidth}px`,
                "--reader-font-scale": String(readerSettings.fontScale / 100),
                "--reader-line-height": String(readerSettings.lineHeight),
                "--reader-paragraph-gap": `${readerSettings.paragraphSpacing}rem`,
              } as CSSProperties
            }
          >
            <div className="books-reader-paper-inner">
              <div className="books-reader-paper-topline">
                <span>{payload.book.title}</span>
                <span>{payload.book.authors[0] || "Unknown author"}</span>
              </div>
              <article className="books-reader-content books-reader-content-premium">
                {visiblePage.map((paragraph, index) => (
                  <p key={`${currentPage}-${index}-${paragraph.slice(0, 24)}`} className="books-reader-paragraph">
                    {paragraph}
                  </p>
                ))}
              </article>
              <div className="books-reader-paper-footer">
                <span>{payload.book.languages.join(", ").toUpperCase() || "EN"}</span>
                <strong>{currentPage}</strong>
              </div>
            </div>
          </section>
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
