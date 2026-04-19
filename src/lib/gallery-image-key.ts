/**
 * Stable key for the same underlying still across CDNs, size tokens, and /api/image wrappers.
 * Used so the detail gallery does not show the same frame at w342 / w780 / w1280 as separate tiles.
 */

function unwrapProxiedImageUrl(raw: string, depth = 0): string {
  if (depth > 4) {
    return raw;
  }

  try {
    const parsed = new URL(raw, "https://dummy.local");
    if (parsed.pathname.includes("api/image")) {
      const inner = parsed.searchParams.get("url");
      if (inner) {
        return unwrapProxiedImageUrl(decodeURIComponent(inner), depth + 1);
      }
    }
  } catch {
    return raw;
  }

  return raw;
}

function stripExtension(name: string) {
  return name.replace(/\.(jpg|jpeg|png|webp|avif)$/i, "").toLowerCase();
}

/**
 * Public helper: one key per distinct asset file (not per resolution URL).
 */
export function canonicalGalleryImageKey(rawUrl: string): string {
  if (!rawUrl || rawUrl.startsWith("data:image")) {
    return "";
  }

  const unwrapped = unwrapProxiedImageUrl(rawUrl.trim());

  try {
    const u = new URL(unwrapped, "https://dummy.local");
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const path = u.pathname.replace(/\/+/g, "/");

    if (host.includes("tmdb.org")) {
      const m = path.match(/\/t\/p\/[^/]+\/([^/?#]+)$/i);
      if (m?.[1]) {
        return `tmdb:${stripExtension(m[1])}`;
      }
    }

    if (host.includes("igdb.com")) {
      const m = path.match(/\/igdb\/image\/upload\/(?:[^/]+\/)?([^/?#]+)$/i);
      if (m?.[1]) {
        const base = stripExtension(m[1]).replace(/[-_](original|large|medium|small|thumb|t\d+x\d+|v\d+)$/i, "");
        return `igdb:${base}`;
      }
    }

    if (host.includes("myanimelist.net")) {
      const segments = path.split("/").filter(Boolean);
      const last = segments[segments.length - 1] ?? "";
      const base = stripExtension(last).replace(/[a-z]$/i, "");
      const parent = segments.slice(0, -1).join("/");
      return `mal:${host}:${parent}:${base}`;
    }

    if (host.includes("unsplash.com")) {
      const idMatch = path.match(/\/photos\/([^/?#]+)/);
      if (idMatch?.[1]) {
        return `unsplash:${idMatch[1].toLowerCase()}`;
      }
    }

    const normalizedPath = path
      .replace(/\/(large|small|medium|original|thumb)\//gi, "/")
      .replace(/\/\d+x\d+\//gi, "/");
    return `url:${host}:${normalizedPath.split("?")[0]}`.toLowerCase();
  } catch {
    return rawUrl.toLowerCase().slice(0, 200);
  }
}

export function dedupeGalleryImageUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const url of urls) {
    const key = canonicalGalleryImageKey(url);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(url);
  }

  return out;
}
