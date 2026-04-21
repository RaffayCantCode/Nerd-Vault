import { BookReader } from "@/components/book-reader";

export default async function BookReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookId = Number(id);

  return <BookReader bookId={bookId} />;
}
