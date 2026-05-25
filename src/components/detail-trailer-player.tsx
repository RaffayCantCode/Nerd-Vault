"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadYoutubeIframeApi, type YoutubePlayerInstance } from "@/lib/youtube-iframe-api";

type DetailTrailerPlayerProps = {
  title: string;
  trailerUrl: string;
  sourceUrl?: string;
};

type TrailerProvider = "youtube" | "dailymotion" | "unknown";
type TrailerQuality = "auto" | "hd1080" | "hd720" | "large" | "medium";

const YOUTUBE_PLAYER_WIDTH = 1920;
const YOUTUBE_PLAYER_HEIGHT = 1080;

const QUALITY_OPTIONS: Array<{ value: TrailerQuality; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "hd1080", label: "1080p" },
  { value: "hd720", label: "720p" },
  { value: "large", label: "480p" },
  { value: "medium", label: "360p" },
];

const LOW_QUALITY_LEVELS = new Set(["small", "medium", "large", "tiny"]);

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

function buildDailymotionEmbedUrl(id: string) {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    queue_enable: "0",
    "ui-start-screen-info": "0",
  });
  return `https://www.dailymotion.com/embed/video/${id}?${params.toString()}`;
}

function qualityToYoutubeLevel(quality: TrailerQuality) {
  if (quality === "auto") {
    return "hd1080";
  }
  return quality;
}

function applyYoutubeQuality(player: YoutubePlayerInstance, quality: TrailerQuality) {
  const target = qualityToYoutubeLevel(quality);
  try {
    player.setPlaybackQuality(target);
  } catch {
    // YouTube may ignore this on some devices; reload fallback handles those cases.
  }
}

function readYoutubeQuality(player: YoutubePlayerInstance) {
  try {
    return player.getPlaybackQuality();
  } catch {
    return "";
  }
}

