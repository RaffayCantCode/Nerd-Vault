"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";

type EpisodeData = {
  episodeNumber: number;
  title: string;
  overview: string | null;
  thumbnail: string | null;
  rating: number | null;
  airDate: string | null;
  runtime: number | null;
  isFiller: boolean;
};

type StreamingEpisode = {
  title?: string | null;
  thumbnail?: string | null;
  url?: string | null;
  site?: string | null;
};

type SeasonEpisodePanelProps = {
  source: "tmdb" | "anilist";
  sourceId: string;
  malId?: number;
  seasonCount: number;
  mediaTitle: string;
  streamingEpisodes?: StreamingEpisode[];
};

type CacheEntry = {
  expiresAt: number;
  episodes: EpisodeData[];
};

const episodeCache = new Map<string, CacheEntry>();

function getCached(key: string): EpisodeData[] | null {
  const entry = episodeCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.episodes;
  return null;
}

function setCached(key: string, episodes: EpisodeData[]) {
  episodeCache.set(key, { expiresAt: Date.now() + 5 * 60 * 1000, episodes });
}

function EpisodeRow({ episode }: { episode: EpisodeData }) {
  const [imgError, setImgError] = useState(false);

  const runtimeLabel = episode.runtime ? `${episode.runtime} min` : null;
  const subText = [episode.overview, runtimeLabel].filter(Boolean);

  return (
    <div className="ep-row">
      {/* Episode number badge */}
      <div className="ep-num" aria-label={`Episode ${episode.episodeNumber}`}>
        {episode.episodeNumber}
      </div>

      {/* Thumbnail */}
      {episode.thumbnail && !imgError ? (
        <img
          src={episode.thumbnail}
          alt=""
          className="ep-thumb"
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="ep-thumb ep-thumb-placeholder" aria-hidden="true" />
      )}

      {/* Text block */}
      <div className="ep-body">
        <p className="ep-title">
          {episode.title}
          {episode.isFiller ? <span className="ep-filler-badge">Filler</span> : null}
        </p>
        {subText.length > 0 ? (
          <p className="ep-sub">
            {episode.overview ? (
              <span className="ep-desc">{episode.overview}</span>
            ) : null}
            {episode.overview && runtimeLabel ? <span className="ep-sub-dot">·</span> : null}
            {runtimeLabel ? <span className="ep-runtime">{runtimeLabel}</span> : null}
          </p>
        ) : null}
      </div>

      {/* Rating — pinned right */}
      {episode.rating ? (
        <div className="ep-rating" aria-label={`Rating: ${episode.rating}`}>
          <span className="ep-star">★</span>
          {episode.rating}
        </div>
      ) : (
        <div className="ep-rating-spacer" />
      )}
    </div>
  );
}

export const SeasonEpisodePanel = memo(function SeasonEpisodePanel({
  source,
  sourceId,
  malId,
  seasonCount,
  mediaTitle,
  streamingEpisodes = [],
}: SeasonEpisodePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSeason, setActiveSeason] = useState(1);
  const [episodes, setEpisodes] = useState<EpisodeData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchEpisodes = useCallback(
    async (season: number) => {
      const cacheKey = `${source}:${sourceId}:${season}:${malId ?? 0}`;
      const cached = getCached(cacheKey);
      if (cached) {
        setEpisodes(cached);
        setIsLoading(false);
        setError(null);
        return;
      }

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ source, sourceId, season: String(season), title: mediaTitle });

        if (malId && malId > 0) params.set("malId", String(malId));

        if (source === "anilist" && streamingEpisodes.length > 0) {
          params.set(
            "streamingEpisodes",
            encodeURIComponent(
              JSON.stringify(
                streamingEpisodes.map((ep) => ({ title: ep.title ?? null, thumbnail: ep.thumbnail ?? null })),
              ),
            ),
          );
        }

        const res = await fetch(`/api/catalog/tv-seasons?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to load.");

        const data = (await res.json()) as { episodes: EpisodeData[] };
        const fetched = data.episodes ?? [];
        setCached(cacheKey, fetched);
        setEpisodes(fetched);
        setError(null);
      } catch {
        if (controller.signal.aborted) return;
        setError("Episode data could not be loaded right now.");
        setEpisodes([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    },
    [malId, source, sourceId, streamingEpisodes],
  );

  useEffect(() => {
    if (isOpen) {
      void fetchEpisodes(activeSeason);
    }
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [activeSeason, fetchEpisodes, isOpen]);

  const totalSeasons = Math.max(1, seasonCount);

  return (
    <div className="ep-dropdown-container">
      <button
        type="button"
        className={`ep-dropdown-btn${isOpen ? " is-open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="detail-episodes-dropdown"
      >
        <span className="ep-dropdown-btn-text">
          Episode Details
        </span>
        <svg
          className="ep-dropdown-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <div
        id="detail-episodes-dropdown"
        className={`ep-dropdown-content${isOpen ? " is-open" : ""}`}
      >
        <div className="ep-dropdown-inner">
          <section className="ep-panel info-panel glass" id="detail-episodes" aria-label="Episodes">
            {/* Header row: title left, season pills right */}
            <div className="ep-panel-header">
              <h2 className="ep-panel-title">Episodes</h2>

              {/* Season selector — compact S1 / S2 badges */}
              <div className="ep-season-pills" role="tablist" aria-label="Season selector">
                {Array.from({ length: totalSeasons }, (_, i) => {
                  const n = i + 1;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="tab"
                      aria-selected={activeSeason === n}
                      className={`ep-season-pill${activeSeason === n ? " is-active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSeason(n);
                      }}
                      id={`ep-season-tab-${n}`}
                    >
                      S{n}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Episode list */}
            {isLoading ? (
              <div className="ep-state-row" role="status">
                <span className="ep-spinner" aria-hidden="true" />
                Loading episodes…
              </div>
            ) : error ? (
              <div className="ep-state-row ep-state-error">{error}</div>
            ) : !episodes.length ? (
              <div className="ep-state-row">No episode data available for this season.</div>
            ) : (
              <div
                className="ep-list"
                role="tabpanel"
                aria-labelledby={`ep-season-tab-${activeSeason}`}
              >
                {episodes.map((ep) => (
                  <EpisodeRow key={`${activeSeason}-${ep.episodeNumber}`} episode={ep} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
});
