import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "myanimelist.net",
  "cdn.myanimelist.net",
  "images.igdb.com",
  "image.tmdb.org",
  "media.rawg.io",
  "s4.anilist.co",
  "anilist.co",
  "anili.st",
  "media.kitsu.app",
  "media.kitsu.io",
]);

function isAllowedRemote(url: URL) {
  if (url.protocol !== "https:") {
    return false;
  }

  return [...ALLOWED_HOSTS].some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  );
}

function normalizeRemoteUrl(url: URL) {
  const normalized = new URL(url.toString());
  if (normalized.hostname === "myanimelist.net") {
    normalized.hostname = "cdn.myanimelist.net";
  }
  return normalized;
}

export async function GET(request: NextRequest) {
  const remote = request.nextUrl.searchParams.get("url");

  if (!remote) {
    return NextResponse.json({ ok: false, message: "Missing image url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(remote);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid image url" }, { status: 400 });
  }

  const normalized = normalizeRemoteUrl(parsed);

  if (!isAllowedRemote(normalized)) {
    return NextResponse.json({ ok: false, message: "Image host not allowed" }, { status: 403 });
  }

  return NextResponse.redirect(normalized.toString(), {
    status: 308,
    headers: {
      "Cache-Control": "public, max-age=604800, s-maxage=604800, immutable",
    },
  });
}
