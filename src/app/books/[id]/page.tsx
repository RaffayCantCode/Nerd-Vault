import { BookDetail } from "@/components/book-detail";
import { fetchBookSummary } from "@/lib/books";

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookId = Number(id);
  const book = Number.isFinite(bookId) ? await fetchBookSummary(bookId).catch(() => null) : null;

  if (!book) {
    throw new Error("Book not found");
  }

  return <BookDetail book={book} />;
}
