import { NextResponse } from "next/server";
import { fetchBookReaderPayload } from "@/lib/books";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
