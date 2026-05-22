"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DetailTrailerPlayerProps = {
  title: string;
  trailerUrl: string;
  sourceUrl?: string;
};

type TrailerProvider = "youtube" | "dailymotion" | "unknown";
type TrailerQuality = "auto" | "hd1080" | "hd720" | "large" | "medium";

const QUALITY_OPTIONS: Array<{ value: TrailerQuality; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "hd1080", label: "1080p" },
  { value: "hd720", label: "720p" },
  { value: "large", label: "480p" },
  { value: "medium", label: "360p" },
];

function parseTrailer(trailerUrl: string) {
  try {
    const parsed = new URL(trailerUrl);

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return id ? { provider: "youtube" as const, id, watchUrl: `https://www.youtube.com/watch?v=${id}` } : null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.includes("/embed/")) {
        const id = parsed.pathname.split("/embed/")[1]?.split("/")[0];
        return id ? { provider: "youtube" as const, id, watchUrl: `https://www.youtube.com/watch?v=${id}` } : null;
      }

      const id = parsed.searchParams.get("v");
      return id ? { provider: "youtube" as const, id, watchUrl: `https://www.youtube.com/watch?v=${id}` } : null;
    }

    if (parsed.hostname.includes("dailymotion.com") && parsed.pathname.includes("/embed/video/")) {
      const id = parsed.pathname.split("/embed/video/")[1]?.split("/")[0];
      return id ? { provider: "dailymotion" as const, id, watchUrl: `https://www.dailymotion.com/video/${id}` } : null;
    }

    return { provider: "unknown" as const, id: "", watchUrl: trailerUrl };
  } catch {
    return null;
  }
}

function buildEmbedUrl(
  provider: TrailerProvider,
  trailerUrl: string,
  id: string,
  quality: TrailerQuality,
  muted: boolean,
) {
  if (provider === "youtube" && id) {
    const params = new URLSearchParams({
      autoplay: "1",
      mute: muted ? "1" : "0",
      controls: "1",
      rel: "0",
      playsinline: "1",
      modestbranding: "1",
      enablejsapi: "1",
      origin: typeof window !== "undefined" ? window.location.origin : "http://localhost",
    });

    if (quality !== "auto") {
      params.set("vq", quality);
    }

    return `https://www.youtube.com/embed/${id}?${params.toString()}`;
  }

  if (provider === "dailymotion" && id) {
    const params = new URLSearchParams({
      autoplay: "1",
      mute: muted ? "1" : "0",
      queue_enable: "0",
    });
    return `https://www.dailymotion.com/embed/video/${id}?${params.toString()}`;
  }

  return trailerUrl;
}

export function DetailTrailerPlayer({ title, trailerUrl, sourceUrl }: DetailTrailerPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [quality, setQuality] = useState<TrailerQuality>("auto");
  const [muted, setMuted] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const parsedTrailer = useMemo(() => parseTrailer(trailerUrl), [trailerUrl]);
  const provider = parsedTrailer?.provider ?? "unknown";
  const fallbackUrl = parsedTrailer?.watchUrl || sourceUrl || trailerUrl;
  const embedUrl = useMemo(
    () => buildEmbedUrl(provider, trailerUrl, parsedTrailer?.id ?? "", quality, muted),
    [parsedTrailer?.id, provider, quality, muted, trailerUrl],
  );
  const supportsQualitySelection = provider === "youtube";

  // Listen for YouTube API errors if possible
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com") return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === "onPlayerError" || data.info?.error) {
          console.error("Trailer player error detected:", data);
          setHasError(true);
        }
      } catch {
        // Not a JSON message or not from YT player
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (!supportsQualitySelection || !iframeRef.current || quality === "auto" || hasError) {
      return;
    }

    iframeRef.current.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func: "setPlaybackQuality",
        args: [quality],
      }),
      "*",
    );
  }, [quality, supportsQualitySelection]);

  useEffect(() => {
    if (!iframeRef.current) return;

    iframeRef.current.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func: muted ? "mute" : "unMute",
        args: [],
      }),
      "*",
    );
  }, [muted]);

  useEffect(() => {
    if (typeof window === "undefined" || !sectionRef.current || !iframeRef.current) {
      return;
    }

    const iframe = iframeRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          // Optional: Resume video when back in view
          iframe.contentWindow?.postMessage(
            JSON.stringify({
              event: "command",
              func: "playVideo",
              args: [],
            }),
            "*",
          );
          return;
        }

        iframe.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: "pauseVideo",
            args: [],
          }),
          "*",
        );
      },
      {
        threshold: 0.45,
        rootMargin: "0px 0px -15% 0px",
      },
    );

    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  if (hasError || !parsedTrailer || (provider === "unknown" && !trailerUrl)) {
    return null;
  }

  return (
    <section ref={sectionRef} className="detail-trailer-section glass">
      <div className="detail-trailer-head">
        <p className="eyebrow">Now Playing Trailer</p>
        <h2 className="headline detail-trailer-title">{title}</h2>
      </div>

      <div className="detail-trailer-frame-shell">
        <iframe
          ref={iframeRef}
          className="detail-trailer-frame"
          src={embedUrl}
          title={`${title} trailer`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onError={() => setHasError(true)}
        />
      </div>

      <div className="detail-trailer-footer">
        <div className="detail-trailer-controls-left">
          {supportsQualitySelection ? (
            <div className="detail-trailer-quality-row">
              <span className="quality-label">Quality</span>
              <div className="detail-trailer-quality-pills" role="group" aria-label="Trailer quality">
                {QUALITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`quality-pill ${quality === option.value ? "is-active" : ""}`}
                    onClick={() => setQuality(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            className={`mute-toggle ${muted ? "is-muted" : "is-unmuted"}`}
            onClick={() => setMuted((prev) => !prev)}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        </div>

        <div className="detail-trailer-actions">
          <a href={fallbackUrl} target="_blank" rel="noreferrer" className="button button-secondary button-small">
            Open fallback
          </a>
          {sourceUrl ? (
            <a href={sourceUrl} target="_blank" rel="noreferrer" className="button button-secondary button-small">
              Open source
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
