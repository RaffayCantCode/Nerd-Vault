import { BookReader } from "@/components/book-reader";
import { fetchBookReaderPayload } from "@/lib/books";

export default async function BookReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookId = Number(id);
  const initialPayload = Number.isFinite(bookId) ? await fetchBookReaderPayload(bookId).catch(() => null) : null;

  return <BookReader bookId={bookId} initialPayload={initialPayload} />;
}
