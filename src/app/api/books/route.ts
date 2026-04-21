import { NextRequest, NextResponse } from "next/server";
import { fetchBooksPage } from "@/lib/books";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get("page") || "1");
  const query = request.nextUrl.searchParams.get("query") || "";
  const genre = request.nextUrl.searchParams.get("genre") || "All";

  try {
    const payload = await fetchBooksPage({
      page: Number.isFinite(page) ? page : 1,
      query,
      genre,
    });

    return NextResponse.json({
      ok: true,
      ...payload,
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
