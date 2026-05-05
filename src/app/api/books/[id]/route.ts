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
    const message = error instanceof Error ? error.message : "Could not open this book";
    const isTimeout = message.includes("abort") || message.includes("timeout") || message.includes(" Abort");
    return NextResponse.json(
      {
        ok: false,
        message: isTimeout
          ? "This book is taking too long to load. Project Gutenberg may be slow right now—please try again in a moment."
          : message,
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
