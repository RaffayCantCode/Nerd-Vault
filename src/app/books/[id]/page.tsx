import { BookDetail } from "@/components/book-detail";
import { getBookProgress, getSessionUserId } from "@/lib/book-progress-server";
import { fetchBookSummary } from "@/lib/books";

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookId = Number(id);
  const userId = await getSessionUserId();
  const book = Number.isFinite(bookId) ? await fetchBookSummary(bookId).catch(() => null) : null;
  const progress = userId && Number.isFinite(bookId) ? await getBookProgress(userId, bookId).catch(() => null) : null;

  if (!book) {
    throw new Error("Book not found");
  }

  return <BookDetail book={book} initialProgress={progress} isSignedIn={Boolean(userId)} />;
}
