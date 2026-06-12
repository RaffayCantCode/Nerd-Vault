"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DetailTrailerPlayerProps = {
  title: string;
  trailerUrl: string;
  sourceUrl?: string;
};

type TrailerProvider = "youtube" | "dailymotion" | "unknown";
type TrailerQuality = "auto" | "highres" | "hd1080" | "hd720" | "large" | "medium";

const QUALITY_OPTIONS: Array<{ value: TrailerQuality; label: string }> = [
  { value: "highres", label: "Best" },
  { value: "hd1080", label: "1080p" },
  { value: "hd720", label: "720p" },
  { value: "large", label: "480p" },
  { value: "medium", label: "360p" },
  { value: "auto", label: "Auto" },
];

const YOUTUBE_QUALITY: Record<TrailerQuality, string> = {
  auto: "auto",
  highres: "highres",
  hd1080: "hd1080",
  hd720: "hd720",
  large: "large",
  medium: "medium",
};

const DAILYMOTION_QUALITY: Record<TrailerQuality, string> = {
  auto: "auto",
  highres: "1080",
  hd1080: "1080",
  hd720: "720",
  large: "480",
  medium: "380",
};

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

function resolveYoutubePlaybackQuality(quality: TrailerQuality) {
  const preferredQuality = YOUTUBE_QUALITY[quality];
  return preferredQuality === "auto" ? "default" : preferredQuality;
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

function buildYoutubeEmbedUrl(videoId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
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

function buildDailymotionEmbedUrl(id: string, quality: TrailerQuality) {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    queue_enable: "0",
    "ui-start-screen-info": "0",
    quality: DAILYMOTION_QUALITY[quality],
  });
  return `https://www.dailymotion.com/embed/video/${id}?${params.toString()}`;
}

