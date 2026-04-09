import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "myanimelist.net",
  "cdn.myanimelist.net",
  "images.igdb.com",
  "image.tmdb.org",
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

  try {
    const upstream = await fetch(normalized.toString(), {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 NerdVault/1.0",
      },
      next: { revalidate: 21600 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { ok: false, message: `Upstream image failed: ${upstream.status}` },
        { status: upstream.status },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const arrayBuffer = await upstream.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=21600, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Image proxy failed" }, { status: 502 });
  }
}
