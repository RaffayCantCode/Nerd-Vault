import { BooksWorkspace } from "@/components/books-workspace";
import { getContinueReading, getSessionUserId } from "@/lib/book-progress-server";
import { fetchBooksPage } from "@/lib/books";

export default async function BooksPage() {
  const userId = await getSessionUserId();
  const initialPayload = await fetchBooksPage({ page: 1, query: "", genre: "All" }).catch(() => ({
    page: 1,
    totalPages: 1,
    totalResults: 0,
    items: [],
  }));
  const initialContinue = userId ? await getContinueReading(userId).catch(() => null) : null;

  return <BooksWorkspace initialPayload={initialPayload} initialGenre="All" initialQuery="" initialContinue={initialContinue} />;
}
