import { BooksWorkspace } from "@/components/books-workspace";
import { getSessionUserId, getContinueReading } from "@/lib/book-progress-server";
import { fetchBooksPage } from "@/lib/books";

export default async function BooksPage() {
  const userId = await getSessionUserId();

  // Pre-fetch the first page of books on the server to avoid client-side loading flash.
  // If gutendex.com is unavailable, the client will handle the fallback with proper error states.
  const [initialPayload, continueReadingList] = await Promise.all([
    fetchBooksPage({ page: 1, query: "", genre: "All" }).catch(() => null),
    userId ? getContinueReading(userId).catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <BooksWorkspace
      initialGenre="All"
      initialQuery=""
      isSignedIn={Boolean(userId)}
      initialPayload={initialPayload ?? undefined}
      initialContinue={continueReadingList}
    />
  );
}
