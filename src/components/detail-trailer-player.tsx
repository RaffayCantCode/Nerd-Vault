"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ResilientMediaImage } from "@/components/resilient-media-image";
import { MediaItem } from "@/lib/types";

type DetailTrailerPlayerProps = {
  item: MediaItem;
  title: string;
  trailerUrl: string;
  sourceUrl?: string;
};

type TrailerProvider = "youtube" | "dailymotion" | "unknown";

function parseTrailer(trailerUrl: string) {
  try {
    const parsed = new URL(trailerUrl);

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return id ? { provider: "youtube" as const, id, watchUrl: `https://www.youtube.com/watch?v=${id}` } : null;
    }

    if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtube-nocookie.com")) {
      if (parsed.pathname.includes("/embed/")) {
        const id = parsed.pathname.split("/embed/")[1]?.split("/")[0];
        return id ? { provider: "youtube" as const, id, watchUrl: `https://www.youtube.com/watch?v=${id}` } : null;
      }

      if (parsed.pathname.includes("/shorts/")) {
        const id = parsed.pathname.split("/shorts/")[1]?.split("/")[0];
        return id ? { provider: "youtube" as const, id, watchUrl: `https://www.youtube.com/watch?v=${id}` } : null;
      }

      const id = parsed.searchParams.get("v");
      return id ? { provider: "youtube" as const, id, watchUrl: `https://www.youtube.com/watch?v=${id}` } : null;
    }

    if (parsed.hostname.includes("dai.ly")) {
      const id = parsed.pathname.replace("/", "").split("/")[0];
      return id ? { provider: "dailymotion" as const, id, watchUrl: `https://www.dailymotion.com/video/${id}` } : null;
    }

    if (parsed.hostname.includes("dailymotion.com") && parsed.pathname.includes("/embed/video/")) {
      const id = parsed.pathname.split("/embed/video/")[1]?.split("/")[0];
      return id ? { provider: "dailymotion" as const, id, watchUrl: `https://www.dailymotion.com/video/${id}` } : null;
    }

    if (parsed.hostname.includes("dailymotion.com") && parsed.pathname.includes("/video/")) {
      const id = parsed.pathname.split("/video/")[1]?.split("/")[0];
      return id ? { provider: "dailymotion" as const, id, watchUrl: `https://www.dailymotion.com/video/${id}` } : null;
    }

    return { provider: "unknown" as const, id: "", watchUrl: trailerUrl };
  } catch {
    return null;
  }
}

function postYoutubeCommand(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  if (!iframe?.contentWindow) {
    return;
  }

  iframe.contentWindow.postMessage(
    JSON.stringify({
      event: "command",
      func,
      args,
    }),
    "https://www.youtube.com",
  );
}

function buildYoutubeEmbedUrl(videoId: string, muted: boolean) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({
    autoplay: "1",
    mute: muted ? "1" : "0",
    controls: "1",
    rel: "0",
    playsinline: "1",
    modestbranding: "1",
    iv_load_policy: "3",
    fs: "1",
    enablejsapi: "1",
    vq: "highres",
    hd: "1",
  });

  if (origin) {
    params.set("origin", origin);
    params.set("widget_referrer", origin);
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function buildDailymotionEmbedUrl(id: string, muted: boolean) {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: muted ? "1" : "0",
    queue_enable: "0",
    "ui-start-screen-info": "0",
  });

  return `https://www.dailymotion.com/embed/video/${id}?${params.toString()}`;
}

function parsePlayerMessage(data: unknown) {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }

  return null;
}

