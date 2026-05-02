import { NextRequest, NextResponse } from "next/server";
import { deleteBookProgressForUser, getBookProgress, getContinueReading, getSessionUserId, saveBookProgressForUser } from "@/lib/book-progress-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: true, progress: null, continueReading: null });
  }

  const bookId = Number(request.nextUrl.searchParams.get("bookId") || "");

  try {
    const [progress, continueReadingList] = await Promise.all([
      Number.isFinite(bookId) ? getBookProgress(userId, bookId) : Promise.resolve(null),
      getContinueReading(userId),
    ]);

    return NextResponse.json({
      ok: true,
      progress,
      continueReadingList,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Could not load book progress",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      bookId: number;
      title: string;
      author?: string;
      coverUrl?: string;
      currentPage: number;
      totalPages: number;
      percent: number;
    };

    await saveBookProgressForUser(userId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Could not save book progress",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const bookId = Number(request.nextUrl.searchParams.get("bookId") || "");
  if (!Number.isFinite(bookId)) {
    return NextResponse.json({ ok: false, message: "Book id is required" }, { status: 400 });
  }

  try {
    await deleteBookProgressForUser(userId, bookId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Could not clear book progress",
      },
      { status: 400 },
    );
  }
}
