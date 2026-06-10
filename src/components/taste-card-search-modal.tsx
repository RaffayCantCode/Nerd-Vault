"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { NVLoader } from "@/components/nv-loader";
import { MediaItem } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Slot = "movie" | "show" | "anime" | "game";

interface TasteCardSearchModalProps {
  slot: Slot;
  onSelect: (item: MediaItem) => void;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SLOT_TITLES: Record<Slot, string> = {
  movie: "Pick your favorite movie",
  show: "Pick your favorite show",
  anime: "Pick your favorite anime",
  game: "Pick your favorite game",
};

const SLOT_PLACEHOLDERS: Record<Slot, string> = {
  movie: "Search movies...",
  show: "Search shows...",
  anime: "Search anime...",
  game: "Search games...",
};

interface BrowseResponse {
  ok: boolean;
  items: MediaItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const TasteCardSearchModal = memo(function TasteCardSearchModal({
  slot,
  onSelect,
  onClose,
}: TasteCardSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Auto-focus the input on mount */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* Close on Escape key */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  /* Debounced search */
  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      /* Abort any in-flight request */
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/catalog/browse?type=${encodeURIComponent(slot)}&query=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );

        if (!res.ok) throw new Error("Network error");

        const data: BrowseResponse = await res.json();
        setResults(data.items ?? []);
        setSearched(true);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResults([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, slot]);

  /* Handlers */
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const handleSelect = useCallback(
    (item: MediaItem) => {
      onSelect(item);
      onClose();
    },
    [onSelect, onClose],
  );

  /* ---- Render helpers ---- */

  const renderMeta = (item: MediaItem): string => {
    const parts: string[] = [];
    if (item.year) parts.push(String(item.year));
    if (item.rating) parts.push(`★ ${item.rating}`);
    if (item.genres?.length) parts.push(item.genres.slice(0, 3).join(", "));
    return parts.join(" · ");
  };

  /* ---- Empty / loading states ---- */

  let body: React.ReactNode;

  if (loading) {
    body = (
      <div className="taste-search-spinner">
        <NVLoader />
      </div>
    );
  } else if (!query.trim()) {
    body = (
      <div className="taste-search-empty">
        <p>Start typing to search...</p>
      </div>
    );
  } else if (searched && results.length === 0) {
    body = (
      <div className="taste-search-empty">
        <p>No results found</p>
      </div>
    );
  } else {
    body = (
      <div className="taste-search-results">
        {results.map((item) => (
          <button
            key={item.id ?? `${item.source}-${item.sourceId}`}
            className="taste-result-card"
            type="button"
            onClick={() => handleSelect(item)}
          >
            <div className="taste-result-poster">
              {item.coverUrl ? (
                <img
                  src={item.coverUrl}
                  alt={item.title}
                  width={48}
                  loading="lazy"
                />
              ) : (
                <div style={{ width: 48, aspectRatio: "2/3", background: "var(--surface-2, #1a1a2e)", borderRadius: 4 }} />
              )}
            </div>

            <div className="taste-result-info">
              <span className="taste-result-title">{item.title}</span>
              <span className="taste-result-meta">{renderMeta(item)}</span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  /* ---- Main render ---- */

  return (
    <div className="taste-search-overlay" onClick={handleOverlayClick}>
      <div className="taste-search-modal">
        <div className="taste-search-header">
          <div className="taste-search-header-top">
            <h2>{SLOT_TITLES[slot]}</h2>
            <button
              className="taste-search-close"
              type="button"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <input
            ref={inputRef}
            className="taste-search-input"
            type="text"
            placeholder={SLOT_PLACEHOLDERS[slot]}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {body}
      </div>
    </div>
  );
});
