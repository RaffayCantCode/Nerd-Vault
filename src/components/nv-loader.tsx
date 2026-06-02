"use client";

import { memo } from "react";

type NVLoaderProps = {
  label?: string;
  compact?: boolean;
};

export const NVLoader = memo(function NVLoader({
  label = "Loading your vault...",
  compact = false,
}: NVLoaderProps) {
  return (
    <div className={`nv-loader ${compact ? "is-compact" : ""}`} role="status" aria-live="polite">
      <div className="nv-loader-mark" aria-hidden="true">
        {/* Inline NV mark — paths animate independently */}
        <svg
          className="nv-loader-glyph-svg"
          viewBox="0 0 1024 1024"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
        >
          <rect width="1024" height="1024" rx="224" fill="#050914" />
          <g transform="translate(-148 38) scale(1.35)">
            <path
              className="nv-loader-path-n"
              d="M215 148H442L547 309V384L443 225H300V555H215V148Z"
              fill="#69BEAA"
            />
            <path
              className="nv-loader-path-v"
              d="M431 284L537 447H677V148H764V554H536L431 392V284Z"
              fill="#2CB8C1"
            />
          </g>
        </svg>
      </div>
      <p className="copy nv-loader-label">{label}</p>
    </div>
  );
});
