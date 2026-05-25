type YoutubePlayerInstance = {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  destroy: () => void;
  getCurrentTime: () => number;
  getPlaybackQuality: () => string;
  setPlaybackQuality: (quality: string) => void;
  loadVideoById: (args: string | { videoId: string; startSeconds?: number }) => void;
};

type YoutubePlayerConstructor = new (
  element: HTMLElement | string,
  options: {
    videoId?: string;
    width?: string | number;
    height?: string | number;
    playerVars?: Record<string, string | number>;
    events?: Record<string, (event: { target: YoutubePlayerInstance; data?: number }) => void>;
  },
) => YoutubePlayerInstance;

type YoutubeNamespace = {
  Player: YoutubePlayerConstructor;
  PlayerState: {
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
  };
};

declare global {
  interface Window {
    YT?: YoutubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YoutubeNamespace> | null = null;

export function loadYoutubeIframeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API is browser-only"));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const previousReady = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        if (window.YT?.Player) {
          resolve(window.YT);
          return;
        }
        reject(new Error("YouTube iframe API failed to initialize"));
      };

      const existing = document.querySelector('script[data-nv-youtube-api="true"]');
      if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.dataset.nvYoutubeApi = "true";
      script.onerror = () => reject(new Error("YouTube iframe API script failed to load"));
      document.head.appendChild(script);
      }
    });
  }

  return youtubeApiPromise;
}

export type { YoutubePlayerInstance, YoutubeNamespace };