export function DetailTrailerPlayer({ item, title, trailerUrl, sourceUrl }: DetailTrailerPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(45);
  const [isPlaying, setIsPlaying] = useState(false);

  const parsedTrailer = useMemo(() => parseTrailer(trailerUrl), [trailerUrl]);
  const provider = parsedTrailer?.provider ?? "unknown";
  const videoId = parsedTrailer?.id ?? "";
  const fallbackUrl = parsedTrailer?.watchUrl || sourceUrl || trailerUrl;

  const embedUrl = useMemo(() => {
    if (!isOpen || !parsedTrailer || !videoId) {
      return "";
    }

    if (provider === "youtube") {
      return buildYoutubeEmbedUrl(videoId, muted);
    }

    if (provider === "dailymotion") {
      return buildDailymotionEmbedUrl(videoId, muted);
    }

    return trailerUrl;
  }, [isOpen, muted, parsedTrailer, provider, trailerUrl, videoId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || provider !== "youtube") {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com") {
        return;
      }

      const payload = parsePlayerMessage(event.data);
      if (!payload) {
        return;
      }

      if (payload.event === "onStateChange") {
        const state = Number(payload.info);
        if (state === 0) {
          setIsPlaying(false);
          setIsOpen(false);
          return;
        }

        if (state === 1) {
          setIsPlaying(true);
          return;
        }

        if (state === 2 || state === 3) {
          setIsPlaying(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isOpen, provider]);

  useEffect(() => {
    if (!isOpen || provider !== "youtube") {
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (muted) {
        postYoutubeCommand(iframe, "mute", []);
      } else {
        postYoutubeCommand(iframe, "unMute", []);
        postYoutubeCommand(iframe, "setVolume", [volume]);
      }
      postYoutubeCommand(iframe, "playVideo", []);
      setIsPlaying(true);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [isOpen, muted, provider, volume]);

  useEffect(() => {
    if (!isOpen || provider !== "youtube") {
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    if (muted) {
      postYoutubeCommand(iframe, "mute", []);
      return;
    }

    postYoutubeCommand(iframe, "unMute", []);
    postYoutubeCommand(iframe, "setVolume", [volume]);
  }, [isOpen, muted, provider, volume]);

  if (!parsedTrailer || !videoId || parsedTrailer.provider === "unknown") {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="detail-pill detail-trailer-pill"
        onClick={() => setIsOpen(true)}
        title={`Watch ${title} trailer`}
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
          <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
        <span>Trailer</span>
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="detail-trailer-overlay" role="presentation" onClick={() => setIsOpen(false)}>
              <section
                role="dialog"
                aria-modal="true"
                aria-label={`${title} trailer`}
                className="detail-trailer-modal glass"
                onClick={(event) => event.stopPropagation()}
              >
                <header className="detail-trailer-modal-head">
                  <div className="detail-trailer-modal-copy">
                    <p className="eyebrow">Now Playing Trailer</p>
                    <h3 className="headline detail-trailer-modal-title">{title}</h3>
                  </div>

                  <div className="detail-trailer-modal-controls">
                    <button
                      type="button"
                      className={`button detail-trailer-icon-button ${muted ? "button-secondary" : "button-accent"}`}
                      onClick={() => {
                        setMuted((prev) => {
                          const nextValue = !prev;
                          const iframe = iframeRef.current;
                          if (iframe && provider === "youtube") {
                            if (nextValue) {
                              postYoutubeCommand(iframe, "mute", []);
                            } else {
                              postYoutubeCommand(iframe, "unMute", []);
                              postYoutubeCommand(iframe, "setVolume", [volume]);
                            }
                          }
                          return nextValue;
                        });
                      }}
                      aria-label={muted ? "Unmute trailer" : "Mute trailer"}
                    >
                      {muted ? "Unmute" : "Mute"}
                    </button>

                    {fallbackUrl ? (
                      <a href={fallbackUrl} target="_blank" rel="noreferrer" className="button button-secondary detail-trailer-icon-button">
                        Open on {provider === "dailymotion" ? "Dailymotion" : "YouTube"} ↗
                      </a>
                    ) : null}

                    <button type="button" className="button button-secondary detail-trailer-icon-button" onClick={() => setIsOpen(false)} aria-label="Close trailer">
                      ✕ Close
                    </button>
                  </div>
                </header>

                <div className="detail-trailer-frame-shell">
                  <iframe
                    ref={iframeRef}
                    key={`${provider}-${videoId}-${embedUrl}`}
                    className="detail-trailer-frame"
                    src={embedUrl}
                    title={`${title} trailer`}
                    width="100%"
                    height="100%"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    onLoad={() => {
                      setIsPlaying(true);
                      if (provider !== "youtube") {
                        return;
                      }

                      const iframe = iframeRef.current;
                      if (!iframe) {
                        return;
                      }

                      if (muted) {
                        postYoutubeCommand(iframe, "mute", []);
                      } else {
                        postYoutubeCommand(iframe, "unMute", []);
                        postYoutubeCommand(iframe, "setVolume", [volume]);
                      }
                    }}
                    onError={() => setIsOpen(false)}
                  />
                </div>

                <footer className="detail-trailer-modal-footer">
                  <div className="detail-trailer-modal-status">
                    <span className={`detail-trailer-live-dot ${isPlaying ? "is-playing" : ""}`} />
                    <span>{isPlaying ? "Playing" : "Paused"}</span>
                  </div>

                  <div className="detail-trailer-volume-container">
                    <label className="detail-trailer-volume-label" htmlFor="detail-trailer-volume">
                      Volume
                    </label>
                    <input
                      id="detail-trailer-volume"
                      type="range"
                      min="0"
                      max="100"
                      value={muted ? 0 : volume}
                      onChange={(event) => {
                        const nextVolume = Number(event.target.value);
                        setVolume(nextVolume);

                        if (nextVolume === 0) {
                          setMuted(true);
                          return;
                        }

                        if (muted) {
                          setMuted(false);
                        }

                        const iframe = iframeRef.current;
                        if (iframe && provider === "youtube") {
                          postYoutubeCommand(iframe, "unMute", []);
                          postYoutubeCommand(iframe, "setVolume", [nextVolume]);
                        }
                      }}
                      className="detail-trailer-volume-slider"
                      aria-label="Trailer volume"
                    />
                  </div>
                </footer>
              </section>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