export function DetailTrailerPlayer({ title, trailerUrl, sourceUrl }: DetailTrailerPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const frameShellRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  const [quality, setQuality] = useState<TrailerQuality>("highres");
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(50);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const togglePlayPause = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (isPlaying) {
      if (provider === "youtube") {
        postYoutubeCommand(iframe, "pauseVideo", []);
      } else if (provider === "dailymotion") {
        iframe.contentWindow?.postMessage(JSON.stringify({ command: "pause" }), "*");
      }
      setIsPlaying(false);
    } else {
      if (provider === "youtube") {
        postYoutubeCommand(iframe, "playVideo", []);
      } else if (provider === "dailymotion") {
        iframe.contentWindow?.postMessage(JSON.stringify({ command: "play" }), "*");
      }
      setIsPlaying(true);
    }
  };

  const parsedTrailer = useMemo(() => parseTrailer(trailerUrl), [trailerUrl]);
  const provider = parsedTrailer?.provider ?? "unknown";
  const fallbackUrl = parsedTrailer?.watchUrl || trailerUrl || sourceUrl;
  const supportsQualitySelection = provider === "youtube" || provider === "dailymotion";
  const videoId = parsedTrailer?.id ?? "";

  const embedUrl = useMemo(() => {
    if (provider === "youtube" && videoId) {
      return buildYoutubeEmbedUrl(videoId);
    }
    if (provider === "dailymotion" && videoId) {
      return buildDailymotionEmbedUrl(videoId, quality);
    }
    return trailerUrl;
  }, [provider, quality, trailerUrl, videoId]);

  useEffect(() => {
    setHasError(false);
    if (provider !== "youtube" || !videoId) {
      return;
    }

    const img = new Image();
    img.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    img.onload = () => {
      if (img.width === 120) {
        setHasError(true);
      }
    };
    img.onerror = () => {
      setHasError(true);
    };
  }, [provider, trailerUrl, videoId]);

  useEffect(() => {
    const shell = frameShellRef.current;
    const iframe = iframeRef.current;
    if (!shell || !iframe) {
      return;
    }

    function syncTrailerScale() {
      const frame = frameShellRef.current;
      const target = iframeRef.current;
      if (!frame || !target) {
        return;
      }

      const width = frame.clientWidth;
      const height = frame.clientHeight;
      if (!width || !height) {
        return;
      }

      const scale = Math.min(width / 1920, height / 1080, 1);
      target.style.setProperty("--trailer-scale", scale.toFixed(4));
    }

    syncTrailerScale();
    const observer = new ResizeObserver(syncTrailerScale);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [embedUrl]);

  useEffect(() => {
    if (provider !== "youtube") {
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
    }, 220);

    return () => window.clearTimeout(timer);
  }, [embedUrl, provider]);

  useEffect(() => {
    if (provider !== "youtube") return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (muted) {
      postYoutubeCommand(iframe, "mute", []);
    } else {
      postYoutubeCommand(iframe, "unMute", []);
      postYoutubeCommand(iframe, "setVolume", [volume]);
    }
  }, [muted, volume, provider]);

  useEffect(() => {
    if (typeof window === "undefined" || !sectionRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const iframe = iframeRef.current;
        const entry = entries[0];
        if (!iframe) {
          return;
        }

        const isIntersecting = Boolean(entry?.isIntersecting);
        const command = isIntersecting ? "playVideo" : "pauseVideo";
        postYoutubeCommand(iframe, command, []);
        setIsPlaying(isIntersecting);
      },
      {
        threshold: 0.45,
        rootMargin: "0px 0px -15% 0px",
      },
    );

    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [embedUrl]);

  if (hasError || !parsedTrailer || !trailerUrl || parsedTrailer.provider === "unknown" || !parsedTrailer.id) {
    return null;
  }

  const watchButtonLabel =
    provider === "youtube"
      ? "Watch on YouTube"
      : provider === "dailymotion"
        ? "Watch on Dailymotion"
        : "Open trailer source";

  return (
    <section ref={sectionRef} className="detail-trailer-section glass">
      <div className="detail-trailer-head">
        <p className="eyebrow">Now Playing Trailer</p>
        <h2 className="headline detail-trailer-title">{title}</h2>
      </div>

      <div ref={frameShellRef} className="detail-trailer-frame-shell">
        <iframe
          ref={iframeRef}
          key={`${provider}-${videoId}-${embedUrl}`}
          className="detail-trailer-frame"
          src={embedUrl}
          title={`${title} trailer`}
          width={1920}
          height={1080}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={() => {
            if (provider !== "youtube") return;
            const iframe = iframeRef.current;
            if (muted) {
              postYoutubeCommand(iframe, "mute", []);
            } else {
              postYoutubeCommand(iframe, "unMute", []);
              postYoutubeCommand(iframe, "setVolume", [volume]);
            }
          }}
          onError={() => setHasError(true)}
        />
      </div>

      <div className="detail-trailer-footer">
        <div className="detail-trailer-controls-left" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            className={`play-toggle ${isPlaying ? "is-playing" : "is-paused"}`}
            onClick={togglePlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="4" width="4" height="16" rx="1" />
                <rect x="15" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className={`mute-toggle ${muted ? "is-muted" : "is-unmuted"}`}
            onClick={() => setMuted((prev) => !prev)}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>

          <div className="detail-trailer-volume-container">
            <input
              type="range"
              min="0"
              max="100"
              value={muted ? 0 : volume}
              onChange={(e) => {
                const newVol = Number(e.target.value);
                setVolume(newVol);
                if (newVol > 0 && muted) {
                  setMuted(false);
                } else if (newVol === 0 && !muted) {
                  setMuted(true);
                }
              }}
              className="detail-trailer-volume-slider"
              aria-label="Volume"
            />
          </div>
        </div>

        <div className="detail-trailer-actions">
          <a href={fallbackUrl} target="_blank" rel="noreferrer" className="button button-secondary button-small">
            Open on YouTube
          </a>
        </div>
      </div>
    </section>
  );
}
