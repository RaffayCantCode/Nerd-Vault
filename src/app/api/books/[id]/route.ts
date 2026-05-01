import { NextResponse } from "next/server";
import { fetchBookReaderPayload } from "@/lib/books";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bookId = Number(id);

  if (!Number.isFinite(bookId)) {
    return NextResponse.json({ ok: false, message: "Invalid book id" }, { status: 400 });
  }

  try {
    const payload = await fetchBookReaderPayload(bookId);
    return NextResponse.json({
      ok: true,
      ...payload,
    }, {
      headers: {
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Could not open this book",
      },
      { status: 500 },
    );
  }
}
