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
          <defs>
            <filter id="nv-glow-n" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur-n" />
              <feColorMatrix in="blur-n" type="matrix" values="0 0 0 0 0.41 0 0 0 0 0.75 0 0 0 0 0.67 0 0 0 1 0" result="glow-n" />
              <feMerge>
                <feMergeNode in="glow-n" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="nv-glow-v" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur-v" />
              <feColorMatrix in="blur-v" type="matrix" values="0 0 0 0 0.17 0 0 0 0 0.72 0 0 0 0 0.76 0 0 0 1 0" result="glow-v" />
              <feMerge>
                <feMergeNode in="glow-v" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width="1024" height="1024" rx="224" fill="#050914" />
          <g transform="translate(-148 38) scale(1.35)">
            <path
              className="nv-loader-path-n"
              d="M215 148H442L547 309V384L443 225H300V555H215V148Z"
              fill="#69BEAA"
              filter="url(#nv-glow-n)"
            />
            <path
              className="nv-loader-path-v"
              d="M431 284L537 447H677V148H764V554H536L431 392V284Z"
              fill="#2CB8C1"
              filter="url(#nv-glow-v)"
            />
          </g>
        </svg>
      </div>
      <p className="copy nv-loader-label">{label}</p>
    </div>
  );
});
