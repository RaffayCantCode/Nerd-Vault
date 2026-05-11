"use client";

import { memo } from "react";
import { MediaType } from "@/lib/types";

type FilterChipBarProps = {
  active: MediaType | "all";
  onChange: (next: MediaType | "all") => void;
};

const topTabs: Array<MediaType> = ["movie", "anime", "show", "game"];

export const FilterChipBar = memo(function FilterChipBar({ active, onChange }: FilterChipBarProps) {
  return (
    <div className="chip-row browse-top-tabs">
      {topTabs.map((filter) => (
        <button
          key={filter}
          type="button"
          className={`chip browse-top-tab ${active === filter ? "is-active" : ""}`}
          onClick={() => onChange(filter)}
        >
          {filter === "show" ? "Series" : `${filter.charAt(0).toUpperCase()}${filter.slice(1)}s`}
        </button>
      ))}
      <button
        type="button"
        className={`chip browse-top-tab ${active === "all" ? "is-active" : ""}`}
        onClick={() => onChange("all")}
      >
        All
      </button>
    </div>
  );
});
