import { NextRequest, NextResponse } from "next/server";
import { browseAniListAnime, getAniListCuratedSections } from "@/lib/sources/anilist";
import { browseMixedCatalog } from "@/lib/mixed-catalog";
import { browseTmdbCatalog, getTmdbCuratedSections } from "@/lib/sources/tmdb";
import { browseIgdbGames, getIgdbCuratedSections } from "@/lib/sources/igdb";
import { MediaItem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 26;

type BrowsePayload = {
  page: number;
  totalPages: number;
  totalResults: number;
  items: MediaItem[];
};

function mediaKey(item: MediaItem) {
  return `${item.source}-${item.sourceId}`;
}

function dedupeBySource(items: MediaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = mediaKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const typeParam = searchParams.get("type");
  const pageParam = Number(searchParams.get("page") || "1");
  const query = searchParams.get("query") || "";
  const genre = searchParams.get("genre") || "";
  const sortParam = searchParams.get("sort") || "discovery";
  const seedParam = Number(searchParams.get("seed") || "1");
  const pageSizeParam = Number(searchParams.get("pageSize") || "48");
  const sort =
    sortParam === "discovery" ||
    sortParam === "newest" ||
    sortParam === "rating" ||
    sortParam === "title"
      ? sortParam
      : "discovery";
  const seed = Number.isFinite(seedParam) ? seedParam : 1;
  const pageSize = Number.isFinite(pageSizeParam) ? Math.min(72, Math.max(16, pageSizeParam)) : 48;

  const type =
    typeParam === "movie" ||
    typeParam === "show" ||
    typeParam === "anime" ||
    typeParam === "game" ||
    typeParam === "all"
      ? typeParam
      : "all";

  try {
    const curatedParam = searchParams.get("curated");
    const isCurated = curatedParam === "true";

    if (isCurated && type !== "all") {
      let sections: any[] = [];
      if (type === "movie" || type === "show") {
        sections = await getTmdbCuratedSections(type, seed);
      } else if (type === "anime") {
        sections = await getAniListCuratedSections(seed);
      } else if (type === "game") {
        sections = await getIgdbCuratedSections(seed);
      }
      return NextResponse.json(
        { ok: true, sections },
        {
          headers: {
            "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
          },
        }
      );
    }

    const requestedPage = Number.isFinite(pageParam) ? Math.max(1, Math.floor(pageParam)) : 1;

    const fetchByType = async (targetPage: number): Promise<BrowsePayload> => {
      if (type === "anime") {
        return browseAniListAnime({
          page: targetPage,
          query,
          genre,
          sort,
          seed,
          pageSize,
        });
      }

      if (type === "game") {
        const { browseIgdbGames } = await import("@/lib/sources/igdb");
        return await browseIgdbGames({
          page: targetPage,
          query,
          genre,
          sort,
          seed,
          pageSize,
        });
      }

      if (type === "all") {
        return browseMixedCatalog({
          page: targetPage,
          query,
          genre,
          sort,
          seed,
          pageSize,
        });
      }

      return browseTmdbCatalog({
        type,
        page: targetPage,
        query,
        genre,
        sort,
        seed,
        pageSize,
      });
    };

    let page = requestedPage;
    let payload = await fetchByType(page);
    let stableItems = dedupeBySource(payload.items);

    // Reliability-first fallback: if the provider returns an empty non-search page,
    // probe nearby pages so browse never hard-breaks after a few page advances.
    if (!query.trim() && !stableItems.length && requestedPage > 1) {
      const probePages = [
        requestedPage + 1,
        requestedPage - 1,
        requestedPage + 2,
        requestedPage - 2,
        requestedPage + 3,
        requestedPage - 3,
      ].filter((value) => value > 0);

      for (const probePage of probePages) {
        const probePayload = await fetchByType(probePage).catch(() => null);
        if (!probePayload?.items?.length) {
          continue;
        }

        stableItems = dedupeBySource(probePayload.items);
        payload = probePayload;
        page = requestedPage;
        break;
      }
    }

    const normalizedTotalPages = query.trim()
      ? 1
      : Math.max(120, Math.floor(payload.totalPages || 1));

    return NextResponse.json(
      {
        ok: true,
        page,
        totalPages: normalizedTotalPages,
        totalResults: payload.totalResults,
        items: stableItems.slice(0, pageSize),
      },
      {
        headers: {
          "Cache-Control": query.trim()
            ? "private, no-store, max-age=0, must-revalidate"
            : "public, s-maxage=120, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Browse route failed",
      },
      { status: 500 },
    );
  }
}
