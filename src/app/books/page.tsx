import { BooksWorkspace } from "@/components/books-workspace";
import { fetchBooksPage } from "@/lib/books";

export default async function BooksPage() {
  const initialPayload = await fetchBooksPage({ page: 1, query: "", genre: "All" }).catch(() => ({
    page: 1,
    totalPages: 1,
    totalResults: 0,
    items: [],
  }));

  return <BooksWorkspace initialPayload={initialPayload} initialGenre="All" initialQuery="" />;
}
