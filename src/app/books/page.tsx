import { BooksWorkspace } from "@/components/books-workspace";
import { getSessionUserId } from "@/lib/book-progress-server";

export default async function BooksPage() {
  const userId = await getSessionUserId();

  return <BooksWorkspace initialGenre="All" initialQuery="" isSignedIn={Boolean(userId)} />;
}
