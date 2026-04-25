export type MediaImageIntent = "thumb" | "cover" | "backdrop" | "gallery" | "lightbox";

// Optimized sizes for faster loading
const TMDB_SIZES: Record<MediaImageIntent, string> = {
  thumb: "w300",      // Reduced from w342 for faster thumbs
  cover: "w400",      // Reduced from w500 for faster covers
  backdrop: "w1280",  // Use w1280 instead of original for backdrops
  gallery: "w780",    // Reduced from w1280 for gallery
  lightbox: "original",
};

// IGDB uses progressive loading
const IGDB_SIZES: Record<MediaImageIntent, string> = {
  thumb: "t_cover_small",  // Smaller thumbs
  cover: "t_cover_big",    // Good balance for covers
  backdrop: "t_720p",      // 720p for faster backdrops
  gallery: "t_720p",
  lightbox: "t_1080p",
};

function optimizeTmdbImage(url: URL, intent: MediaImageIntent) {
  url.pathname = url.pathname.replace(/\/t\/p\/[^/]+\//, `/t/p/${TMDB_SIZES[intent]}/`);
  return url.toString();
}

function optimizeIgdbImage(url: URL, intent: MediaImageIntent) {
  url.pathname = url.pathname.replace(/\/igdb\/image\/upload\/[^/]+\//, `/igdb/image/upload/${IGDB_SIZES[intent]}/`);
  return url.toString();
}

function optimizeUnsplashImage(url: URL, intent: MediaImageIntent) {
  const width =
    intent === "thumb"
      ? "420"
      : intent === "cover"
        ? "760"
        : intent === "gallery"
          ? "960"
          : "1400";
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "crop");
  url.searchParams.set("w", width);
  url.searchParams.set("q", "76");
  return url.toString();
}

function optimizeDirectImageUrl(rawUrl: string, intent: MediaImageIntent) {
  try {
    const url = new URL(rawUrl);

    if (url.hostname === "image.tmdb.org") {
      return optimizeTmdbImage(url, intent);
    }

    if (url.hostname === "images.igdb.com") {
      return optimizeIgdbImage(url, intent);
    }

    if (url.hostname.includes("unsplash.com")) {
      return optimizeUnsplashImage(url, intent);
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function optimizeMediaImageUrl(rawUrl?: string | null, intent: MediaImageIntent = "cover") {
  if (!rawUrl) {
    return rawUrl ?? undefined;
  }

  if (rawUrl.startsWith("/api/image?url=")) {
    try {
      const wrapped = new URL(rawUrl, "https://dummy.local");
      const nested = wrapped.searchParams.get("url");
      if (!nested) return rawUrl;
      wrapped.searchParams.set("url", optimizeDirectImageUrl(decodeURIComponent(nested), intent));
      return `${wrapped.pathname}?${wrapped.searchParams.toString()}`;
    } catch {
      return rawUrl;
    }
  }

  return optimizeDirectImageUrl(rawUrl, intent);
}
