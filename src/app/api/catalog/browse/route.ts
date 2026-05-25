import { NextRequest, NextResponse } from "next/server";
import { hasActiveBrowseGenre, itemMatchesGenre } from "@/lib/catalog-utils";
import { browseIgdbGames } from "@/lib/sources/igdb";
import { browseAniListAnime } from "@/lib/sources/anilist";
import { browseMixedCatalog } from "@/lib/mixed-catalog";
import { browseTmdbCatalog } from "@/lib/sources/tmdb";
import { MediaItem } from "@/lib/types";

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
    const page = Number.isFinite(pageParam) ? pageParam : 1;

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
        return browseIgdbGames({
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

    const payload = await fetchByType(page);
    let stableItems = dedupeBySource(payload.items);

    // Mixed "all" feed already assigns disjoint global interleaved ranges per page.
    // Only run cross-page dedupe for single-source TMDB views where providers can repeat.
    if (!query.trim() && page > 1 && stableItems.length && type !== "all") {
      const previousPayload = await fetchByType(page - 1).catch(() => null);
      if (previousPayload) {
        const blockedKeys = new Set(dedupeBySource(previousPayload.items).map((item) => mediaKey(item)));
        const pageKeys = new Set<string>();
        const uniqueItems: MediaItem[] = [];

        for (const item of stableItems) {
          const key = mediaKey(item);
          if (blockedKeys.has(key) || pageKeys.has(key)) {
            continue;
          }
          pageKeys.add(key);
          uniqueItems.push(item);
        }

        let topUpPage = page + 1;
        while (uniqueItems.length < pageSize && topUpPage <= payload.totalPages && topUpPage <= page + 3) {
          const topUpPayload = await fetchByType(topUpPage).catch(() => null);
          if (!topUpPayload?.items?.length) {
            topUpPage += 1;
            continue;
          }

          for (const item of dedupeBySource(topUpPayload.items)) {
            const key = mediaKey(item);
            if (blockedKeys.has(key) || pageKeys.has(key)) {
              continue;
            }
            pageKeys.add(key);
            uniqueItems.push(item);
            if (uniqueItems.length >= pageSize) {
              break;
            }
          }

          topUpPage += 1;
        }

        stableItems = uniqueItems;
      }
    }

    if (!query.trim() && hasActiveBrowseGenre(genre) && stableItems.length < pageSize) {
      const seenKeys = new Set(stableItems.map((item) => mediaKey(item)));
      let topUpPage = page + 1;
      const maxTopUpPage = Math.min(Math.max(payload.totalPages, page + 1) + 12, page + 16);

      while (stableItems.length < pageSize && topUpPage <= maxTopUpPage) {
        const topUpPayload = await fetchByType(topUpPage).catch(() => null);
        if (!topUpPayload?.items?.length) {
          topUpPage += 1;
          continue;
        }

        for (const item of dedupeBySource(topUpPayload.items)) {
          if (!itemMatchesGenre(item, genre)) {
            continue;
          }

          const key = mediaKey(item);
          if (seenKeys.has(key)) {
            continue;
          }

          seenKeys.add(key);
          stableItems.push(item);
          if (stableItems.length >= pageSize) {
            break;
          }
        }

        topUpPage += 1;
      }
    }

    const normalizedTotalPages = query.trim() ? 1 : Math.max(1, Math.floor(payload.totalPages || 1));

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
            : "public, max-age=0, s-maxage=180, stale-while-revalidate=600",
          Vary: "Accept-Encoding",
          "CDN-Cache-Control": "max-age=180, stale-while-revalidate=600",
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
