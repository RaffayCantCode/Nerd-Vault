import type { Metadata } from "next";
import "./books.css";

export const metadata: Metadata = {
  title: "Stories",
  description: "A dedicated reading room for free Project Gutenberg books inside NerdVault.",
};

export default function BooksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
