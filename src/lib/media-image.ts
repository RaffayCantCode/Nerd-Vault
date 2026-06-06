export type MediaImageIntent = "thumb" | "cover" | "backdrop" | "gallery" | "lightbox";

/** Display-sized requests — avoids downloading poster originals on grid cards. */
const TMDB_SIZES: Record<MediaImageIntent, string> = {
  thumb: "w154",
  cover: "w342",
  backdrop: "w780",
  gallery: "w1280",
  lightbox: "original",
};

const IGDB_SIZES: Record<MediaImageIntent, string> = {
  thumb: "t_cover_small",
  cover: "t_cover_big",
  backdrop: "t_720p",
  gallery: "t_1080p",
  lightbox: "t_1080p",
};

const ANILIST_COVER_SIZES: Record<MediaImageIntent, string> = {
  thumb: "medium",
  cover: "large",
  backdrop: "extraLarge",
  gallery: "extraLarge",
  lightbox: "extraLarge",
};

function optimizeTmdbImage(url: URL, intent: MediaImageIntent) {
  url.pathname = url.pathname.replace(/\/t\/p\/[^/]+\//, `/t/p/${TMDB_SIZES[intent]}/`);
  return url.toString();
}

function optimizeIgdbImage(url: URL, intent: MediaImageIntent) {
  url.pathname = url.pathname.replace(/\/igdb\/image\/upload\/[^/]+\//, `/igdb/image/upload/${IGDB_SIZES[intent]}/`);
  return url.toString();
}

function optimizeAnilistImage(url: URL, intent: MediaImageIntent) {
  const bucket = ANILIST_COVER_SIZES[intent];
  if (/\/cover\/(extraLarge|large|medium)\//i.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/cover\/(extraLarge|large|medium)\//i, `/cover/${bucket}/`);
  }
  return url.toString();
}

function optimizeUnsplashImage(url: URL, intent: MediaImageIntent) {
  const width =
    intent === "thumb"
      ? "320"
      : intent === "cover"
        ? "480"
        : intent === "gallery"
          ? "960"
          : "1280";
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "crop");
  url.searchParams.set("w", width);
  url.searchParams.set("q", intent === "thumb" ? "68" : "76");
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

    if (url.hostname.includes("anilist.co") || url.hostname.includes("anili.st")) {
      return optimizeAnilistImage(url, intent);
    }

    if (url.hostname.includes("unsplash.com")) {
      return optimizeUnsplashImage(url, intent);
    }

    if (url.hostname.includes("media.rawg.io")) {
      return url.toString();
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

export function buildMediaImageSrcSet(rawUrl?: string | null, intent: MediaImageIntent = "cover") {
  const thumb = optimizeMediaImageUrl(rawUrl, "thumb");
  const sized = optimizeMediaImageUrl(rawUrl, intent);

  if (!thumb || !sized || thumb === sized) {
    return undefined;
  }

  const thumbWidth = 180;
  const sizedWidth =
    intent === "thumb"
      ? 180
      : intent === "cover"
        ? 360
        : intent === "backdrop"
          ? 780
          : intent === "gallery"
            ? 1280
            : 1920;

  return `${thumb} ${thumbWidth}w, ${sized} ${sizedWidth}w`;
}

export function chooseConnectionAwareIntent(
  preferred: MediaImageIntent,
  options?: {
    saveData?: boolean;
    effectiveType?: string;
  },
) {
  const effectiveType = options?.effectiveType?.toLowerCase() ?? "";
  const slowConnection = options?.saveData || effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g";

  if (!slowConnection) {
    return preferred;
  }

  if (preferred === "lightbox") {
    return "gallery";
  }

  if (preferred === "gallery" || preferred === "backdrop") {
    return "cover";
  }

  if (preferred === "cover") {
    return "thumb";
  }

  return preferred;
}
