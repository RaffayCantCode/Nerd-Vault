import { NextRequest, NextResponse } from "next/server";
import { browseIgdbGames } from "@/lib/sources/igdb";
import { browseJikanAnime } from "@/lib/sources/jikan";
import { browseMixedCatalog } from "@/lib/mixed-catalog";
import { browseTmdbCatalog } from "@/lib/sources/tmdb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const pageSize = Number.isFinite(pageSizeParam) ? Math.min(36, Math.max(10, pageSizeParam)) : 24;

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
    const payload =
      type === "anime"
        ? await browseJikanAnime({
            page,
            query,
            genre,
            sort,
            seed,
          })
        : type === "game"
          ? await browseIgdbGames({
              page,
              query,
              genre,
              sort,
              seed,
            })
        : type === "all"
          ? await browseMixedCatalog({
              page,
              query,
              genre,
              sort,
              seed,
              pageSize,
            })
          : await browseTmdbCatalog({
              type,
              page,
              query,
              genre,
              sort,
              seed,
            });

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
