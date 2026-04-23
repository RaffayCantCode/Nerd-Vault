import { NextRequest, NextResponse } from "next/server";
import { browseIgdbGames } from "@/lib/sources/igdb";
import { browseJikanAnime } from "@/lib/sources/jikan";
import { browseMixedCatalog } from "@/lib/mixed-catalog";
import { browseTmdbCatalog } from "@/lib/sources/tmdb";
import { MediaItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BrowsePayload = {
  page: number;
  totalPages: number;
  totalResults: number;
  items: MediaItem[];
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const typeParam = searchParams.get("type");
  const pageParam = Number(searchParams.get("page") || "1");
  const query = searchParams.get("query") || "";
  const genre = searchParams.get("genre") || "";
  const sortParam = searchParams.get("sort") || "discovery";
  const seedParam = Number(searchParams.get("seed") || "1");
  const pageSizeParam = Number(searchParams.get("pageSize") || "24");
  const sort =
    sortParam === "discovery" ||
    sortParam === "newest" ||
    sortParam === "rating" ||
    sortParam === "title"
      ? sortParam
      : "discovery";
  const seed = Number.isFinite(seedParam) ? seedParam : 1;
  // The client dynamically sizes browse pages based on viewport width (up to ~96).
  // Keep the API aligned so paging doesn't look "half-empty" after filters/sorts.
  const pageSize = Number.isFinite(pageSizeParam) ? Math.min(96, Math.max(10, pageSizeParam)) : 24;

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
    const dedupeBySource = (items: MediaItem[]) => {
      const seen = new Set<string>();
      return items.filter((item) => {
        const key = `${item.source}-${item.sourceId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const fetchByType = async (targetPage: number): Promise<BrowsePayload> => {
      if (type === "anime") {
        return browseJikanAnime({
          page: targetPage,
          query,
          genre,
          sort,
          seed,
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
      });
    };

    let payload = await fetchByType(page);

    // Top up sparse pages (especially after media-type + genre filters) so each page
    // remains visually full instead of shrinking to tiny result counts.
    if (type !== "all" && !query.trim() && payload.items.length < pageSize) {
      const merged = [...payload.items];
      let nextPage = page + 1;
      let attempts = 0;
      const maxAttempts = 4;

      while (merged.length < pageSize && nextPage <= payload.totalPages && attempts < maxAttempts) {
        const nextPayload = await fetchByType(nextPage);
        merged.push(...nextPayload.items);
        nextPage += 1;
        attempts += 1;
      }

      payload = {
        ...payload,
        items: dedupeBySource(merged).slice(0, pageSize),
      };
    }

    return NextResponse.json(
      {
        ok: true,
        ...payload,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
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
