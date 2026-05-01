import { NextRequest, NextResponse } from "next/server";
import { fetchBooksByIds, fetchBooksPage } from "@/lib/books";

export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get("page") || "1");
  const query = request.nextUrl.searchParams.get("query") || "";
  const genre = request.nextUrl.searchParams.get("genre") || "All";
  const ids = (request.nextUrl.searchParams.get("ids") || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

  try {
    if (ids.length) {
      const items = await fetchBooksByIds(ids);
      return NextResponse.json({
        ok: true,
        page: 1,
        totalPages: 1,
        totalResults: items.length,
        items,
      }, {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
        },
      });
    }

    const payload = await fetchBooksPage({
      page: Number.isFinite(page) ? page : 1,
      query,
      genre,
    });

    return NextResponse.json({
      ok: true,
      ...payload,
    }, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Could not load books",
      },
      { status: 500 },
    );
  }
}
