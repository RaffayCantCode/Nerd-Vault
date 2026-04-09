"use client";

import { MediaType } from "@/lib/types";

type FilterChipBarProps = {
  active: MediaType | "all";
  onChange: (next: MediaType | "all") => void;
};

const filters: Array<MediaType | "all"> = ["all", "movie", "show", "anime", "game"];

export function FilterChipBar({ active, onChange }: FilterChipBarProps) {
  return (
    <div className="chip-row">
      {filters.map((filter) => (
        <button
          key={filter}
          type="button"
          className={`chip ${active === filter ? "is-active" : ""}`}
          onClick={() => onChange(filter)}
        >
          {filter === "all" ? "All" : `${filter.charAt(0).toUpperCase()}${filter.slice(1)}s`}
        </button>
      ))}
    </div>
  );
}
