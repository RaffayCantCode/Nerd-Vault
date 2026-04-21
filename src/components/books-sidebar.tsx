"use client";

import Link from "next/link";
import { BookTheme } from "@/lib/book-types";
import { writeBookTheme } from "@/lib/book-client";

function Glyph({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const iconPaths = {
  library: "M4.5 6.5h15M7 4.5v15m5-13v13m5-11v11M5.5 19.5H18",
  landing: "M4.5 10.5 12 4l7.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19z",
  book: "M6 5.5A2.5 2.5 0 0 1 8.5 3H19v16H8.5A2.5 2.5 0 0 0 6 21.5zm0 0v-16",
  theme: "M12 3.5a8.5 8.5 0 1 0 8.5 8.5A6.5 6.5 0 1 1 12 3.5Z",
};

export function BooksSidebar({
  theme,
  active,
  currentBookTitle,
}: {
  theme: BookTheme;
  active: "library" | "detail" | "reader";
  currentBookTitle?: string;
}) {
  return (
    <aside className="books-sidebar books-sidebar-rich">
      <Link href="/books" className="books-brand" aria-label="Open books library">
        <span className="books-brand-mark">NV</span>
      </Link>

      <div className="books-sidebar-stack">
        <Link href="/books" className={`books-sidebar-link books-sidebar-link-rich ${active === "library" ? "is-active" : ""}`}>
          <Glyph path={iconPaths.library} />
          <span>Library</span>
        </Link>
        {active !== "library" ? (
          <div className="books-sidebar-link books-sidebar-link-rich is-active">
            <Glyph path={iconPaths.book} />
            <span>{active === "reader" ? "Reader" : "Book view"}</span>
          </div>
        ) : null}
        <Link href="/" className="books-sidebar-link books-sidebar-link-rich">
          <Glyph path={iconPaths.landing} />
          <span>Landing</span>
        </Link>
        <button type="button" className="books-theme-toggle books-sidebar-link-rich" onClick={() => writeBookTheme(theme === "dark" ? "light" : "dark")}>
          <Glyph path={iconPaths.theme} />
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
      </div>

      <div className="books-sidebar-bottom">
        <div className="books-sidebar-status">
          <strong>{active === "reader" ? "Reader live" : "Stories space"}</strong>
          <span>{currentBookTitle || "Project Gutenberg books only"}</span>
        </div>
      </div>
    </aside>
  );
}
