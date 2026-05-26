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
  const [hasError, setHasError] = useState(false);

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
  }, [trailerUrl, videoId]);

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
      postYoutubeCommand(iframe, muted ? "mute" : "unMute", []);
      postYoutubeCommand(iframe, "setPlaybackQuality", [resolveYoutubePlaybackQuality(quality)]);
      postYoutubeCommand(iframe, "playVideo", []);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [embedUrl, provider]);

  useEffect(() => {
    if (provider !== "youtube") return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    postYoutubeCommand(iframe, "setPlaybackQuality", [resolveYoutubePlaybackQuality(quality)]);
  }, [quality, provider]);

  useEffect(() => {
    if (provider !== "youtube") return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    postYoutubeCommand(iframe, muted ? "mute" : "unMute", []);
  }, [muted, provider]);

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

        const command = entry?.isIntersecting ? "playVideo" : "pauseVideo";
        postYoutubeCommand(iframe, command, []);
      },
      {
        threshold: 0.45,
        rootMargin: "0px 0px -15% 0px",
      },
    );

    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [embedUrl]);

  if (hasError || !parsedTrailer || !trailerUrl) {
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
            postYoutubeCommand(iframe, muted ? "mute" : "unMute", []);
            postYoutubeCommand(iframe, "setPlaybackQuality", [resolveYoutubePlaybackQuality(quality)]);
          }}
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
                    onClick={() => {
                      setQuality(option.value);
                    }}
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
            {watchButtonLabel}
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
