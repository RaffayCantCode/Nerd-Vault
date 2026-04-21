import { BookReader } from "@/components/book-reader";
import { getBookProgress, getSessionUserId } from "@/lib/book-progress-server";
import { fetchBookReaderPayload } from "@/lib/books";

export default async function BookReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookId = Number(id);
  const userId = await getSessionUserId();
  const initialPayload = Number.isFinite(bookId) ? await fetchBookReaderPayload(bookId).catch(() => null) : null;
  const initialProgress = userId && Number.isFinite(bookId) ? await getBookProgress(userId, bookId).catch(() => null) : null;

  return <BookReader bookId={bookId} initialPayload={initialPayload} initialProgress={initialProgress} />;
}
