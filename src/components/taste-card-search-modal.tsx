"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NVLoader } from "@/components/nv-loader";
import { MediaItem } from "@/lib/types";
import { Search, X, Star } from "lucide-react";

type Slot = "movie" | "show" | "anime" | "game";

interface TasteCardSearchModalProps {
  slot: Slot;
  onSelect: (item: MediaItem) => void;
  onClose: () => void;
}

const SLOT_TITLES: Record<Slot, string> = {
  movie: "Pick Favorite Film",
  show: "Pick Favorite Series",
  anime: "Pick Favorite Anime",
  game: "Pick Favorite Game",
};

const SLOT_PLACEHOLDERS: Record<Slot, string> = {
  movie: "Search films (e.g. Interstellar, Dune)...",
  show: "Search TV shows (e.g. Arcane, Severance)...",
  anime: "Search anime (e.g. Frieren, Attack on Titan)...",
  game: "Search games (e.g. Elden Ring, Zelda)...",
};

interface BrowseResponse {
  ok: boolean;
  items: MediaItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export const TasteCardSearchModal = memo(function TasteCardSearchModal({
  slot,
  onSelect,
  onClose,
}: TasteCardSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMounted(true);
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
    }, 280);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, slot]);

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

  const modalContent = (
    <div className="taste-search-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className="taste-search-modal">
        <div className="taste-search-header">
          <div className="taste-search-header-top">
            <h2>{SLOT_TITLES[slot]}</h2>
            <button
              className="taste-search-close"
              type="button"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ position: "relative", width: "100%" }}>
            <Search
              size={17}
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(226, 232, 240, 0.5)" }}
            />
            <input
              ref={inputRef}
              className="taste-search-input"
              style={{ paddingLeft: "2.6rem" }}
              type="search"
              placeholder={SLOT_PLACEHOLDERS[slot]}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="taste-search-spinner">
            <NVLoader />
          </div>
        ) : !query.trim() ? (
          <div className="taste-search-empty">
            <p>Start typing title name to search...</p>
          </div>
        ) : searched && results.length === 0 ? (
          <div className="taste-search-empty">
            <p>No results found for “{query}”</p>
          </div>
        ) : (
          <div className="taste-search-results">
            {results.map((item) => (
              <button
                key={item.id ?? `${item.source}-${item.sourceId}`}
                className="taste-result-card"
                type="button"
                onClick={() => handleSelect(item)}
              >
                <div className="taste-result-poster">
                  {item.coverUrl || item.backdropUrl ? (
                    <img
                      src={item.coverUrl || item.backdropUrl}
                      alt={item.title}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "#0d1522" }} />
                  )}
                </div>

                <div className="taste-result-info">
                  <span className="taste-result-title">{item.title}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="taste-result-meta">{item.year || "—"}</span>
                    {item.rating ? (
                      <span style={{ fontSize: "0.74rem", color: "#fbbf24", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                        <Star size={11} fill="#fbbf24" stroke="#fbbf24" />
                        {item.rating.toFixed(1)}
                      </span>
                    ) : null}
                    {item.genres?.length ? (
                      <span className="taste-result-meta">· {item.genres.slice(0, 2).join(", ")}</span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(modalContent, document.body);
});
