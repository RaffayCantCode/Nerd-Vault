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
) {
  if (provider === "youtube" && id) {
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
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
      mute: "1",
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
  const parsedTrailer = useMemo(() => parseTrailer(trailerUrl), [trailerUrl]);
  const provider = parsedTrailer?.provider ?? "unknown";
  const fallbackUrl = parsedTrailer?.watchUrl || sourceUrl || trailerUrl;
  const embedUrl = useMemo(
    () => buildEmbedUrl(provider, trailerUrl, parsedTrailer?.id ?? "", quality),
    [parsedTrailer?.id, provider, quality, trailerUrl],
  );
  const supportsQualitySelection = provider === "youtube";

  useEffect(() => {
    if (!supportsQualitySelection || !iframeRef.current || quality === "auto") {
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
    if (typeof window === "undefined" || !sectionRef.current || !iframeRef.current) {
      return;
    }

    const iframe = iframeRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
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

  return (
    <section ref={sectionRef} className="detail-trailer-section glass">
      <div className="detail-trailer-head">
        <div>
          <p className="eyebrow">Trailer</p>
          <h2 className="headline detail-trailer-title">{title}</h2>
          <p className="copy detail-trailer-copy">
            Starts muted for autoplay reliability. Click the player for sound, controls, and fullscreen.
          </p>
        </div>

        <div className="detail-trailer-toolbar">
          {supportsQualitySelection ? (
            <div className="detail-trailer-quality" role="group" aria-label="Trailer quality">
              {QUALITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`chip ${quality === option.value ? "is-active" : ""}`}
                  onClick={() => setQuality(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="detail-trailer-actions">
            <a href={fallbackUrl} target="_blank" rel="noreferrer" className="button button-secondary">
              Open fallback
            </a>
            {sourceUrl ? (
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="button button-secondary">
                Open source
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="detail-trailer-frame-shell">
        <iframe
          ref={iframeRef}
          className="detail-trailer-frame"
          src={embedUrl}
          title={`${title} trailer`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
  );
}