export function DetailTrailerPlayer({ title, trailerUrl, sourceUrl }: DetailTrailerPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const frameShellRef = useRef<HTMLDivElement | null>(null);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YoutubePlayerInstance | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const qualityRef = useRef<TrailerQuality>("hd1080");
  const appliedQualityRef = useRef<TrailerQuality | null>(null);

  const [quality, setQuality] = useState<TrailerQuality>("hd1080");
  const [muted, setMuted] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  const parsedTrailer = useMemo(() => parseTrailer(trailerUrl), [trailerUrl]);
  const provider = parsedTrailer?.provider ?? "unknown";
  const fallbackUrl = parsedTrailer?.watchUrl || sourceUrl || trailerUrl;
  const supportsQualitySelection = provider === "youtube";
  const videoId = parsedTrailer?.id ?? "";

  const dailymotionEmbedUrl = useMemo(() => {
    if (provider !== "dailymotion" || !videoId) {
      return trailerUrl;
    }
    return buildDailymotionEmbedUrl(videoId);
  }, [provider, trailerUrl, videoId]);

  qualityRef.current = quality;

  const reloadYoutubeAtCurrentTime = useCallback(
    (player: YoutubePlayerInstance, targetQuality: TrailerQuality) => {
      if (!videoId) {
        return;
      }

      const startSeconds = Math.max(0, Math.floor(player.getCurrentTime?.() ?? 0));
      player.loadVideoById({
        videoId,
        startSeconds,
      });

      window.setTimeout(() => {
        applyYoutubeQuality(player, targetQuality);
      }, 250);
      window.setTimeout(() => {
        applyYoutubeQuality(player, targetQuality);
      }, 900);
    },
    [videoId],
  );

  const ensureHighQuality = useCallback(
    (player: YoutubePlayerInstance, preferred: TrailerQuality) => {
      if (preferred === "auto") {
        applyYoutubeQuality(player, "hd1080");
        return;
      }

      applyYoutubeQuality(player, preferred);

      const current = readYoutubeQuality(player);
      if (preferred === "hd1080" && current && LOW_QUALITY_LEVELS.has(current)) {
        reloadYoutubeAtCurrentTime(player, preferred);
      }
    },
    [reloadYoutubeAtCurrentTime],
  );

  useEffect(() => {
    if (provider !== "youtube" || !videoId || !playerHostRef.current) {
      return;
    }

    let cancelled = false;
    setPlayerReady(false);
    setHasError(false);
    appliedQualityRef.current = null;

    loadYoutubeIframeApi()
      .then((YT) => {
        if (cancelled || !playerHostRef.current) {
          return;
        }

        playerRef.current?.destroy();
        playerHostRef.current.innerHTML = "";

        const origin = window.location.origin;
        const player = new YT.Player(playerHostRef.current, {
          videoId,
          width: YOUTUBE_PLAYER_WIDTH,
          height: YOUTUBE_PLAYER_HEIGHT,
          playerVars: {
            autoplay: 1,
            controls: 1,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            iv_load_policy: 3,
            fs: 1,
            origin,
            enablejsapi: 1,
          },
          events: {
            onReady: (event) => {
              if (cancelled) {
                return;
              }
              setPlayerReady(true);
              event.target.mute();
              ensureHighQuality(event.target, qualityRef.current);
              event.target.playVideo();
            },
            onStateChange: (event) => {
              if (cancelled || event.data !== YT.PlayerState.PLAYING) {
                return;
              }
              ensureHighQuality(event.target, qualityRef.current);
            },
            onError: () => {
              if (!cancelled) {
                setHasError(true);
              }
            },
          },
        });

        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) {
          setHasError(true);
        }
      });

    return () => {
      cancelled = true;
      setPlayerReady(false);
      playerRef.current?.destroy();
      playerRef.current = null;
      if (playerHostRef.current) {
        playerHostRef.current.innerHTML = "";
      }
    };
  }, [ensureHighQuality, provider, videoId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!playerReady || !player || provider !== "youtube") {
      return;
    }

    if (appliedQualityRef.current === null) {
      appliedQualityRef.current = quality;
      return;
    }

    if (appliedQualityRef.current === quality) {
      return;
    }

    appliedQualityRef.current = quality;
    reloadYoutubeAtCurrentTime(player, quality);
  }, [playerReady, provider, quality, reloadYoutubeAtCurrentTime]);

  useEffect(() => {
    const player = playerRef.current;
    if (!playerReady || !player) {
      return;
    }

    if (muted) {
      player.mute();
      return;
    }

    player.unMute();
    ensureHighQuality(player, qualityRef.current);
  }, [ensureHighQuality, muted, playerReady]);

  useEffect(() => {
    const shell = frameShellRef.current;
    const host = playerHostRef.current;
    if (!shell || !host) {
      return;
    }

    function syncTrailerScale() {
      const width = shell.clientWidth;
      const height = shell.clientHeight;
      if (!width || !height) {
        return;
      }

      const scale = Math.min(width / YOUTUBE_PLAYER_WIDTH, height / YOUTUBE_PLAYER_HEIGHT, 1);
      host.style.setProperty("--trailer-scale", scale.toFixed(4));
    }

    syncTrailerScale();
    const observer = new ResizeObserver(syncTrailerScale);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [provider, videoId]);

  useEffect(() => {
    if (typeof window === "undefined" || !sectionRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const player = playerRef.current;
        const iframe = iframeRef.current;
        const entry = entries[0];

        if (entry?.isIntersecting) {
          player?.playVideo();
          return;
        }

        player?.pauseVideo();
        iframe?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
          "https://www.dailymotion.com",
        );
      },
      {
        threshold: 0.45,
        rootMargin: "0px 0px -15% 0px",
      },
    );

    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [provider]);

  if (hasError || !parsedTrailer || (provider === "unknown" && !trailerUrl)) {
    return null;
  }

  return (
    <section ref={sectionRef} className="detail-trailer-section glass">
      <div className="detail-trailer-head">
        <p className="eyebrow">Now Playing Trailer</p>
        <h2 className="headline detail-trailer-title">{title}</h2>
      </div>

      <div ref={frameShellRef} className="detail-trailer-frame-shell">
        {provider === "youtube" ? (
          <div ref={playerHostRef} className="detail-trailer-player-host" aria-label={`${title} trailer`} />
        ) : (
          <iframe
            ref={iframeRef}
            className="detail-trailer-frame"
            src={dailymotionEmbedUrl}
            title={`${title} trailer`}
            width={YOUTUBE_PLAYER_WIDTH}
            height={YOUTUBE_PLAYER_HEIGHT}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onError={() => setHasError(true)}
          />
        )}
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
            Watch on YouTube
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
