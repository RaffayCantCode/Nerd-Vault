"use client";

import type { CSSProperties } from "react";

const coverThemes = [
  ["#f1d4a4", "#3f291d", "#171518"],
  ["#9fd0ff", "#163b59", "#11161d"],
  ["#b6e2c8", "#1d4636", "#0f1714"],
  ["#f2b7c6", "#5d2234", "#171116"],
  ["#e9d79f", "#54411f", "#171511"],
  ["#d5ccff", "#33255c", "#12111b"],
];

function hashTitle(input: string) {
  return input.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

function splitTitle(title: string) {
  const words = title.split(/\s+/);
  if (words.length <= 2) {
    return [title];
  }

  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

export function BookCover({
  title,
  author,
  size = "large",
}: {
  title: string;
  author?: string;
  size?: "large" | "small";
}) {
  const [accent, secondary, base] = coverThemes[hashTitle(title) % coverThemes.length];
  const titleLines = splitTitle(title);

  return (
    <div
      className={`book-cover book-cover-${size}`}
      style={
        {
          "--book-cover-accent": accent,
          "--book-cover-secondary": secondary,
          "--book-cover-base": base,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <div className="book-cover-frame">
        <div className="book-cover-orbit" />
        <div className="book-cover-copy">
          <span className="book-cover-mark">NV Editions</span>
          <strong className="book-cover-title">
            {titleLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </strong>
          <span className="book-cover-author">{author || "Project Gutenberg"}</span>
        </div>
      </div>
    </div>
  );
}
