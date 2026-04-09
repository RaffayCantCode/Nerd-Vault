import { NextResponse } from "next/server";
import { getTmdbStarterCatalog } from "@/lib/sources/tmdb";

export async function GET() {
  try {
    const tmdb = await getTmdbStarterCatalog();

    return NextResponse.json({
      ok: true,
      source: "tmdb",
      imported: tmdb.length,
      items: tmdb,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown bootstrap failure",
      },
      { status: 500 },
    );
  }
}
